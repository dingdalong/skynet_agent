import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
    initialAgentState,
    reduceAgent,
    startAgent,
} from "../packages/agent-client/src/index";
import {
    decodePacket,
    encodePacket,
    fromBase64,
    hash,
    toBase64,
} from "../packages/agent-client/src/protocol";
import type {
    AgentState,
    ChatSession,
} from "../packages/agent-client/src/types";
import type { Json, Transition } from "@skynet/contracts";

const origin = "ws://127.0.0.1:18787";
const vectors = JSON.parse(
    readFileSync(
        new URL(
            "../../common/proto/testdata/protocol_vectors.json",
            import.meta.url,
        ),
        "utf8",
    ),
);
const hex = (base64: string) => Buffer.from(fromBase64(base64)).toString("hex");
const frame = (hex: string) =>
    toBase64(new Uint8Array(Buffer.from(hex, "hex")));

function session(revision = 1, status = 1): ChatSession {
    return {
        session: {
            id: "s1",
            title: "测试",
            revision,
            updated_at: 1,
            run_id: status === 1 ? "r1" : "",
            cancelling: false,
            messages: [
                {
                    id: "m1",
                    role: 2,
                    content: "",
                    created_at: 1,
                    status,
                    run_id: "r1",
                    error: null,
                    ret: 0,
                    tool_calls: [],
                    reasoning: [],
                },
            ],
        },
        model_id: "model1",
        permission_model_id: "",
        execution_target: null,
    };
}
class Client {
    state = initialAgentState();
    last: Transition<AgentState> = { state: this.state };
    command(type: string, payload: Json = {}) {
        this.last = reduceAgent(this.state, { type, payload });
        this.state = this.last.state;
        return this.last;
    }
    effect(id: string, value: Json = {}) {
        return this.command("$effect", { id, value });
    }
    resource(name: string, body: object, id = 0) {
        return this.command("$resource", {
            key: this.state.connection.key,
            connectionId: this.state.connection.id,
            data: encodePacket(name, id, body),
        });
    }
    pending(name: string) {
        return Number(
            Object.entries(this.state.connection.pending).find(
                ([, value]) => value.name === name,
            )?.[0],
        );
    }
    snapshot(sessions: ChatSession[] = []) {
        return {
            username: "alice",
            user_id: "u1",
            chat_sessions: sessions,
            models: [{ id: "model1", name: "模型一", model: "model1" }],
            default_model_id: "model1",
        };
    }
    connect() {
        let result = this.command("$user", {
            url: `${origin}/agent`,
            username: "alice",
            userId: "u1",
        });
        const context = result.effects?.find(
            (effect) => effect.kind === "agent.context",
        );
        if (context) result = this.effect(context.id, nativeContext);
        this.effect(
            result.effects!.find((effect) => effect.kind === "socket.open")!.id,
            { connectionId: "physical1" },
        );
    }
    login(sessions: ChatSession[] = []) {
        this.connect();
        this.restore(sessions);
    }
    restore(sessions: ChatSession[] = []) {
        this.resource(
            "LoginRes",
            { ret: 1, identity: { user_id: "u1", username: "alice" } },
            this.pending("LoginReq"),
        );
        expect(this.state.connection.status).toBe("restoring");
        this.resource(
            "AgentSnapshotRes",
            { ret: 1, snapshot: this.snapshot(sessions) },
            this.pending("AgentSnapshotReq"),
        );
    }
}

const nativeContext = {
    deviceId: "mac-1",
    name: "Mac",
    authorizationId: "grant-1",
    remoteEnabled: false,
    workspaces: [
        {
            device_id: "mac-1",
            workspace_id: "work-1",
            directory: "/project",
            platform: "macos",
        },
    ],
};

describe("native Agent development", () => {
    it("keeps the connection through service retirement and registers the desktop with the new pool", () => {
        const client = new Client();
        client.state = startAgent(client.state, true).state;
        client.login([session()]);
        client.resource(
            "DesktopRegisterRes",
            { ret: 1 },
            client.pending("DesktopRegisterReq"),
        );
        client.command("session.select", { id: "s1" });
        const change = (enabled: boolean) =>
            client.resource("AppCenterChangedNtf", {
                app_id: "agent",
                enabled,
            });
        change(false);
        expect(client.state.connection.status).toBe("unavailable");
        expect(client.state.connection.id).toBe("physical1");
        const cleanup = client.resource("ExecutionActionNtf", {
            request_id: "cleanup",
            operation: "cancel",
        });
        client.effect(cleanup.effects![0].id, { ok: true });
        expect(client.pending("ExecutionResultReq")).toBeGreaterThan(0);
        client.resource("SessionUpdatedNtf", { chat_session: session() });
        expect(client.state.sessions).toEqual({});
        change(true);
        expect(client.state.selectedId).toBe("");
        client.resource(
            "AgentSnapshotRes",
            { ret: 1, snapshot: client.snapshot() },
            client.pending("AgentSnapshotReq"),
        );
        client.resource(
            "DesktopRegisterRes",
            { ret: 1 },
            client.pending("DesktopRegisterReq"),
        );
        expect(client.state.connection.status).toBe("online");
        expect(client.state.connection.id).toBe("physical1");
        expect(client.pending("ChatReq")).toBeNaN();
    });
    it("waits on the logged-in connection when Agent is offline at first open", () => {
        const client = new Client();
        client.connect();
        client.resource(
            "LoginRes",
            { ret: 1, identity: { username: "alice", user_id: "u1" } },
            client.pending("LoginReq"),
        );
        client.resource(
            "AgentSnapshotRes",
            { ret: 4 },
            client.pending("AgentSnapshotReq"),
        );
        expect(client.state.connection.status).toBe("unavailable");
        client.resource("AppCenterChangedNtf", {
            app_id: "agent",
            enabled: true,
        });
        expect(client.pending("AgentSnapshotReq")).toBeGreaterThan(0);
        expect(client.pending("LoginReq")).toBeNaN();
    });
    it("uses the host identity on mobile without registering a desktop executor", () => {
        const client = new Client();
        client.state = startAgent(client.state, true).state;
        client.command("$agent.context", {
            ...nativeContext,
            canExecute: false,
            workspaces: [],
            authorizationId: "",
        });
        client.login();
        expect(client.state.supportsLocal).toBe(false);
        expect(client.state.connection.status).toBe("online");
        expect(client.pending("DesktopRegisterReq")).toBeNaN();
        expect(
            client.last.effects?.some(
                (effect) => effect.kind === "agent.execute",
            ),
        ).toBe(false);
    });
    it("keeps repeated model selection idempotent without adding an error above history", () => {
        const client = new Client();
        client.login([session(1, 2)]);
        client.state.selectedId = "s1";
        client.state.models.push({
            id: "model2",
            name: "Model 2",
            model: "model2",
        });
        client.command("model.select", { id: "model2" });
        const next = client.state.connection.nextId;
        client.command("model.select", { id: "model2" });
        expect(client.state.error).toBe("");
        expect(client.state.connection.nextId).toBe(next);
        const updated = session(2, 2);
        updated.model_id = "model2";
        client.resource(
            "SessionModelSetRes",
            { ret: 1, chat_session: updated },
            client.pending("SessionModelSetReq"),
        );
        expect(
            client.command("model.select", { id: "model2" }).effects,
        ).toEqual([]);
        expect(client.state.error).toBe("");
    });
    it("registers the native device before releasing buffered execution actions", () => {
        const client = new Client();
        client.command("$agent.context", nativeContext);
        client.connect();
        client.restore();
        expect(client.state.connection.status).toBe("restoring");
        client.resource("ExecutionActionNtf", {
            request_id: "call-1",
            session_id: "s1",
            run_id: "run-1",
            workspace_id: "work-1",
            authorization_id: "grant-1",
            operation: "project",
            arguments: "{}",
        });
        expect(client.state.buffered).toHaveLength(1);
        const registered = client.resource(
            "DesktopRegisterRes",
            { ret: 1 },
            client.pending("DesktopRegisterReq"),
        );
        expect(client.state.connection.status).toBe("online");
        const effect = registered.effects!.find(
            (effect) => effect.kind === "agent.execute",
        )!;
        expect(effect.input.request_id).toBe("call-1");
        client.effect(effect.id, {
            ok: true,
            project: { workspace: "/project" },
        });
        expect(client.pending("ExecutionResultReq")).toBeGreaterThan(0);
        const packet = client.last.effects!.find(
            (effect) => effect.kind === "socket.send",
        )!;
        expect(packet.input.connectionId).toBe("physical1");
    });
    it("starts native context once per business process and ignores results after disconnect", () => {
        const initial = startAgent(initialAgentState(), true);
        expect(initial.effects).toEqual([]);
        const client = new Client();
        client.state = initial.state;
        client.command("$agent.context", nativeContext);
        expect(client.state.local?.deviceId).toBe("mac-1");
        client.state.supportsLocal = false;
        client.login();
        client.resource(
            "DesktopRegisterRes",
            { ret: 1 },
            client.pending("DesktopRegisterReq"),
        );
        const result = client.resource("ExecutionActionNtf", {
            request_id: "call-1",
            session_id: "s1",
            run_id: "run-1",
            workspace_id: "work-1",
            authorization_id: "grant-1",
            operation: "execute",
            arguments: "{}",
        });
        const effect = result.effects!.find(
            (effect) => effect.kind === "agent.execute",
        )!;
        client.command("connection.disconnect");
        expect(client.effect(effect.id, { ok: true }).effects).toEqual([]);
        expect(client.state.localEffects).toEqual({});
    });
    it("binds an authorized local target to a new chat and rejects unknown workspaces", () => {
        const client = new Client();
        client.login();
        client.command("$agent.context", nativeContext);
        client.resource("DesktopUpdatedNtf", {
            device: { id: "mac-1", name: "Mac", online: true },
        });
        client.resource(
            "DesktopRegisterRes",
            { ret: 1 },
            client.pending("DesktopRegisterReq"),
        );
        client.command("execution.select", { workspaceId: "forged" });
        expect(client.state.error).toContain("尚未授权");
        client.command("execution.select", { workspaceId: "work-1" });
        expect(client.state.draftTarget?.workspace_id).toBe("work-1");
        const result = client.command("chat.send", {
            target: "",
            text: "local task",
        });
        expect(
            result.effects?.some((effect) => effect.kind === "socket.send"),
        ).toBe(true);
        expect(client.pending("ChatReq")).toBeGreaterThan(0);
    });
    it("binds the Agent transport to the identity confirmed by the host", () => {
        const client = new Client();
        client.connect();
        client.resource(
            "LoginRes",
            { ret: 1, identity: { username: "alice", user_id: "other" } },
            client.pending("LoginReq"),
        );
        expect(client.state.error).toContain("身份不匹配");
    });
});

describe("public protobuf protocol", () => {
    it("matches shared Lua/C envelope vectors and UTF-8 payloads", () => {
        expect(hash("skynet.agent.v1.LoginReq")).toBe(vectors.hashes.login_req);
        expect(hex(encodePacket("LoginReq", 1, { username: "alice" }))).toBe(
            vectors.frames.login_request,
        );
        expect(
            hex(
                encodePacket("ChatReq", 2, {
                    session_id: "session-1",
                    text: "你好",
                }),
            ),
        ).toBe(vectors.frames.chat_request);
        const login = decodePacket(frame(vectors.frames.login_success));
        expect(login.id).toBe(1);
        expect(login.body.identity).toEqual({
            username: "alice",
            user_id: "user-1",
        });
        for (const key of [
            "message_streaming",
            "message_completed",
            "message_cancelled",
            "message_failed",
        ])
            expect(decodePacket(frame(vectors.frames[key])).id).toBe(0);
    });
    it("rejects invalid direction, compression, sizes and request numbers", () => {
        expect(() => decodePacket(encodePacket("LoginReq", 1, {}))).toThrow(
            "方向",
        );
        expect(() => decodePacket(encodePacket("LoginRes", 0, {}))).toThrow(
            "方向",
        );
        const bytes = fromBase64(encodePacket("LoginRes", 1, {}));
        bytes[0] = 1;
        expect(() => decodePacket(toBase64(bytes))).toThrow("帧");
        expect(() => decodePacket("bad")).toThrow();
        expect(() => encodePacket("LoginReq", 0x1_0000_0000, {})).toThrow();
        expect(() =>
            encodePacket("ChatReq", 1, { text: "x".repeat(262_144) }),
        ).toThrow("256");
    });
});

describe("Agent actor", () => {
    it("buffers notifications arriving before login and preserves newer full snapshots", () => {
        const client = new Client();
        client.connect();
        const newer = session(3, 2);
        newer.session.messages[0].content = "已完成";
        client.resource("SessionUpdatedNtf", { chat_session: newer });
        client.restore([session(1)]);
        expect(client.state.sessions.s1.session.messages[0].content).toBe(
            "已完成",
        );
        client.resource("SessionUpdatedNtf", { chat_session: session(2) });
        expect(client.state.sessions.s1.session.revision).toBe(3);
    });
    it("repairs revision gaps and ignores duplicates, including pushes racing a snapshot", () => {
        const client = new Client();
        client.login([session()]);
        client.resource("MessageDeltaNtf", {
            session_id: "s1",
            run_id: "r1",
            message_id: "m1",
            delta: "丢失前缀",
            revision: 3,
        });
        expect(client.state.syncing).toBe(true);
        const id = client.pending("AgentSnapshotReq");
        const newer = session(4, 2);
        newer.session.messages[0].content = "完整文本";
        client.resource("SessionUpdatedNtf", { chat_session: newer });
        client.resource(
            "AgentSnapshotRes",
            { ret: 1, snapshot: client.snapshot([session(3)]) },
            id,
        );
        expect(client.state.syncing).toBe(false);
        expect(client.state.sessions.s1.session.revision).toBe(4);
        expect(client.state.sessions.s1.session.messages[0].content).toBe(
            "完整文本",
        );
        client.resource("MessageDeltaNtf", {
            session_id: "s1",
            run_id: "r1",
            message_id: "m1",
            delta: "重复",
            revision: 4,
        });
        expect(client.state.sessions.s1.session.messages[0].content).toBe(
            "完整文本",
        );
    });
    it("merges reasoning, tools and empty terminal reasoning blocks without changing answer text", () => {
        const client = new Client();
        client.login([session()]);
        client.resource("ReasoningDeltaNtf", {
            session_id: "s1",
            message_id: "m1",
            block: {
                id: "b1",
                run_id: "r1",
                text: "分析",
                status: "streaming",
            },
            revision: 2,
        });
        client.resource("ReasoningDeltaNtf", {
            session_id: "s1",
            message_id: "m1",
            block: { id: "b1", run_id: "r1", text: "", status: "completed" },
            revision: 3,
        });
        client.resource("ToolUpdatedNtf", {
            session_id: "s1",
            message_id: "m1",
            tool: {
                id: "t1",
                run_id: "r1",
                name: "read",
                output: "file",
                status: "completed",
                exit_code: 0,
            },
            revision: 4,
        });
        const message = client.state.sessions.s1.session.messages[0];
        expect(message.content).toBe("");
        expect(message.reasoning[0]).toMatchObject({
            text: "分析",
            status: "completed",
        });
        expect(message.tool_calls[0]).toMatchObject({
            output: "file",
            exit_code: 0,
        });
    });
    it("keeps draft and selection ownership when a new-session response arrives late", () => {
        const client = new Client();
        client.login([session(1, 2)]);
        client.command("draft.set", { target: "", text: "新任务" });
        client.command("chat.send", { target: "", text: "新任务" });
        const id = client.pending("ChatReq");
        client.command("session.select", { id: "s1" });
        client.command("draft.set", { target: "s1", text: "另一份草稿" });
        const created = session();
        created.session.id = "s2";
        client.resource("ChatRes", { ret: 1, chat_session: created }, id);
        expect(client.state.selectedId).toBe("s1");
        expect(client.state.drafts.s1).toBe("另一份草稿");
        expect(client.state.drafts[""]).toBe("");
    });
    it("moves a next-message draft into the server session after first-send acknowledgment", () => {
        const client = new Client();
        client.login();
        client.command("chat.send", { target: "", text: "第一条" });
        const id = client.pending("ChatReq");
        client.command("draft.set", { target: "", text: "准备的下一条" });
        client.resource("ChatRes", { ret: 1, chat_session: session() }, id);
        expect(client.state.selectedId).toBe("s1");
        expect(client.state.drafts.s1).toBe("准备的下一条");
        expect(client.state.drafts[""]).toBe("");
    });
    it("accepts background process tool updates after the model turn has completed", () => {
        const client = new Client();
        client.login([session(1, 2)]);
        client.resource("ToolUpdatedNtf", {
            session_id: "s1",
            message_id: "m1",
            revision: 2,
            tool: {
                id: "background",
                run_id: "r1",
                name: "exec_command",
                status: "completed",
                output: "后台结果",
            },
        });
        expect(client.state.syncing).toBe(false);
        expect(
            client.state.sessions.s1.session.messages[0].tool_calls[0].output,
        ).toBe("后台结果");
        expect(client.state.sessions.s1.session.revision).toBe(2);
    });
    it("does not mistake cancel acknowledgment for run completion or replay sends after restart", () => {
        const client = new Client();
        client.login([session()]);
        client.command("session.select", { id: "s1" });
        client.command("chat.cancel", { target: "s1", runId: "r1" });
        const cancelled = client.pending("MessageCancelReq");
        client.resource("MessageCancelRes", { ret: 1 }, cancelled);
        expect(client.state.sessions.s1.session.run_id).toBe("r1");
        client.resource("SessionUpdatedNtf", { chat_session: session(2, 3) });
        expect(client.state.sessions.s1.session.run_id).toBe("");
        client.command("session.new");
        client.command("chat.send", { target: "", text: "不能重放" });
        const resumed = startAgent(client.state);
        expect(resumed.state.notice).toContain("未确认");
        expect(resumed.state.drafts[""]).toBe("不能重放");
        expect(resumed.effects).toEqual([]);
        expect(resumed.state.connection.pending).toEqual({});
    });
    it("binds cancel and retry to the displayed run and preserves prepared input", () => {
        const client = new Client();
        client.login([session()]);
        client.command("session.select", { id: "s1" });
        client.command("chat.cancel", { target: "s1", runId: "expired" });
        expect(client.pending("MessageCancelReq")).toBeNaN();
        const failed = session(2, 4);
        failed.session.messages[0].error = {
            message: "temporary",
            retryable: true,
        };
        client.resource("SessionUpdatedNtf", { chat_session: failed });
        client.command("draft.set", { target: "s1", text: "下一条草稿" });
        client.command("chat.retry", { target: "s1", runId: "expired" });
        expect(client.pending("ChatReq")).toBeNaN();
        client.command("chat.retry", { target: "s1", runId: "r1" });
        const retried = session(3);
        retried.session.run_id = "r2";
        retried.session.messages[0].run_id = "r2";
        client.resource(
            "ChatRes",
            { ret: 1, chat_session: retried },
            client.pending("ChatReq"),
        );
        expect(client.state.sessions.s1.session.messages[0].id).toBe(
            failed.session.messages[0].id,
        );
        expect(client.state.sessions.s1.session.run_id).toBe("r2");
        expect(client.state.drafts.s1).toBe("下一条草稿");
    });
    it("bounds timeouts, rejects stale identities and never automatically replays chat", () => {
        const client = new Client();
        client.login();
        client.command("chat.send", { target: "", text: "hello" });
        const connection = { ...client.state.connection };
        for (let i = 0; i < 15; i++)
            client.effect(client.state.connection.clock);
        expect(client.state.connection.status).toBe("retrying");
        expect(client.state.notice).toContain("未确认");
        expect(client.state.drafts[""]).toBe("hello");
        const reconnect = client.state.connection.clock;
        client.command("$resource", {
            key: connection.key,
            connectionId: connection.id,
            data: encodePacket("ChatRes", 2, {
                ret: 1,
                chat_session: session(),
            }),
        });
        expect(client.state.sessions).toEqual({});
        const result = client.effect(reconnect);
        expect(
            result.effects?.some((effect) => effect.kind === "socket.send"),
        ).toBe(false);
    });
    it("rejects incomplete identities, stale send targets and invalid retry requests", () => {
        const client = new Client();
        const denied = client.command("$user", {
            url: `${origin}/agent`,
            username: "alice",
        });
        expect(denied.effects).toEqual([]);
        expect(client.state.error).toContain("登录信息");
        client.login([session(1, 2)]);
        client.command("chat.send", { target: "s1", text: "stale" });
        expect(client.state.error).toContain("切换");
        client.command("session.select", { id: "s1" });
        client.command("chat.retry");
        expect(client.state.error).toContain("重试");
    });
});
