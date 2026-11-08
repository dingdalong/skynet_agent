mod connection;
pub mod protocol;
pub mod state;

use protocol::{pb, Server};
use serde::Serialize;
use state::{Action, Cache, RuntimeState, Session};
use std::{
    collections::HashMap,
    time::{Duration, Instant},
};
use tauri::{ipc::Channel, State, WebviewWindow};
use tokio::sync::{mpsc, oneshot};

type Reply = oneshot::Sender<Result<bool, String>>;
type Sink = Box<dyn Fn(Event) -> bool + Send>;
#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Event {
    State { state: RuntimeState },
    Delta { update: Delta },
    Reasoning { update: ReasoningDelta },
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Delta {
    #[serde(rename = "type")]
    kind: &'static str,
    session_id: String,
    run_id: String,
    message_id: String,
    revision: u32,
    delta: String,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReasoningDelta {
    #[serde(rename = "type")]
    kind: &'static str,
    session_id: String,
    message_id: String,
    tool_call_id: String,
    block: state::ReasoningBlock,
    revision: u32,
}
struct Subscriber {
    id: String,
    sink: Sink,
}
struct Pending {
    expected: &'static str,
    purpose: Purpose,
    deadline: Instant,
    reply: Option<Reply>,
}
enum Purpose {
    Login,
    Snapshot,
    Model {
        view: String,
        session: String,
    },
    Create {
        view: String,
    },
    Send {
        view: String,
        session: String,
        draft: Option<String>,
    },
    Cancel {
        view: String,
        session: String,
    },
}
impl Purpose {
    fn target(&self) -> Option<(&str, Option<&str>)> {
        match self {
            Self::Create { view } => Some((view, None)),
            Self::Send { view, session, .. }
            | Self::Cancel { view, session }
            | Self::Model { view, session } => Some((view, Some(session))),
            _ => None,
        }
    }
}
enum Input {
    Attach {
        label: String,
        hint: String,
        sink: Sink,
        reply: oneshot::Sender<String>,
    },
    Detach {
        label: String,
        id: Option<String>,
        forget: bool,
    },
    Action {
        label: String,
        id: String,
        action: Action,
        reply: Reply,
    },
    Opened {
        generation: u64,
        writer: mpsc::UnboundedSender<Vec<u8>>,
    },
    Frame {
        generation: u64,
        frame: Vec<u8>,
    },
    Closed {
        generation: u64,
        error: String,
    },
    Shutdown,
}

#[derive(Clone)]
pub struct ChatCore {
    tx: mpsc::UnboundedSender<Input>,
}
impl ChatCore {
    pub fn start(url: String) -> Result<Self, String> {
        connection::validate_url(&url)?;
        let (tx, rx) = mpsc::unbounded_channel();
        let actor = Actor::new(url, tx.clone());
        tauri::async_runtime::spawn(actor.run(rx));
        eprintln!("[chat] init Rust 客户端核心就绪");
        Ok(Self { tx })
    }
    pub async fn attach(
        &self,
        label: String,
        hint: String,
        sink: impl Fn(Event) -> bool + Send + 'static,
    ) -> Result<String, String> {
        let (reply, received) = oneshot::channel();
        self.tx
            .send(Input::Attach {
                label,
                hint,
                sink: Box::new(sink),
                reply,
            })
            .map_err(|_| "客户端核心已关闭")?;
        received.await.map_err(|_| "客户端核心已关闭".into())
    }
    pub fn detach(&self, label: String, id: Option<String>, forget: bool) {
        let _ = self.tx.send(Input::Detach { label, id, forget });
    }
    pub async fn action(&self, label: String, id: String, action: Action) -> Result<bool, String> {
        let (reply, received) = oneshot::channel();
        self.tx
            .send(Input::Action {
                label,
                id,
                action,
                reply,
            })
            .map_err(|_| "客户端核心已关闭")?;
        received.await.map_err(|_| "客户端核心已关闭".to_string())?
    }
    pub fn shutdown(&self) {
        let _ = self.tx.send(Input::Shutdown);
    }
}

#[tauri::command]
pub async fn chat_attach(
    window: WebviewWindow,
    core: State<'_, ChatCore>,
    preferred_username: String,
    channel: Channel<Event>,
) -> Result<String, String> {
    core.attach(window.label().into(), preferred_username, move |event| {
        channel.send(event).is_ok()
    })
    .await
}
#[tauri::command]
pub fn chat_detach(window: WebviewWindow, core: State<'_, ChatCore>, subscription: String) {
    core.detach(window.label().into(), Some(subscription), false);
}
#[tauri::command]
pub async fn chat_action(
    window: WebviewWindow,
    core: State<'_, ChatCore>,
    subscription: String,
    action: Action,
) -> Result<bool, String> {
    core.action(window.label().into(), subscription, action)
        .await
}

struct Actor {
    url: String,
    tx: mpsc::UnboundedSender<Input>,
    cache: Cache,
    subscribers: HashMap<String, Subscriber>,
    next_subscriber: u64,
    generation: u64,
    next_id: Option<u32>,
    connection_task: Option<tokio::task::JoinHandle<()>>,
    writer: Option<mpsc::UnboundedSender<Vec<u8>>>,
    pending: HashMap<u32, Pending>,
    waiters: Vec<Reply>,
    opening_deadline: Option<Instant>,
    connection_state: &'static str,
    error: String,
    enabled: bool,
    restored: bool,
    reconnect_at: Option<Instant>,
    attempt: usize,
    syncing: bool,
    buffered: Vec<Server>,
}
impl Actor {
    fn new(url: String, tx: mpsc::UnboundedSender<Input>) -> Self {
        Self {
            url,
            tx,
            cache: Cache::default(),
            subscribers: HashMap::new(),
            next_subscriber: 0,
            generation: 0,
            next_id: Some(1),
            connection_task: None,
            writer: None,
            pending: HashMap::new(),
            waiters: Vec::new(),
            opening_deadline: None,
            connection_state: "idle",
            error: String::new(),
            enabled: false,
            restored: false,
            reconnect_at: None,
            attempt: 0,
            syncing: false,
            buffered: Vec::new(),
        }
    }
    async fn run(mut self, mut rx: mpsc::UnboundedReceiver<Input>) {
        let mut timer = tokio::time::interval(Duration::from_millis(100));
        loop {
            tokio::select! {
                input = rx.recv() => {
                    let Some(input) = input else { break; };
                    match input {
                        Input::Shutdown => { self.stop("客户端核心已关闭"); break; },
                        Input::Attach {label,hint,sink,reply} => {
                            self.next_subscriber += 1;
                            let id = self.next_subscriber.to_string();
                            self.cache.view(&label);
                            self.subscribers.insert(label, Subscriber {id:id.clone(),sink});
                            if !self.restored {
                                if let Ok(name) = state::normalize_username(&hint) {
                                    self.connect(name, None);
                                }
                            }
                            self.emit_state();
                            let _ = reply.send(id);
                        },
                        Input::Detach {label,id,forget} => {
                            if id.as_ref().is_none_or(|id| self.subscribers.get(&label).is_some_and(|subscriber| subscriber.id == *id)) { self.subscribers.remove(&label); }
                            if forget { self.cache.views.remove(&label); }
                        },
                        Input::Action {label,id,action,reply} => {
                            if !self.subscribers.get(&label).is_some_and(|subscriber| subscriber.id == id) {
                                let _ = reply.send(Err("页面订阅已被替换".into()));
                                continue;
                            }
                            self.action(label,action,reply);
                        },
                        Input::Opened {generation,writer} => {
                            if generation != self.generation { continue; }
                            self.writer = Some(writer);
                            self.next_id = Some(1);
                            self.request("LoginReq", &pb::LoginReq {username:self.cache.username.clone()}, "LoginRes", Purpose::Login, None);
                        },
                        Input::Frame {generation,frame} => {
                            if generation != self.generation { continue; }
                            if let Err(error) = self.receive(&frame) { self.fail(error); }
                        },
                        Input::Closed {generation,error} => { if generation == self.generation { self.fail(error); } },
                    }
                },
                _ = timer.tick() => {
                    self.tick(Instant::now());
                }
            }
        }
    }
    fn tick(&mut self, now: Instant) {
        if self
            .opening_deadline
            .is_some_and(|deadline| deadline <= now)
        {
            self.fail("Agent 连接超时".into());
        }
        if let Some(request) = self
            .pending
            .values()
            .find(|request| request.deadline <= now)
        {
            self.fail(format!("Agent 请求超时: {}", request.expected));
        }
        if self.reconnect_at.is_some_and(|deadline| deadline <= now) {
            self.start_connection();
        }
    }
    fn emit_state(&mut self) {
        let cache = &self.cache;
        let connection_state = self.connection_state;
        let error = &self.error;
        self.subscribers.retain(|label, subscriber| {
            (subscriber.sink)(Event::State {
                state: cache.state(label, connection_state, error),
            })
        });
    }
    fn emit_delta(&mut self, delta: &pb::MessageDeltaNtf) {
        let event = Event::Delta {
            update: Delta {
                kind: "delta",
                session_id: delta.session_id.clone(),
                run_id: delta.run_id.clone(),
                message_id: delta.message_id.clone(),
                revision: delta.revision,
                delta: delta.delta.clone(),
            },
        };
        self.subscribers
            .retain(|_, subscriber| (subscriber.sink)(event.clone()));
    }
    fn stop(&mut self, error: &str) {
        self.generation += 1;
        if let Some(task) = self.connection_task.take() {
            task.abort();
        }
        self.writer = None;
        self.opening_deadline = None;
        self.reconnect_at = None;
        self.syncing = false;
        self.buffered.clear();
        for (_, pending) in self.pending.drain() {
            if let Some(reply) = pending.reply {
                let _ = reply.send(Err(error.into()));
            }
        }
        for reply in self.waiters.drain(..) {
            let _ = reply.send(Err(error.into()));
        }
        self.cache.pending_sends.clear();
        for view in self.cache.views.values_mut() {
            view.creating = 0;
        }
    }
    fn connect(&mut self, name: String, reply: Option<Reply>) {
        self.restored = true;
        if self.cache.username == name
            && matches!(self.connection_state, "connected" | "connecting")
        {
            if let Some(reply) = reply {
                if self.connection_state == "connected" {
                    let _ = reply.send(Ok(true));
                } else {
                    self.waiters.push(reply);
                }
            }
            return;
        }
        self.stop("Agent 连接已替换");
        if self.cache.username != name {
            let labels = self.cache.views.keys().cloned().collect::<Vec<_>>();
            self.cache = Cache {
                username: name,
                ..Default::default()
            };
            for label in labels {
                self.cache.view(&label);
            }
        }
        self.enabled = true;
        self.attempt = 0;
        if let Some(reply) = reply {
            self.waiters.push(reply);
        }
        self.start_connection();
    }
    fn start_connection(&mut self) {
        self.generation += 1;
        self.reconnect_at = None;
        self.connection_state = "connecting";
        self.opening_deadline = Some(Instant::now() + Duration::from_secs(10));
        self.error.clear();
        self.emit_state();
        self.connection_task = Some(connection::open(
            self.url.clone(),
            self.generation,
            self.tx.clone(),
        ));
    }
    fn fail(&mut self, error: String) {
        eprintln!(
            "[chat] connection generation={} error={error}",
            self.generation
        );
        self.stop(&error);
        self.connection_state = "error";
        self.error = error;
        if self.enabled {
            let seconds = [1, 2, 5, 10][self.attempt.min(3)];
            self.attempt += 1;
            self.reconnect_at = Some(Instant::now() + Duration::from_secs(seconds));
        }
        self.emit_state();
    }
    fn request(
        &mut self,
        name: &str,
        payload: &impl prost::Message,
        expected: &'static str,
        purpose: Purpose,
        reply: Option<Reply>,
    ) {
        let Some(id) = self.next_id else {
            if let Some(reply) = reply {
                let _ = reply.send(Err("Agent 消息 ID 已耗尽".into()));
            }
            self.fail("Agent 消息 ID 已耗尽".into());
            return;
        };
        self.next_id = id.checked_add(1);
        let frame = protocol::encode(id, name, payload);
        self.pending.insert(
            id,
            Pending {
                expected,
                purpose,
                deadline: Instant::now() + Duration::from_secs(10),
                reply,
            },
        );
        if !self
            .writer
            .as_ref()
            .is_some_and(|writer| writer.send(frame).is_ok())
        {
            self.fail("Agent 尚未连接".into());
        }
    }
    fn action(&mut self, label: String, action: Action, reply: Reply) {
        match action {
            Action::Connect { username } => match state::normalize_username(&username) {
                Ok(name) => self.connect(name, Some(reply)),
                Err(error) => {
                    self.error = error.clone();
                    self.emit_state();
                    let _ = reply.send(Err(error));
                }
            },
            Action::SwitchUser | Action::Disconnect => {
                let reset = matches!(action, Action::SwitchUser);
                self.enabled = false;
                self.stop("Agent 连接已关闭");
                self.connection_state = "offline";
                self.error.clear();
                if reset {
                    let labels = self.cache.views.keys().cloned().collect::<Vec<_>>();
                    self.cache = Cache::default();
                    for label in labels {
                        self.cache.view(&label);
                    }
                }
                self.emit_state();
                let _ = reply.send(Ok(true));
            }
            Action::SelectSession { session_id } => {
                let exists = self.cache.sessions.contains_key(&session_id);
                if exists {
                    self.cache.view(&label).selected = Some(session_id);
                }
                self.emit_state();
                let _ = reply.send(Ok(exists));
            }
            Action::SetDraft { session_id, value } => {
                if self.cache.sessions.contains_key(&session_id) {
                    self.cache.view(&label).drafts.insert(session_id, value);
                }
                self.emit_state();
                let _ = reply.send(Ok(true));
            }
            Action::DismissError => {
                let view = self.cache.view(&label);
                if let Some(id) = view.selected.clone() {
                    view.errors.insert(id, String::new());
                }
                self.emit_state();
                let _ = reply.send(Ok(true));
            }
            action => {
                if self.connection_state != "connected" {
                    self.emit_state();
                    let _ = reply.send(Ok(false));
                    return;
                }
                match action {
                    Action::CreateSession => {
                        if let Some(id) = self
                            .cache
                            .sessions
                            .values()
                            .filter(|session| session.messages.is_empty())
                            .max_by(|a, b| {
                                a.updated_at
                                    .cmp(&b.updated_at)
                                    .then_with(|| a.id.cmp(&b.id))
                            })
                            .map(|session| session.id.clone())
                        {
                            self.cache.view(&label).selected = Some(id);
                            self.emit_state();
                            let _ = reply.send(Ok(true));
                            return;
                        }
                        if self.cache.view(&label).creating > 0 {
                            self.emit_state();
                            let _ = reply.send(Ok(false));
                            return;
                        }
                        self.cache.view(&label).creating += 1;
                        self.emit_state();
                        self.request(
                            "SessionCreateReq",
                            &pb::SessionCreateReq {},
                            "SessionCreateRes",
                            Purpose::Create { view: label },
                            Some(reply),
                        );
                    }
                    Action::SetModel { model_id } => {
                        let selected = self.cache.view(&label).selected.clone().unwrap_or_default();
                        if selected.is_empty() {
                            let _ = reply.send(Ok(false));
                            return;
                        }
                        self.request(
                            "SessionModelSetReq",
                            &pb::SessionModelSetReq {
                                session_id: selected.clone(),
                                model_id,
                            },
                            "SessionModelSetRes",
                            Purpose::Model {
                                view: label,
                                session: selected,
                            },
                            Some(reply),
                        );
                    }
                    Action::SendMessage { text } => {
                        self.send(label, text.trim().into(), false, reply)
                    }
                    Action::RetryLastMessage => self.send(label, String::new(), true, reply),
                    Action::CancelRun => {
                        let selected = self.cache.view(&label).selected.clone().unwrap_or_default();
                        let Some(session) = self.cache.sessions.get(&selected) else {
                            let _ = reply.send(Ok(false));
                            return;
                        };
                        if session.run_id.is_empty() || session.cancelling {
                            let _ = reply.send(Ok(false));
                            return;
                        }
                        self.request(
                            "MessageCancelReq",
                            &pb::MessageCancelReq {
                                session_id: selected.clone(),
                                run_id: session.run_id.clone(),
                            },
                            "MessageCancelRes",
                            Purpose::Cancel {
                                view: label,
                                session: selected,
                            },
                            Some(reply),
                        );
                    }
                    _ => unreachable!(),
                }
            }
        }
    }
    fn send(&mut self, label: String, text: String, retry: bool, reply: Reply) {
        let view = self.cache.view(&label);
        let selected = view.selected.clone().unwrap_or_default();
        let creating = view.creating;
        let draft = view.drafts.get(&selected).cloned().unwrap_or_default();
        let Some(session) = self.cache.sessions.get(&selected) else {
            self.emit_state();
            let _ = reply.send(Ok(false));
            return;
        };
        if creating > 0
            || !session.run_id.is_empty()
            || self.cache.pending_sends.contains(&selected)
            || (!retry && text.is_empty())
        {
            self.emit_state();
            let _ = reply.send(Ok(false));
            return;
        }
        let retry_run_id = if retry {
            let Some(last) = session
                .messages
                .last()
                .filter(|message| message.status == "error" && message.retryable)
            else {
                let _ = reply.send(Ok(false));
                return;
            };
            last.run_id.clone()
        } else {
            String::new()
        };
        self.cache.pending_sends.insert(selected.clone());
        self.cache
            .view(&label)
            .errors
            .insert(selected.clone(), String::new());
        self.emit_state();
        self.request(
            "MessageSendReq",
            &pb::MessageSendReq {
                session_id: selected.clone(),
                text,
                retry_run_id,
            },
            "MessageSendRes",
            Purpose::Send {
                view: label,
                session: selected,
                draft: if retry { None } else { Some(draft) },
            },
            Some(reply),
        );
    }
    fn receive(&mut self, frame: &[u8]) -> Result<(), String> {
        let (id, message) = protocol::decode(frame)?;
        if id == 0 {
            return self.notification(message);
        }
        let Some(pending) = self.pending.remove(&id) else {
            return Ok(());
        };
        if message.name() != pending.expected {
            return Err("Agent 响应类型与请求不匹配".into());
        }
        let result = self.response(message, &pending.purpose);
        if let Err(error) = &result {
            eprintln!(
                "[chat] response name={} message_id={id} error={error}",
                pending.expected
            );
        }
        if let Some((view, session)) = pending.purpose.target() {
            if let Err(error) = &result {
                let selected = session
                    .map(str::to_string)
                    .or_else(|| self.cache.view(view).selected.clone());
                if let Some(id) = selected {
                    self.cache.view(view).errors.insert(id, error.clone());
                }
            }
        }
        match &pending.purpose {
            Purpose::Create { view } => {
                self.cache.view(view).creating = self.cache.view(view).creating.saturating_sub(1);
            }
            Purpose::Send { session, .. } => {
                self.cache.pending_sends.remove(session);
            }
            _ => {}
        }
        self.emit_state();
        if let Some(reply) = pending.reply {
            let _ = reply.send(Ok(result.is_ok()));
        }
        if matches!(pending.purpose, Purpose::Login | Purpose::Snapshot) {
            result?;
        }
        Ok(())
    }
    fn response(&mut self, message: Server, purpose: &Purpose) -> Result<(), String> {
        match message {
            Server::Login(response) => {
                protocol::check(response.ret, response.error.as_ref())?;
                self.cache
                    .snapshot(response.snapshot.ok_or("Agent 未返回用户快照")?)?;
                self.connection_state = "connected";
                self.opening_deadline = None;
                self.attempt = 0;
                self.error.clear();
                self.drain()?;
                if !self.buffered.is_empty() {
                    self.syncing = true;
                    self.request(
                        "UserSnapshotReq",
                        &pb::UserSnapshotReq {},
                        "UserSnapshotRes",
                        Purpose::Snapshot,
                        None,
                    );
                }
                for reply in self.waiters.drain(..) {
                    let _ = reply.send(Ok(true));
                }
            }
            Server::Snapshot(response) => {
                protocol::check(response.ret, response.error.as_ref())?;
                self.cache
                    .snapshot(response.snapshot.ok_or("Agent 未返回用户快照")?)?;
                self.syncing = false;
                self.drain()?;
                if !self.buffered.is_empty() {
                    return Err("用户数据版本不连续，请重新连接".into());
                }
            }
            Server::Create(response) => {
                protocol::check(response.ret, response.error.as_ref())?;
                let session = Session::try_from(response.session.ok_or("Agent 未返回会话")?)?;
                if let Purpose::Create { view } = purpose {
                    self.cache.view(view).selected = Some(session.id.clone());
                }
                self.cache.merge(session);
            }
            Server::Model(response) => {
                protocol::check(response.ret, response.error.as_ref())?;
                self.cache.merge(Session::try_from(
                    response.session.ok_or("Agent 未返回会话")?,
                )?);
            }
            Server::Send(response) => {
                protocol::check(response.ret, response.error.as_ref())?;
                self.cache.merge(Session::try_from(
                    response.session.ok_or("Agent 未返回会话")?,
                )?);
                if let Purpose::Send {
                    view,
                    session,
                    draft: Some(draft),
                } = purpose
                {
                    let drafts = &mut self.cache.view(view).drafts;
                    if drafts.get(session).map(String::as_str).unwrap_or_default() == draft {
                        drafts.insert(session.clone(), String::new());
                    }
                }
            }
            Server::Cancel(response) => protocol::check(response.ret, response.error.as_ref())?,
            _ => return Err("Agent 响应方向无效".into()),
        }
        Ok(())
    }
    fn notification(&mut self, message: Server) -> Result<(), String> {
        if self.connection_state != "connected" || self.syncing {
            self.buffered.push(message);
            return Ok(());
        }
        if !self.apply_notification(&message)? {
            self.buffered.push(message);
            self.syncing = true;
            self.request(
                "UserSnapshotReq",
                &pb::UserSnapshotReq {},
                "UserSnapshotRes",
                Purpose::Snapshot,
                None,
            );
        }
        Ok(())
    }
    fn apply_notification(&mut self, message: &Server) -> Result<bool, String> {
        match message {
            Server::Session(message) => {
                self.cache.merge(Session::try_from(
                    message.session.clone().ok_or("会话推送缺少状态")?,
                )?);
                self.emit_state();
                Ok(true)
            }
            Server::Delta(delta) => {
                let previous = self
                    .cache
                    .sessions
                    .get(&delta.session_id)
                    .map(|session| session.revision)
                    .unwrap_or_default();
                let applied = self.cache.delta(delta)?;
                if applied && delta.revision > previous {
                    self.emit_delta(delta);
                }
                Ok(applied)
            }
            Server::Reasoning(update) => {
                let previous = self
                    .cache
                    .sessions
                    .get(&update.session_id)
                    .map(|s| s.revision)
                    .unwrap_or_default();
                let applied = self.cache.reasoning(update.clone())?;
                if applied && update.revision > previous {
                    let event = Event::Reasoning {
                        update: ReasoningDelta {
                            kind: "reasoning",
                            session_id: update.session_id.clone(),
                            message_id: update.message_id.clone(),
                            tool_call_id: update.tool_call_id.clone(),
                            block: state::ReasoningBlock::try_from(
                                update.block.clone().ok_or("缺少思考块")?,
                            )?,
                            revision: update.revision,
                        },
                    };
                    self.subscribers
                        .retain(|_, subscriber| (subscriber.sink)(event.clone()));
                }
                Ok(applied)
            }
            Server::Tool(tool) => {
                let applied = self.cache.tool(tool.clone())?;
                if applied {
                    self.emit_state();
                }
                Ok(applied)
            }
            _ => Err("未知用户更新".into()),
        }
    }
    fn drain(&mut self) -> Result<(), String> {
        let updates = std::mem::take(&mut self.buffered);
        // 基线必须先送到页面，随后才能投影增量。
        self.emit_state();
        for message in updates {
            if !self.apply_notification(&message)? {
                self.buffered.push(message);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn reasoning_notification_serializes_the_page_discriminant() {
        let (mut actor, _) = actor();
        actor
            .cache
            .merge(Session::try_from(response("s1", 2, true)).unwrap());
        let events = Arc::new(Mutex::new(Vec::new()));
        let output = events.clone();
        actor.subscribers.insert(
            "main".into(),
            Subscriber {
                id: "page".into(),
                sink: Box::new(move |event| {
                    output
                        .lock()
                        .unwrap()
                        .push(serde_json::to_value(event).unwrap());
                    true
                }),
            },
        );
        actor
            .notification(Server::Reasoning(pb::ReasoningDeltaNtf {
                session_id: "s1".into(),
                message_id: "m1".into(),
                tool_call_id: String::new(),
                block: Some(pb::ReasoningBlock {
                    id: "b1".into(),
                    run_id: "r1".into(),
                    model_id: "model".into(),
                    text: "思考增量".into(),
                    status: "streaming".into(),
                }),
                revision: 3,
            }))
            .unwrap();
        let events = events.lock().unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0]["type"], "reasoning");
        assert_eq!(events[0]["update"]["type"], "reasoning");
        assert_eq!(events[0]["update"]["block"]["text"], "思考增量");
        assert_eq!(events[0]["update"]["toolCallId"], "");
    }

    fn actor() -> (Actor, mpsc::UnboundedReceiver<Vec<u8>>) {
        let (tx, _) = mpsc::unbounded_channel();
        let mut actor = Actor::new("ws://127.0.0.1:18791/agent".into(), tx);
        actor.cache.username = "alice".into();
        actor.cache.view("main");
        actor
            .cache
            .snapshot(pb::UserSnapshot {
                models: vec![],
                user_id: "u1".into(),
                username: "alice".into(),
                sessions: vec![pb::SessionState {
                    id: "s1".into(),
                    title: "会话".into(),
                    revision: 1,
                    ..Default::default()
                }],
            })
            .unwrap();
        actor.connection_state = "connected";
        let (writer, rx) = mpsc::unbounded_channel();
        actor.writer = Some(writer);
        (actor, rx)
    }
    fn response(session: &str, revision: u32, running: bool) -> pb::SessionState {
        pb::SessionState {
            id: session.into(),
            title: "会话".into(),
            revision,
            run_id: if running { "r1".into() } else { String::new() },
            messages: vec![pb::ChatMessage {
                id: "m1".into(),
                role: 2,
                status: if running { 1 } else { 2 },
                run_id: "r1".into(),
                content: "回答".into(),
                ..Default::default()
            }],
            ..Default::default()
        }
    }
    #[tokio::test]
    async fn replacing_a_page_keeps_pending_send_draft_and_request_sequence() {
        let (mut actor, mut wire) = actor();
        actor
            .cache
            .view("main")
            .drafts
            .insert("s1".into(), "原稿".into());
        let (reply, received) = oneshot::channel();
        actor.send("main".into(), "消息".into(), false, reply);
        assert!(actor.cache.pending_sends.contains("s1"));
        let first = wire.try_recv().unwrap();
        assert_eq!(u32::from_be_bytes(first[1..5].try_into().unwrap()), 1);
        let generation = actor.generation;
        // 页面订阅替换不触碰 actor 的连接或请求；新页面看到同一 pending 状态。
        actor.subscribers.remove("main");
        let events = Arc::new(Mutex::new(Vec::new()));
        let output = events.clone();
        actor.subscribers.insert(
            "main".into(),
            Subscriber {
                id: "new".into(),
                sink: Box::new(move |event| {
                    output.lock().unwrap().push(event);
                    true
                }),
            },
        );
        actor.emit_state();
        assert_eq!(actor.generation, generation);
        assert!(actor.writer.is_some());
        {
            let events = events.lock().unwrap();
            let Event::State { state } = &events[0] else {
                panic!()
            };
            assert_eq!(state.sessions[0].draft, "原稿");
            assert_eq!(state.pending_sends, ["s1"]);
        }
        actor
            .receive(&protocol::encode(
                1,
                "MessageSendRes",
                &pb::MessageSendRes {
                    ret: 1,
                    session: Some(response("s1", 2, false)),
                    ..Default::default()
                },
            ))
            .unwrap();
        assert!(received.await.unwrap().unwrap());
        assert_eq!(actor.cache.view("main").drafts["s1"], "");
        let (reply, _) = oneshot::channel();
        actor.send("main".into(), "下一条".into(), false, reply);
        let second = wire.try_recv().unwrap();
        assert_eq!(u32::from_be_bytes(second[1..5].try_into().unwrap()), 2);
    }
    #[tokio::test]
    async fn gap_snapshot_buffers_deltas_and_preserves_drafts() {
        let (mut actor, mut wire) = actor();
        actor
            .cache
            .view("main")
            .drafts
            .insert("s1".into(), "下一条草稿".into());
        let delta = pb::MessageDeltaNtf {
            session_id: "s1".into(),
            run_id: "r1".into(),
            message_id: "m1".into(),
            revision: 4,
            delta: "四".into(),
        };
        actor.notification(Server::Delta(delta.clone())).unwrap();
        assert!(actor.syncing);
        let request = wire.try_recv().unwrap();
        assert_eq!(
            u32::from_be_bytes(request[5..9].try_into().unwrap()),
            protocol::hash("UserSnapshotReq")
        );
        actor
            .notification(Server::Delta(pb::MessageDeltaNtf {
                revision: 5,
                delta: "五".into(),
                ..delta
            }))
            .unwrap();
        actor
            .receive(&protocol::encode(
                1,
                "UserSnapshotRes",
                &pb::UserSnapshotRes {
                    ret: 1,
                    snapshot: Some(pb::UserSnapshot {
                        models: vec![],
                        user_id: "u1".into(),
                        username: "alice".into(),
                        sessions: vec![response("s1", 4, true)],
                    }),
                    ..Default::default()
                },
            ))
            .unwrap();
        assert!(!actor.syncing);
        assert_eq!(actor.cache.sessions["s1"].messages[0].content, "回答五");
        assert_eq!(actor.cache.view("main").drafts["s1"], "下一条草稿");
    }
    #[tokio::test]
    async fn duplicate_connect_reuses_socket_and_failed_requests_do_not_replay() {
        let (mut actor, mut wire) = actor();
        let generation = actor.generation;
        let (reply, received) = oneshot::channel();
        actor.connect("alice".into(), Some(reply));
        assert!(received.await.unwrap().unwrap());
        assert_eq!(actor.generation, generation);
        assert!(wire.try_recv().is_err());
        let (reply, received) = oneshot::channel();
        actor.send("main".into(), "消息".into(), false, reply);
        wire.try_recv().unwrap();
        actor.enabled = true;
        actor.fail("断线".into());
        assert!(received.await.unwrap().is_err());
        assert!(actor.reconnect_at.is_some());
        assert!(actor.cache.pending_sends.is_empty());
        assert!(wire.try_recv().is_err());
        assert!(actor.writer.is_none());
    }
    #[tokio::test]
    async fn business_rejection_keeps_connection_and_draft() {
        let (mut actor, mut wire) = actor();
        actor
            .cache
            .view("main")
            .drafts
            .insert("s1".into(), "原稿".into());
        let (reply, received) = oneshot::channel();
        actor.send("main".into(), "消息".into(), false, reply);
        wire.try_recv().unwrap();
        actor
            .receive(&protocol::encode(
                1,
                "MessageSendRes",
                &pb::MessageSendRes {
                    ret: 12,
                    error: Some(pb::ErrorInfo {
                        message: "内容过长".into(),
                        retryable: false,
                    }),
                    ..Default::default()
                },
            ))
            .unwrap();
        assert!(!received.await.unwrap().unwrap());
        assert_eq!(actor.connection_state, "connected");
        assert!(actor.writer.is_some());
        assert_eq!(actor.cache.view("main").drafts["s1"], "原稿");
        assert!(actor.cache.view("main").errors["s1"].contains("错误码 12"));
    }
    #[tokio::test]
    async fn request_timeout_releases_pending_and_keeps_unsubmitted_draft() {
        let (mut actor, mut wire) = actor();
        actor
            .cache
            .view("main")
            .drafts
            .insert("s1".into(), "原稿".into());
        let (reply, received) = oneshot::channel();
        actor.send("main".into(), "消息".into(), false, reply);
        wire.try_recv().unwrap();
        actor.pending.get_mut(&1).unwrap().deadline = Instant::now();
        actor.tick(Instant::now());
        assert!(received.await.unwrap().is_err());
        assert_eq!(actor.connection_state, "error");
        assert!(actor.pending.is_empty());
        assert!(actor.cache.pending_sends.is_empty());
        assert_eq!(actor.cache.view("main").drafts["s1"], "原稿");
    }
    #[test]
    fn connection_deadline_covers_handshake_and_login() {
        let (mut actor, _) = actor();
        actor.connection_state = "connecting";
        actor.opening_deadline = Some(Instant::now());
        actor.tick(Instant::now());
        assert_eq!(actor.connection_state, "error");
        assert!(actor.error.contains("连接超时"));
        assert!(actor.writer.is_none());
    }
}
