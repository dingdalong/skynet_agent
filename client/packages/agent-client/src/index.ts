import type { Command, Effect, Json, Transition } from "@skynet/contracts";
import {
    gatewayChunkBytes,
    decodePacket,
    encodePacket,
    ownerOf,
    type Packet,
} from "./protocol";
import type {
    AgentState,
    ChatSession,
    ReasoningBlock,
    ToolCall,
    AgentSnapshot,
    LocalContext,
} from "./types";
export type * from "./types";
import {
    isSending,
    draftProject,
    projectPreferenceKey,
    creatingProject,
    isLocalDirectoryUnavailable,
} from "./selectors";

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
            maximum: gatewayChunkBytes,
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
        buffered: [],
        syncing: false,
        error: "",
        notice: "",
        supportsLocal: false,
        local: null,
        localRequest: "",
        localEffects: {},
        cloudProjects: [],
        projectPreferences: {},
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
                (request) => request.name === "AgentChatReq",
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
        connection.maximum = gatewayChunkBytes;
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
                (request) => request.name === "AgentChatReq",
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
    request(
        name: string,
        body: object,
        target = "",
        text = "",
        before?: number,
    ) {
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
        const data = encodePacket(
            name,
            id,
            body,
            undefined,
            connection.maximum,
        );
        connection.nextId++;
        connection.pending[String(id)] = {
            name,
            target,
            text,
            before,
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
    history(before = 0) {
        const id = this.state.selectedId;
        if (
            !id ||
            !this.state.connection.id ||
            this.state.connection.status === "unavailable"
        )
            return;
        const pending = Object.values(this.state.connection.pending);
        if (
            pending.some(
                (p) =>
                    p.name === "AgentSessionHistoryReq" &&
                    p.target === id &&
                    p.before === before,
            )
        )
            return;
        this.request(
            "AgentSessionHistoryReq",
            { session_id: id, before },
            id,
            "",
            before,
        );
    }
    discardHistoryRequests() {
        const pending = this.state.connection.pending;
        for (const [id, request] of Object.entries(pending)) {
            if (request.name === "AgentSessionHistoryReq") delete pending[id];
        }
    }
    select(id: string) {
        if (id !== this.state.selectedId) {
            this.discardHistoryRequests();
            const previous = this.state.sessions[this.state.selectedId];
            if (previous) previous.session.messages = [];
            this.state.selectedId = id;
        }
        this.state.error = "";
        if (
            this.state.connection.status === "online" &&
            id &&
            !this.state.sessions[id].session.messages.length
        )
            this.history();
    }
    updateSession(
        chat: ChatSession,
        keepMessages = chat.session.id === this.state.selectedId,
    ) {
        const next = chat.session;
        if (!next.id) throw Error("服务器返回了无效会话");
        const existing = this.state.sessions[next.id];
        const old = existing?.session;
        if (old && next.revision < old.revision) return;
        if (!keepMessages) {
            next.messages = [];
        } else if (old?.messages.length) {
            const start = next.message_start ?? 0;
            const previous = old.message_start ?? 0;
            if (start > previous + old.messages.length) {
                this.history();
            } else if (start > previous) {
                next.messages = [
                    ...old.messages.slice(0, start - previous),
                    ...next.messages,
                ];
                next.message_start = previous;
            }
        }
        this.state.sessions[next.id] = chat;
    }
    snapshot(snapshot: AgentSnapshot, login: boolean) {
        if (
            !snapshot ||
            snapshot.username !== this.state.configuration.username
        )
            throw Error("服务器快照身份不匹配");
        this.discardHistoryRequests();
        this.state.sessions = {};
        for (const chat of snapshot.chat_sessions)
            this.updateSession(chat, false);
        this.state.cloudProjects = snapshot.cloud_projects ?? [];
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
        if (this.state.selectedId) this.history();
        const buffered = this.state.buffered;
        this.state.buffered = [];
        for (const packet of buffered) this.notification(packet);
    }
    register() {
        const local = this.state.local;
        if (!local || local.canExecute === false) return;
        this.request("AgentDesktopRegisterReq", {
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
        this.state.cloudProjects = [];
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
            packet.name !== "AgentExecutionActionNtf"
        )
            return;
        if (this.state.connection.status === "restoring") {
            if (this.state.buffered.length >= 128)
                this.lost("登录期间更新过多，正在重连");
            else this.state.buffered.push(packet);
            return;
        }
        const body = packet.body;
        if (
            packet.name !== "AgentExecutionActionNtf" &&
            (body.session_id === this.state.selectedId ||
                (body.chat_session as ChatSession | undefined)?.session.id ===
                    this.state.selectedId) &&
            Object.values(connection.pending).some(
                (p) =>
                    p.name === "AgentSessionHistoryReq" &&
                    p.before === 0 &&
                    p.target === this.state.selectedId,
            )
        ) {
            if (this.state.buffered.length >= 128)
                this.lost("会话更新积压，正在重连");
            else this.state.buffered.push(packet);
            return;
        }
        if (packet.name === "AgentSessionUpdatedNtf") {
            this.updateSession(body.chat_session as ChatSession);
            return;
        }
        if (packet.name === "AgentCloudProjectCreatedNtf") {
            this.addCloudProject(String(body.name));
            return;
        }
        if (packet.name === "AgentDesktopUpdatedNtf") {
            const device = body.device as import("./types").DesktopDevice;
            this.state.desktops = [
                ...this.state.desktops.filter((item) => item.id !== device.id),
                device,
            ];
            return;
        }
        if (packet.name === "AgentExecutionActionNtf") {
            if (!this.state.local) throw Error("本机执行器不可用");
            const id = this.emit("agent.execute", body as Record<string, Json>);
            this.state.localEffects[id] = {
                epoch: this.state.connection.epoch,
                requestId: String(body.request_id),
            };
            return;
        }
        const session = this.state.sessions[String(body.session_id)];
        if (body.session_id !== this.state.selectedId) return;
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
            case "AgentMessageDeltaNtf":
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
            case "AgentToolUpdatedNtf": {
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
            case "AgentReasoningDeltaNtf": {
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
    addCloudProject(name: string) {
        if (!name) return;
        if (!this.state.cloudProjects.includes(name))
            this.state.cloudProjects.push(name);
        for (const chat of Object.values(this.state.sessions)) {
            if (chat.cloud_project === name && chat.needs_workspace) {
                chat.needs_workspace = false;
                if (
                    chat.recovery_notice ===
                    "原项目目录不可用，请恢复原目录或新建会话"
                )
                    chat.recovery_notice = undefined;
            }
        }
    }
    rememberProject(location: "local" | "cloud", id?: string) {
        const key = projectPreferenceKey(this.state);
        const existing = this.state.projectPreferences[key];
        this.state.projectPreferences[key] = {
            location,
            localId:
                location === "local" && id !== undefined
                    ? id
                    : existing?.localId,
            cloudId:
                location === "cloud" && id !== undefined
                    ? id
                    : existing?.cloudId,
        };
    }
    response(packet: Packet) {
        const connection = this.state.connection;
        const pending = connection.pending[String(packet.id)];
        if (!pending) return; // Timed-out and previous-connection responses never release a new operation.
        if (
            packet.app !== ownerOf(pending.name) ||
            (packet.name !== "RoutingError" &&
                packet.name !== pending.name.replace(/Req$/, "Res"))
        )
            throw Error("服务器响应类型与请求不匹配");
        delete connection.pending[String(packet.id)];
        if (packet.body.ret !== 1) {
            const error = packet.body.error as { message?: string } | null;
            const message = error?.message || "服务器拒绝了请求";
            if (
                pending.name === "LoginReq" ||
                pending.name === "AgentDesktopRegisterReq"
            )
                this.lost(message, false);
            else if (
                pending.name === "AgentSnapshotReq" &&
                packet.body.ret === 4
            )
                this.unavailable();
            else if (pending.name === "AgentSnapshotReq") this.lost(message);
            else if (
                pending.name !== "AgentSessionHistoryReq" ||
                pending.target === this.state.selectedId
            ) {
                this.state.error = message;
                if (
                    pending.name === "AgentSessionHistoryReq" &&
                    !pending.before
                )
                    this.state.buffered = [];
            }
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
                const maximum = Number(packet.body.max_message_bytes);
                if (!Number.isInteger(maximum) || maximum < gatewayChunkBytes)
                    throw Error("登录响应中的业务消息上限无效");
                connection.maximum = maximum;
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
            case "AgentSessionHistoryReq": {
                if (pending.target !== this.state.selectedId) break;
                const page = packet.body.chat_session as ChatSession;
                if (page?.session.id !== pending.target)
                    throw Error("历史响应会话不匹配");
                if (pending.before) {
                    const current = this.state.sessions[pending.target].session;
                    const start = page.session.message_start ?? 0;
                    if (
                        start + page.session.messages.length !==
                            pending.before ||
                        start >= pending.before
                    )
                        throw Error("历史响应位置无效");
                    if (current.message_start === pending.before) {
                        current.messages = [
                            ...page.session.messages,
                            ...current.messages,
                        ];
                        current.message_start = start;
                    }
                    break;
                }
                this.updateSession(page);
                const buffered = this.state.buffered;
                this.state.buffered = [];
                for (const update of buffered) this.notification(update);
                break;
            }
            case "AgentChatReq": {
                const session = packet.body.chat_session as ChatSession;
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
                this.updateSession(session);
                if (
                    !pending.target &&
                    this.state.selectedId === session.session.id
                )
                    this.history();
                if (!pending.target) this.state.draftVersion++;
                this.state.notice = "";
                break;
            }
            case "AgentSessionModelSetReq":
                this.updateSession(packet.body.chat_session as ChatSession);
                break;
            case "AgentPreferenceSetReq": {
                this.state.defaultModelId = String(packet.body.model_id);
                break;
            }
            case "AgentCloudProjectCreateReq": {
                const name = String(packet.body.name);
                this.addCloudProject(name);
                if (
                    !this.state.selectedId &&
                    this.state.draftVersion === pending.draftVersion
                )
                    this.rememberProject("cloud", name);
                break;
            }
            case "AgentDesktopRegisterReq": {
                connection.status = "online";
                const buffered = this.state.buffered;
                this.state.buffered = [];
                for (const packet of buffered) this.notification(packet);
                break;
            }
            // Cancellation is acknowledged here, but the run stays active until its terminal snapshot.
            case "AgentMessageCancelReq":
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
                this.request("AgentExecutionResultReq", {
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
            (request) => request.name === "AgentChatReq",
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
                    const packet = decodePacket(
                        body.data,
                        state.connection.maximum,
                    );
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
                    userId !== state.configuration.userId ||
                    username !== state.configuration.username ||
                    url !== state.configuration.url;
                state.configuration = { url, username, userId, enabled: true };
                if (changedUser) {
                    state.sessions = {};
                    state.models = [];
                    state.defaultModelId = "";
                    state.selectedId = "";
                    state.drafts = { "": "" };
                    state.cloudProjects = [];
                    state.draftVersion++;
                    state.notice = "";
                }
                state.connection.attempt = 0;
                turn.connect();
                break;
            }
            case "project.select":
            case "project.create": {
                if (
                    state.selectedId ||
                    isSending(state, "") ||
                    creatingProject(state)
                )
                    throw Error("当前会话的项目已固定");
                if (state.connection.status !== "online" || state.syncing)
                    throw Error("请等待连接和会话恢复");
                if (
                    body.draftVersion !== undefined &&
                    body.draftVersion !== state.draftVersion
                )
                    break;
                const location = body.location;
                if (
                    location !== "cloud" &&
                    (location !== "local" || !state.supportsLocal)
                )
                    throw Error("工作位置不可用");
                const hasId = body.id !== undefined;
                const id = hasId ? String(body.id ?? "") : "";
                if (command.type === "project.create") {
                    const trimmed = id.trim();
                    if (location !== "cloud" || !trimmed)
                        throw Error("请输入项目名称");
                    turn.request("AgentCloudProjectCreateReq", {
                        name: trimmed,
                    });
                } else {
                    if (
                        location === "cloud" &&
                        id &&
                        !state.cloudProjects.includes(id)
                    )
                        throw Error("云端项目不可用");
                    if (
                        location === "local" &&
                        id &&
                        !state.local?.workspaces.some(
                            (item) => item.workspace_id === id,
                        )
                    )
                        throw Error("此本地目录尚未授权");
                    turn.rememberProject(location, hasId ? id : undefined);
                    state.draftVersion++;
                }
                state.error = "";
                break;
            }
            case "project.restore": {
                if (state.connection.status !== "online" || state.syncing)
                    throw Error("请等待连接和会话恢复");
                if (creatingProject(state)) throw Error("请等待项目创建完成");
                const current = state.sessions[state.selectedId];
                if (
                    !current ||
                    current.read_only ||
                    !current.needs_workspace ||
                    !current.cloud_project
                )
                    throw Error("当前会话无需恢复云端项目目录");
                turn.request("AgentCloudProjectCreateReq", {
                    name: current.cloud_project,
                });
                state.error = "";
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
            case "session.new": {
                const explicitLocation = body.location;
                if (explicitLocation !== undefined) {
                    if (
                        !state.selectedId &&
                        (isSending(state, "") || creatingProject(state))
                    )
                        throw Error("请等待当前请求完成");
                    if (
                        explicitLocation !== "cloud" &&
                        (explicitLocation !== "local" || !state.supportsLocal)
                    )
                        throw Error("工作位置不可用");
                    const hasId = body.id !== undefined;
                    const id = hasId ? String(body.id ?? "") : "";
                    if (
                        explicitLocation === "cloud" &&
                        id &&
                        !state.cloudProjects.includes(id)
                    )
                        throw Error("云端项目不可用");
                    if (
                        explicitLocation === "local" &&
                        id &&
                        !state.local?.workspaces.some(
                            (item) => item.workspace_id === id,
                        )
                    )
                        throw Error("此本地目录尚未授权");
                    state.draftVersion++;
                    turn.rememberProject(
                        explicitLocation,
                        hasId ? id : undefined,
                    );
                    state.error = "";
                } else {
                    const current = state.sessions[state.selectedId];
                    if (current) {
                        state.draftVersion++;
                        const target = current.execution_target;
                        if (
                            target &&
                            state.local?.workspaces.some(
                                (item) =>
                                    item.device_id === target.device_id &&
                                    item.workspace_id === target.workspace_id,
                            )
                        )
                            turn.rememberProject("local", target.workspace_id);
                        else if (
                            current.cloud_project &&
                            state.cloudProjects.includes(current.cloud_project)
                        )
                            turn.rememberProject(
                                "cloud",
                                current.cloud_project,
                            );
                    }
                }
                turn.select("");
                break;
            }
            case "session.select":
                if (typeof body.id !== "string" || !state.sessions[body.id])
                    throw Error("会话不存在");
                turn.select(body.id);
                break;
            case "history.load": {
                if (
                    body.target !== state.selectedId ||
                    state.connection.status !== "online"
                )
                    break;
                const session = state.sessions[state.selectedId]?.session;
                if (!session) break;
                if (!session.messages.length || session.message_start) {
                    state.error = "";
                    turn.history(
                        session.messages.length ? session.message_start : 0,
                    );
                }
                break;
            }
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
                if (!state.selectedId) {
                    if (state.connection.status !== "online")
                        throw Error("请先连接服务器");
                    turn.request("AgentPreferenceSetReq", {
                        model_id: modelId,
                    });
                } else {
                    if (state.connection.status !== "online")
                        throw Error("请先连接服务器");
                    const changing = Object.values(
                        state.connection.pending,
                    ).find(
                        (request) =>
                            request.name === "AgentSessionModelSetReq" &&
                            request.target === state.selectedId,
                    );
                    if (changing?.text === modelId) break;
                    if (changing) throw Error("模型切换正在进行");
                    if (state.sessions[state.selectedId]?.model_id === modelId)
                        break;
                    turn.request(
                        "AgentSessionModelSetReq",
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
                if (session?.read_only)
                    throw Error("此会话仅可阅读，请另开会话");
                if (
                    Object.values(state.connection.pending).some(
                        (item) => item.name === "AgentPreferenceSetReq",
                    )
                )
                    throw Error("请等待设置保存完成");
                if (session?.session.run_id) throw Error("请等待当前任务结束");
                const choice = draftProject(state);
                const target = session
                    ? session.execution_target
                    : choice.location === "local"
                      ? state.local?.workspaces.find(
                            (item) => item.workspace_id === choice.id,
                        )
                      : null;
                if (session && isLocalDirectoryUnavailable(state, session))
                    throw Error("原目录尚未授权，请恢复原目录授权或新建会话");
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
                const modelId = session?.model_id || state.defaultModelId;
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
                if (!session && (!choice.id || creatingProject(state)))
                    throw Error("请先选择项目");
                if (!retry && !text.trim()) throw Error("请输入消息");
                if (!retry) state.drafts[state.selectedId] = text;
                state.error = "";
                turn.request(
                    "AgentChatReq",
                    {
                        session_id: state.selectedId,
                        text: retry ? "" : text,
                        retry_run_id: retry ? last!.run_id : "",
                        model_id: modelId,
                        ...(!session && choice.location === "cloud"
                            ? { cloud_project: choice.id }
                            : {}),
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
                            request.name === "AgentMessageCancelReq" &&
                            request.target === target,
                    )
                )
                    break;
                state.error = "";
                turn.request(
                    "AgentMessageCancelReq",
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
