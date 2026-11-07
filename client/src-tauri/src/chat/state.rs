use super::protocol::{self, pb};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: &'static str,
    pub content: String,
    pub created_at: u64,
    pub status: &'static str,
    pub run_id: String,
    pub error: String,
    pub retryable: bool,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub title: String,
    pub updated_at: u64,
    pub revision: u32,
    pub messages: Vec<ChatMessage>,
    pub run_id: String,
    pub cancelling: bool,
}
impl TryFrom<pb::SessionState> for Session {
    type Error = String;
    fn try_from(value: pb::SessionState) -> Result<Self, String> {
        if value.id.is_empty() || value.revision == 0 || value.updated_at > 9_007_199_254_740_991 {
            return Err("会话身份、版本或时间无效".into());
        }
        let mut messages = Vec::new();
        for message in value.messages {
            let role = match message.role {
                1 => "user",
                2 => "assistant",
                _ => return Err("消息角色无效".into()),
            };
            let status = match message.status {
                1 => "streaming",
                2 => "complete",
                3 => "cancelled",
                4 => "error",
                _ => return Err("消息状态无效".into()),
            };
            if message.id.is_empty() || message.created_at > 9_007_199_254_740_991 {
                return Err("消息身份或时间无效".into());
            }
            messages.push(ChatMessage {
                id: message.id,
                role,
                status,
                content: message.content,
                created_at: message.created_at,
                run_id: message.run_id,
                error: if message.error.is_some() {
                    protocol::response_error(message.ret, message.error.as_ref(), "生成失败")
                } else {
                    String::new()
                },
                retryable: message.error.is_some_and(|error| error.retryable),
            });
        }
        Ok(Self {
            id: value.id,
            title: value.title,
            updated_at: value.updated_at,
            revision: value.revision,
            messages,
            run_id: value.run_id,
            cancelling: value.cancelling,
        })
    }
}

#[derive(Default, Debug)]
pub struct View {
    pub selected: Option<String>,
    pub drafts: HashMap<String, String>,
    pub errors: HashMap<String, String>,
    pub creating: usize,
}
#[derive(Debug, Default)]
pub struct Cache {
    pub username: String,
    pub user_id: String,
    pub sessions: BTreeMap<String, Session>,
    pub views: HashMap<String, View>,
    pub pending_sends: HashSet<String>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionView {
    #[serde(flatten)]
    pub session: Session,
    pub draft: String,
    pub error: String,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeState {
    pub username: String,
    pub user_id: String,
    pub sessions: Vec<SessionView>,
    pub active_session_id: Option<String>,
    pub connection_state: String,
    pub connection_error: String,
    pub session_operations: usize,
    pub pending_sends: Vec<String>,
}

impl Cache {
    pub fn snapshot(&mut self, snapshot: pb::UserSnapshot) -> Result<(), String> {
        if snapshot.username != self.username
            || snapshot.user_id.is_empty()
            || snapshot.sessions.is_empty()
        {
            return Err("用户快照身份或会话无效".into());
        }
        // 先完整验证，避免坏快照部分覆盖当前基线。
        let sessions = snapshot
            .sessions
            .into_iter()
            .map(Session::try_from)
            .collect::<Result<Vec<_>, _>>()?;
        if self.user_id != snapshot.user_id {
            self.sessions.clear();
            self.pending_sends.clear();
            for view in self.views.values_mut() {
                *view = View::default();
            }
            self.user_id = snapshot.user_id;
        }
        for session in sessions {
            self.merge(session);
        }
        let selected = self
            .sessions
            .values()
            .max_by(|a, b| {
                a.updated_at
                    .cmp(&b.updated_at)
                    .then_with(|| a.id.cmp(&b.id))
            })
            .map(|session| session.id.clone());
        for view in self.views.values_mut() {
            if view
                .selected
                .as_ref()
                .is_none_or(|id| !self.sessions.contains_key(id))
            {
                view.selected = selected.clone();
            }
        }
        Ok(())
    }
    pub fn merge(&mut self, session: Session) {
        if self
            .sessions
            .get(&session.id)
            .is_some_and(|previous| previous.revision >= session.revision)
        {
            return;
        }
        let error = session
            .messages
            .last()
            .map(|message| message.error.clone())
            .unwrap_or_default();
        for view in self.views.values_mut() {
            view.errors.insert(session.id.clone(), error.clone());
        }
        self.sessions.insert(session.id.clone(), session);
    }
    pub fn delta(&mut self, delta: &pb::MessageDeltaNtf) -> Result<bool, String> {
        if delta.revision == 0
            || delta.message_id.is_empty()
            || delta.run_id.is_empty()
            || delta.session_id.is_empty()
        {
            return Err("增量标识或版本无效".into());
        }
        let Some(session) = self.sessions.get_mut(&delta.session_id) else {
            return Ok(false);
        };
        if delta.revision <= session.revision {
            return Ok(true);
        }
        if session.revision.checked_add(1) != Some(delta.revision) || session.run_id != delta.run_id
        {
            return Ok(false);
        }
        let Some(message) = session
            .messages
            .iter_mut()
            .find(|message| message.id == delta.message_id && message.run_id == delta.run_id)
        else {
            return Ok(false);
        };
        message.content.push_str(&delta.delta);
        session.revision = delta.revision;
        Ok(true)
    }
    pub fn view(&mut self, label: &str) -> &mut View {
        let selected = self
            .sessions
            .values()
            .max_by(|a, b| {
                a.updated_at
                    .cmp(&b.updated_at)
                    .then_with(|| a.id.cmp(&b.id))
            })
            .map(|session| session.id.clone());
        self.views.entry(label.into()).or_insert_with(|| View {
            selected,
            ..View::default()
        })
    }
    pub fn state(&self, label: &str, connection_state: &str, error: &str) -> RuntimeState {
        let view = self.views.get(label);
        RuntimeState {
            username: self.username.clone(),
            user_id: self.user_id.clone(),
            sessions: self
                .sessions
                .values()
                .map(|session| SessionView {
                    session: session.clone(),
                    draft: view
                        .and_then(|view| view.drafts.get(&session.id))
                        .cloned()
                        .unwrap_or_default(),
                    error: view
                        .and_then(|view| view.errors.get(&session.id))
                        .cloned()
                        .unwrap_or_else(|| {
                            session
                                .messages
                                .last()
                                .map(|message| message.error.clone())
                                .unwrap_or_default()
                        }),
                })
                .collect(),
            active_session_id: view.and_then(|view| view.selected.clone()),
            connection_state: connection_state.into(),
            connection_error: error.into(),
            session_operations: view.map(|view| view.creating).unwrap_or(0),
            pending_sends: self.pending_sends.iter().cloned().collect(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Action {
    Connect { username: String },
    Disconnect,
    SwitchUser,
    CreateSession,
    SelectSession { session_id: String },
    SetDraft { session_id: String, value: String },
    SendMessage { text: String },
    RetryLastMessage,
    CancelRun,
    DismissError,
}

pub fn normalize_username(name: &str) -> Result<String, String> {
    let name = name.trim_matches([' ', '\t', '\r', '\n', '\x0b', '\x0c']);
    if name.is_empty()
        || name.chars().count() > 32
        || name.chars().any(|ch| ch < ' ' || ch == '\x7f')
    {
        return Err("用户名须为 1–32 个字符，不能包含控制字符".into());
    }
    Ok(name.into())
}

#[cfg(test)]
mod tests {
    use super::*;
    pub fn snapshot(id: &str, revision: u32) -> pb::UserSnapshot {
        pb::UserSnapshot {
            user_id: id.into(),
            username: "alice".into(),
            sessions: vec![pb::SessionState {
                id: "s1".into(),
                title: "会话".into(),
                revision,
                run_id: "r1".into(),
                messages: vec![pb::ChatMessage {
                    id: "m1".into(),
                    role: 2,
                    status: 1,
                    run_id: "r1".into(),
                    ..Default::default()
                }],
                ..Default::default()
            }],
        }
    }
    #[test]
    fn snapshot_and_deltas_keep_view_state_and_ignore_old_revisions() {
        let mut cache = Cache {
            username: "alice".into(),
            ..Default::default()
        };
        cache.view("main");
        cache.snapshot(snapshot("u1", 1)).unwrap();
        cache.view("main").drafts.insert("s1".into(), "草稿".into());
        let delta = pb::MessageDeltaNtf {
            session_id: "s1".into(),
            message_id: "m1".into(),
            run_id: "r1".into(),
            revision: 2,
            delta: "二".into(),
        };
        assert!(cache.delta(&delta).unwrap());
        assert!(cache.delta(&delta).unwrap());
        cache.snapshot(snapshot("u1", 1)).unwrap();
        assert_eq!(cache.sessions["s1"].messages[0].content, "二");
        assert_eq!(cache.view("main").drafts["s1"], "草稿");
        assert!(!cache
            .delta(&pb::MessageDeltaNtf {
                revision: 4,
                ..delta
            })
            .unwrap());
        cache.snapshot(snapshot("u2", 1)).unwrap();
        assert!(cache.view("main").drafts.is_empty());
    }
    #[test]
    fn validates_names_like_the_web_client() {
        assert_eq!(normalize_username("\t用户 \n").unwrap(), "用户");
        assert!(normalize_username(&"😀".repeat(33)).is_err());
        assert!(normalize_username("a\nb").is_err());
    }
}
