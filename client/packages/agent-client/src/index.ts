import type { Command, Effect, Json, Transition } from "@skynet/contracts";
import { decodePacket, encodePacket, type Packet } from "./protocol";
import type {
    AgentState,
    ChatSession,
    ReasoningBlock,
    ToolCall,
    AgentSnapshot,
    LocalContext,
} from "./types";
export type * from "./types";
import { isSending } from "./selectors";

export function initialAgentState(): AgentState {
    return {
        version: 1,
        sequence: 0,
        configuration: {
            url: "",
            username: "",
            userId: "",
            enabled: false,
        },
        connection: {
            status: "offline",
            epoch: 0,
            id: "",
            key: "",
            attempt: 0,
            nextId: 1,
            opening: "",
            clock: "",
            clockMode: "watch",
            pending: {},
        },
        sessions: {},
        models: [],
        defaultModelId: "",
        selectedId: "",
        drafts: { "": "" },
        draftVersion: 0,
        draftModelId: "",
        buffered: [],
        syncing: false,
        error: "",
        notice: "",
        supportsLocal: false,
        local: null,
        localRequest: "",
        localEffects: {},
        draftTarget: null,
        desktops: [],
    };
}

/** A turn owns only temporary computation. The committed state contains data only. */
class Turn {
    readonly state: AgentState;
    readonly effects: Effect[] = [];
    constructor(previous: AgentState) {
        this.state = {
            ...initialAgentState(),
            ...JSON.parse(JSON.stringify(previous)),
        };
    }
    emit(kind: Effect["kind"], input: Effect["input"]): string {
        const id = `${this.state.connection.epoch}:${++this.state.sequence}:${kind}`;
        this.effects.push({ id, kind, input });
        return id;
    }
    clock(mode: "watch" | "reconnect", milliseconds = 1_000) {
        const connection = this.state.connection;
        if (connection.clock && connection.clockMode === mode) return;
        connection.clockMode = mode;
        connection.clock = this.emit("timer.wait", {
            key: "agent.clock",
            milliseconds,
        });
    }
    connect() {
        const { connection } = this.state;
        if (
            Object.values(connection.pending).some(
                (request) => request.name === "ChatReq",
            )
        )
            this.state.notice =
                "发送结果尚未确认，请先查看服务器恢复的会话，避免重复发送。";
        if (connection.key) this.emit("socket.close", { key: connection.key });
        connection.epoch++;
        connection.key = `agent.${connection.epoch}`;
        connection.id = "";
        connection.opening = "";
        connection.clock = "";
        connection.nextId = 1;
        connection.pending = {};
        connection.status = "connecting";
        this.state.buffered = [];
        this.state.syncing = false;
        this.state.error = "";
        this.state.localEffects = {};
        if (this.state.supportsLocal) {
            this.state.localRequest = this.emit("agent.context", {});
            return;
        }
        this.openSocket();
    }
    openSocket() {
        const { connection } = this.state;
        connection.opening = this.emit("socket.open", {
            key: connection.key,
            url: this.state.configuration.url,
        });
        this.clock("watch");
    }
    lost(message: string, retry = true) {
        const { connection } = this.state;
        if (
            Object.values(connection.pending).some(
                (request) => request.name === "ChatReq",
            )
        )
            this.state.notice =
                "发送结果尚未确认。重连后请先查看会话；为避免重复执行，客户端不会自动重发。";
        if (connection.key) this.emit("socket.close", { key: connection.key });
        connection.key = "";
        connection.id = "";
        connection.opening = "";
        connection.pending = {};
        connection.clock = "";
        this.state.localRequest = "";
        this.state.syncing = false;
        this.state.buffered = [];
        this.state.localEffects = {};
        this.state.error = message;
        if (retry && this.state.configuration.enabled) {
            connection.status = "retrying";
            connection.attempt++;
            this.clock(
                "reconnect",
                Math.min(
                    1_000 * 2 ** Math.min(connection.attempt - 1, 4),
                    15_000,
                ),
            );
        } else
            connection.status = this.state.configuration.enabled
                ? "error"
                : "offline";
    }
    request(name: string, body: object, target = "", text = "") {
        const { connection } = this.state;
        if (!connection.id) throw Error("请先连接服务器");
        if (Object.keys(connection.pending).length >= 16)
            throw Error("在途请求过多，请稍后再试");
        if (connection.nextId > 0xffff_ffff) {
            this.lost("连接请求编号已耗尽，正在重新连接");
            return;
        }
        const id = connection.nextId;
        // Encoding must succeed before registering the request or its timer.
        const data = encodePacket(name, id, body);
        connection.nextId++;
        connection.pending[String(id)] = {
            name,
            target,
            text,
            draftVersion: this.state.draftVersion,
            age: 0,
        };
        this.effects.push({
            id: `wire:${connection.epoch}:${id}`,
            kind: "socket.send",
            input: { key: connection.key, connectionId: connection.id, data },
        });
        this.clock("watch");
    }
    resync(packet: Packet) {
        if (this.state.buffered.length >= 128) {
            this.lost("服务器更新积压，正在重新获取会话");
            return;
        }
        this.state.buffered.push(packet);
        if (!this.state.syncing) {
            this.state.syncing = true;
            this.request("AgentSnapshotReq", {});
        }
    }
    full(session: ChatSession) {
        const id = session?.session?.id;
        if (!id) throw Error("服务器返回了无效会话");
        const existing = this.state.sessions[id];
        if (!existing || session.session.revision > existing.session.revision)
            this.state.sessions[id] = session;
    }
    snapshot(snapshot: AgentSnapshot, login: boolean) {
        if (
            !snapshot ||
            snapshot.username !== this.state.configuration.username
        )
            throw Error("服务器快照身份不匹配");
        const previous = this.state.sessions;
        this.state.sessions = {};
        for (const session of snapshot.chat_sessions) {
            const existing = previous[session.session.id];
            this.full(
                !login &&
                    existing &&
                    existing.session.revision > session.session.revision
                    ? existing
                    : session,
            );
        }
        this.state.models = snapshot.models;
        this.state.defaultModelId = snapshot.default_model_id;
        this.state.desktops = snapshot.desktops ?? [];
        if (
            this.state.selectedId &&
            !this.state.sessions[this.state.selectedId]
        )
            this.state.selectedId = "";
        if (login) {
            this.state.connection.status =
                this.state.local && this.state.local.canExecute !== false
                    ? "restoring"
                    : "online";
            this.state.connection.attempt = 0;
            this.state.error = "";
            if (this.state.local) this.register();
        }
        this.state.syncing = false;
        const buffered = this.state.buffered;
        this.state.buffered = [];
        for (const packet of buffered) this.notification(packet);
    }
    register() {
        const local = this.state.local;
        if (!local || local.canExecute === false) return;
        this.request("DesktopRegisterReq", {
            device_id: local.deviceId,
            name: local.name,
            remote_enabled: local.remoteEnabled,
            authorization_id: local.authorizationId,
        });
    }
    unavailable() {
        this.state.connection.status = "unavailable";
        this.state.connection.pending = {};
        this.state.sessions = {};
        this.state.selectedId = "";
        this.state.desktops = [];
        this.state.buffered = [];
        this.state.syncing = false;
        this.state.error = "";
    }
    notification(packet: Packet) {
        const connection = this.state.connection;
        if (packet.name === "AppCenterChangedNtf") {
            if (
                packet.body.app_id !== "agent" ||
                Object.values(connection.pending).some(
                    (request) => request.name === "LoginReq",
                )
            )
                return;
            if (!packet.body.enabled) this.unavailable();
            else if (connection.status === "unavailable") {
                connection.status = "restoring";
                this.state.localEffects = {};
                this.request(
                    "AgentSnapshotReq",
                    {},
                    this.state.configuration.userId,
                );
            }
            return;
        }
        if (
            connection.status === "unavailable" &&
            packet.name !== "ExecutionActionNtf"
        )
            return;
        if (this.state.connection.status === "restoring") {
            if (this.state.buffered.length >= 128)
                this.lost("登录期间更新过多，正在重连");
            else this.state.buffered.push(packet);
            return;
        }
        const body = packet.body;
        if (packet.name === "SessionUpdatedNtf") {
            this.full(body.chat_session as ChatSession);
            return;
        }
        if (packet.name === "DesktopUpdatedNtf") {
            const device = body.device as import("./types").DesktopDevice;
            this.state.desktops = [
                ...this.state.desktops.filter((item) => item.id !== device.id),
                device,
            ];
            return;
        }
        if (packet.name === "ExecutionActionNtf") {
            if (!this.state.local) throw Error("本机执行器不可用");
            const id = this.emit("agent.execute", body as Record<string, Json>);
            this.state.localEffects[id] = {
                epoch: this.state.connection.epoch,
                requestId: String(body.request_id),
            };
            return;
        }
        const session = this.state.sessions[String(body.session_id)];
        const revision = Number(body.revision);
        if (session && revision <= session.session.revision) return;
        if (
            this.state.syncing ||
            !session ||
            revision !== session.session.revision + 1
        ) {
            this.resync(packet);
            return;
        }
        const message = session.session.messages.find(
            (message) => message.id === body.message_id,
        );
        if (!message) {
            this.resync(packet);
            return;
        }
        switch (packet.name) {
            case "MessageDeltaNtf":
                if (
                    message.status !== 1 ||
                    message.run_id !== body.run_id ||
                    session.session.run_id !== body.run_id
                ) {
                    this.resync(packet);
                    return;
                }
                message.content += String(body.delta);
                break;
            case "ToolUpdatedNtf": {
                const tool = body.tool as ToolCall;
                if (!tool || tool.run_id !== message.run_id) {
                    this.resync(packet);
                    return;
                }
                const index = message.tool_calls.findIndex(
                    (existing) => existing.id === tool.id,
                );
                if (index < 0) message.tool_calls.push(tool);
                else message.tool_calls[index] = tool;
                break;
            }
            case "ReasoningDeltaNtf": {
                const block = body.block as ReasoningBlock;
                if (!block || block.run_id !== message.run_id) {
                    this.resync(packet);
                    return;
                }
                const tool = body.tool_call_id
                    ? message.tool_calls.find(
                          (tool) => tool.id === body.tool_call_id,
                      )
                    : undefined;
                if (body.tool_call_id && !tool) {
                    this.resync(packet);
                    return;
                }
                const blocks = tool ? tool.reasoning : message.reasoning;
                const existing = blocks.find((value) => value.id === block.id);
                if (existing) {
                    existing.text += block.text;
                    existing.status = block.status;
                } else blocks.push(block);
                break;
            }
            default:
                throw Error("不支持的服务端通知");
        }
        session.session.revision = revision;
    }
    response(packet: Packet) {
        const connection = this.state.connection;
        const pending = connection.pending[String(packet.id)];
        if (!pending) return; // Timed-out and previous-connection responses never release a new operation.
        if (packet.name !== pending.name.replace(/Req$/, "Res"))
            throw Error("服务器响应类型与请求不匹配");
        delete connection.pending[String(packet.id)];
        if (packet.body.ret !== 1) {
            const error = packet.body.error as { message?: string } | null;
            const message = error?.message || "服务器拒绝了请求";
            if (
                pending.name === "LoginReq" ||
                pending.name === "DesktopRegisterReq"
            )
                this.lost(message, false);
            else if (
                pending.name === "AgentSnapshotReq" &&
                packet.body.ret === 4
            )
                this.unavailable();
            else if (pending.name === "AgentSnapshotReq") this.lost(message);
            else this.state.error = message;
            return;
        }
        switch (pending.name) {
            case "LoginReq": {
                const identity = packet.body.identity as {
                    username: string;
                    user_id: string;
                };
                if (
                    !identity?.user_id ||
                    identity.user_id !== this.state.configuration.userId ||
                    identity.username !== this.state.configuration.username
                )
                    throw Error("服务器登录身份不匹配");
                this.request("AgentSnapshotReq", {}, identity.user_id);
                break;
            }
            case "AgentSnapshotReq": {
                const snapshot = packet.body.snapshot as AgentSnapshot;
                if (pending.target && pending.target !== snapshot?.user_id)
                    throw Error("服务器快照身份不匹配");
                this.snapshot(snapshot, Boolean(pending.target));
                break;
            }
            case "ChatReq": {
                const session = packet.body.chat_session as ChatSession;
                this.full(session);
                const remaining =
                    (this.state.drafts[pending.target] ?? "") === pending.text
                        ? ""
                        : (this.state.drafts[pending.target] ?? "");
                if (pending.target)
                    this.state.drafts[pending.target] = remaining;
                else if (pending.draftVersion === this.state.draftVersion) {
                    this.state.drafts[session.session.id] = remaining;
                    this.state.drafts[""] = "";
                }
                if (
                    this.state.selectedId === pending.target &&
                    (pending.target !== "" ||
                        pending.draftVersion === this.state.draftVersion)
                )
                    this.state.selectedId = session.session.id;
                if (!pending.target) this.state.draftVersion++;
                this.state.notice = "";
                break;
            }
            case "SessionModelSetReq":
            case "SessionExecutionSetReq":
                this.full(packet.body.chat_session as ChatSession);
                break;
            case "DesktopRegisterReq": {
                connection.status = "online";
                const buffered = this.state.buffered;
                this.state.buffered = [];
                for (const packet of buffered) this.notification(packet);
                break;
            }
            // Cancellation is acknowledged here, but the run stays active until its terminal snapshot.
            case "MessageCancelReq":
                break;
        }
    }
    effect(payload: Record<string, unknown>) {
        const connection = this.state.connection;
        const id = String(payload.id);
        if (id === this.state.localRequest) {
            this.state.localRequest = "";
            if (payload.error) {
                this.lost(String(payload.error), false);
                return;
            }
            this.state.local = payload.value as LocalContext;
            this.state.supportsLocal = this.state.local.canExecute !== false;
            if (connection.status === "connecting") this.openSocket();
            return;
        }
        const execution = this.state.localEffects[id];
        if (execution) {
            delete this.state.localEffects[id];
            if (
                execution.epoch === connection.epoch &&
                (connection.status === "online" ||
                    connection.status === "unavailable")
            ) {
                this.request("ExecutionResultReq", {
                    request_id: execution.requestId,
                    result: JSON.stringify(
                        payload.error
                            ? { ok: false, error: payload.error }
                            : payload.value,
                    ),
                });
            }
            return;
        }
        if (id === connection.opening) {
            connection.opening = "";
            if (payload.error) {
                this.lost(String(payload.error));
                return;
            }
            connection.id = String(
                (payload.value as Record<string, unknown>).connectionId,
            );
            connection.status = "restoring";
            this.request("LoginReq", {
                username: this.state.configuration.username,
            });
        } else if (id === connection.clock) {
            connection.clock = "";
            if (payload.error) {
                this.lost("宿主计时失败，请重新连接", false);
                return;
            }
            if (connection.clockMode === "reconnect") {
                this.connect();
                return;
            }
            for (const request of Object.values(connection.pending))
                request.age++;
            if (
                Object.values(connection.pending).some(
                    (request) => request.age >= 15,
                ) ||
                (connection.status === "connecting" && !connection.id)
            ) {
                // URLSession may still be completing the handshake; it is bounded independently too.
                if (
                    connection.status !== "connecting" ||
                    ++connection.attempt >= 15
                )
                    this.lost("服务器请求超时，正在恢复连接");
            }
            if (connection.opening || Object.keys(connection.pending).length)
                this.clock("watch");
        } else if (
            id.startsWith(`wire:${connection.epoch}:`) &&
            payload.error
        ) {
            const requestId = id.split(":")[2];
            if (connection.pending[requestId])
                this.lost(`发送失败：${String(payload.error)}`);
        }
    }
    finish(): Transition<AgentState> {
        return { state: this.state, effects: this.effects };
    }
}

export function startAgent(
    previous: AgentState,
    localExecution = false,
): Transition<AgentState> {
    const turn = new Turn(
        previous.version === 1 ? previous : initialAgentState(),
    );
    const connection = turn.state.connection;
    if (
        Object.values(connection.pending).some(
            (request) => request.name === "ChatReq",
        )
    )
        turn.state.notice = "上次发送的结果未确认，请先查看服务器恢复的会话。";
    connection.pending = {};
    connection.key = "";
    connection.id = "";
    connection.opening = "";
    connection.clock = "";
    connection.attempt = 0;
    turn.state.buffered = [];
    turn.state.syncing = false;
    connection.status = "offline";
    turn.state.supportsLocal = localExecution;
    turn.state.local = null;
    turn.state.localEffects = {};
    turn.state.localRequest = "";
    return turn.finish();
}

export function reduceAgent(
    previous: AgentState,
    command: Command,
): Transition<AgentState> {
    const turn = new Turn(previous);
    const state = turn.state;
    const body = (command.payload ?? {}) as Record<string, Json>;
    try {
        switch (command.type) {
            case "$interrupted":
                return { state: previous };
            case "$effect":
                turn.effect(body);
                break;
            case "$agent.context":
                state.local = body as unknown as LocalContext;
                state.supportsLocal = state.local.canExecute !== false;
                if (state.connection.status === "online") turn.register();
                break;
            case "$resource":
                if (
                    body.key !== state.connection.key ||
                    body.connectionId !== state.connection.id
                )
                    break;
                if (body.error) turn.lost(`连接中断：${String(body.error)}`);
                else if (typeof body.data === "string") {
                    const packet = decodePacket(body.data);
                    if (packet.id === 0) turn.notification(packet);
                    else turn.response(packet);
                } else throw Error("服务器应发送二进制 protobuf 消息");
                break;
            case "$user": {
                const url = String(body.url ?? "").trim();
                const username = String(body.username ?? "").trim();
                const userId = String(body.userId ?? "");
                if (!url || !username || !userId)
                    throw Error("宿主登录信息无效");
                const changedUser =
                    username !== state.configuration.username ||
                    url !== state.configuration.url;
                state.configuration = { url, username, userId, enabled: true };
                if (changedUser) {
                    state.sessions = {};
                    state.models = [];
                    state.defaultModelId = "";
                    state.selectedId = "";
                    state.drafts = { "": "" };
                    state.draftModelId = "";
                    state.draftVersion++;
                    state.notice = "";
                }
                state.connection.attempt = 0;
                turn.connect();
                break;
            }
            case "execution.select": {
                const id = String(body.workspaceId ?? "");
                const target = id
                    ? state.local?.workspaces.find(
                          (item) => item.workspace_id === id,
                      )
                    : null;
                if (id && !target) throw Error("此本地目录尚未授权");
                const session = state.sessions[state.selectedId];
                if (!session) state.draftTarget = target ?? null;
                else {
                    if (state.connection.status !== "online" || state.syncing)
                        throw Error("请等待连接和会话恢复");
                    if (session.session.run_id)
                        throw Error("任务运行中不能切换工作目录");
                    const changing = Object.values(
                        state.connection.pending,
                    ).find(
                        (request) =>
                            request.name === "SessionExecutionSetReq" &&
                            request.target === state.selectedId,
                    );
                    if (changing?.text === id) break;
                    if (changing) throw Error("工作目录切换正在进行");
                    if ((session.execution_target?.workspace_id ?? "") === id)
                        break;
                    turn.request(
                        "SessionExecutionSetReq",
                        { session_id: state.selectedId, target: target ?? {} },
                        state.selectedId,
                        id,
                    );
                }
                break;
            }
            case "connection.reconnect":
                if (!state.configuration.username) throw Error("请先配置连接");
                state.configuration.enabled = true;
                state.connection.attempt = 0;
                turn.connect();
                break;
            case "connection.disconnect":
                state.configuration.enabled = false;
                turn.lost("", false);
                break;
            case "session.new":
                state.selectedId = "";
                state.error = "";
                break;
            case "session.select":
                if (typeof body.id !== "string" || !state.sessions[body.id])
                    throw Error("会话不存在");
                state.selectedId = body.id;
                state.error = "";
                break;
            case "draft.set":
                if (typeof body.text !== "string" || body.text.length > 32_000)
                    throw Error("输入不能超过 32000 字符");
                if (body.target !== "" && !state.sessions[String(body.target)])
                    throw Error("草稿会话不存在");
                state.drafts[String(body.target)] = body.text;
                break;
            case "model.select": {
                const modelId = String(body.id);
                if (!state.models.some((model) => model.id === modelId))
                    throw Error("模型不存在");
                state.error = "";
                if (!state.selectedId) state.draftModelId = modelId;
                else {
                    if (state.connection.status !== "online")
                        throw Error("请先连接服务器");
                    const changing = Object.values(
                        state.connection.pending,
                    ).find(
                        (request) =>
                            request.name === "SessionModelSetReq" &&
                            request.target === state.selectedId,
                    );
                    if (changing?.text === modelId) break;
                    if (changing) throw Error("模型切换正在进行");
                    if (state.sessions[state.selectedId]?.model_id === modelId)
                        break;
                    turn.request(
                        "SessionModelSetReq",
                        { session_id: state.selectedId, model_id: modelId },
                        state.selectedId,
                        modelId,
                    );
                }
                break;
            }
            case "chat.send":
            case "chat.retry": {
                if (state.connection.status !== "online" || state.syncing)
                    throw Error("请等待连接和会话恢复");
                if (isSending(state, state.selectedId))
                    throw Error("消息正在发送");
                const session = state.sessions[state.selectedId];
                if (session?.session.run_id) throw Error("请等待当前任务结束");
                const target = session
                    ? session.execution_target
                    : state.draftTarget;
                if (
                    target?.device_id &&
                    !state.desktops.some(
                        (device) =>
                            device.id === target.device_id &&
                            device.online &&
                            (device.id === state.local?.deviceId ||
                                device.remote_enabled),
                    )
                )
                    throw Error("目标桌面离线或未开启远程执行");
                if (
                    command.type === "chat.send" &&
                    body.target !== state.selectedId
                )
                    throw Error("会话已切换，请在当前会话中重新发送");
                const text =
                    command.type === "chat.send" &&
                    typeof body.text === "string"
                        ? body.text
                        : (state.drafts[state.selectedId] ?? "");
                if (text.length > 32_000)
                    throw Error("输入不能超过 32000 字符");
                const modelId =
                    session?.model_id ||
                    state.draftModelId ||
                    state.defaultModelId;
                const last = session?.session.messages.at(-1);
                const retry = command.type === "chat.retry";
                if (
                    retry &&
                    (!last ||
                        last.role !== 2 ||
                        last.status !== 4 ||
                        !last.error?.retryable)
                )
                    throw Error("仅支持重试最新的可重试失败轮次");
                if (
                    retry &&
                    (body.target !== state.selectedId ||
                        body.runId !== last!.run_id)
                )
                    throw Error("失败轮次已变化，请重新选择重试");
                if (!retry && !text.trim()) throw Error("请输入消息");
                if (!retry) state.drafts[state.selectedId] = text;
                state.error = "";
                turn.request(
                    "ChatReq",
                    {
                        session_id: state.selectedId,
                        text: retry ? "" : text,
                        retry_run_id: retry ? last!.run_id : "",
                        model_id: modelId,
                        ...(!session && target
                            ? { execution_target: target }
                            : {}),
                    },
                    state.selectedId,
                    retry ? "" : text,
                );
                break;
            }
            case "chat.cancel": {
                if (state.connection.status !== "online")
                    throw Error("请先连接服务器");
                const target = String(body.target ?? "");
                const session = state.sessions[target];
                // The displayed run may finish or be replaced before this click is processed.
                // A late cancellation must never target a newer run.
                if (
                    !session?.session.run_id ||
                    session.session.run_id !== body.runId
                )
                    break;
                if (
                    session.session.cancelling ||
                    Object.values(state.connection.pending).some(
                        (request) =>
                            request.name === "MessageCancelReq" &&
                            request.target === target,
                    )
                )
                    break;
                state.error = "";
                turn.request(
                    "MessageCancelReq",
                    {
                        session_id: target,
                        run_id: body.runId,
                    },
                    target,
                );
                break;
            }
            case "error.dismiss":
                state.error = "";
                state.notice = "";
                break;
            default:
                throw Error("未知 Agent 命令");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (command.type === "$resource") turn.lost(message, false);
        else state.error = message;
    }
    return turn.finish();
}
