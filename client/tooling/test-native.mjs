import { WebSocketServer } from "ws";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";

const clientRoot = fileURLToPath(new URL("../", import.meta.url));
const schema = new protobuf.Root();
await schema.load(
    ["login.proto", "agent_session.proto"].map(
        (file) => `${clientRoot}../common/proto/${file}`,
    ),
    { keepCase: true },
);
const messageHash = (name) => {
    let hash = 0x811c9dc5;
    for (const value of `skynet.agent.v1.${name}`)
        hash = Math.imul(hash ^ value.charCodeAt(0), 0x1000193) >>> 0;
    return hash;
};
const names = ["LoginReq", "AgentSnapshotReq", "ChatReq", "SessionModelSetReq"];
const send = (socket, name, id, body) => {
    const type = schema.lookupType(`skynet.agent.v1.${name}`);
    const payload = type.encode(type.create(body)).finish();
    const packet = Buffer.alloc(payload.length + 9);
    packet.writeUInt32BE(id, 1);
    packet.writeUInt32BE(messageHash(name), 5);
    packet.set(payload, 9);
    socket.send(packet);
};

const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
});
server.on("connection", (socket) => {
    const id = randomUUID();
    const snapshot = {
        username: "native-agent",
        user_id: "native",
        models: [
            { id: "fixture", name: "Fixture", model: "fixture" },
            { id: "fixture2", name: "Fixture 2", model: "fixture2" },
        ],
        default_model_id: "fixture",
        chat_sessions: [],
    };
    socket.on("message", (data, binary) => {
        if (!binary) {
            socket.send(id);
            return;
        }
        const name =
            data.length >= 9 &&
            names.find((name) => data.readUInt32BE(5) === messageHash(name));
        if (!name) {
            socket.send(data);
            return;
        }
        const requestId = data.readUInt32BE(1);
        const request = schema
            .lookupType(`skynet.agent.v1.${name}`)
            .decode(data.subarray(9));
        if (name === "LoginReq") {
            snapshot.username = request.username;
            send(socket, "LoginRes", requestId, {
                ret: 1,
                identity: {
                    username: request.username,
                    user_id: snapshot.user_id,
                },
            });
            return;
        }
        if (name === "SessionModelSetReq") {
            const session = snapshot.chat_sessions[0];
            session.model_id = request.model_id;
            session.session.revision++;
            send(socket, "SessionUpdatedNtf", 0, { chat_session: session });
            send(socket, "SessionModelSetRes", requestId, {
                ret: 1,
                chat_session: session,
            });
            return;
        }
        if (name !== "ChatReq") {
            send(socket, name.replace("Req", "Res"), requestId, {
                ret: 1,
                snapshot,
            });
            return;
        }
        const message = {
            id: "assistant",
            role: 2,
            content: "",
            status: 1,
            run_id: "run",
            created_at: 1,
            reasoning: [],
            tool_calls: [],
        };
        const session = {
            session: {
                id: "session",
                title: "Native Agent",
                revision: 1,
                updated_at: 1,
                run_id: "run",
                messages:
                    snapshot.username === "webkit-agent"
                        ? [
                              {
                                  id: "user-previous",
                                  role: 1,
                                  content: "之前的用户消息",
                                  status: 2,
                              },
                              {
                                  id: "answer-previous",
                                  role: 2,
                                  content: "历史回答。\n\n".repeat(60),
                                  status: 2,
                              },
                              {
                                  id: "user-current",
                                  role: 1,
                                  content: "当前用户消息",
                                  status: 2,
                              },
                              message,
                          ]
                        : [message],
            },
            model_id: "fixture",
        };
        snapshot.chat_sessions = [session];
        const accepted = structuredClone(session);
        send(socket, "SessionUpdatedNtf", 0, { chat_session: session });
        const webkit = snapshot.username === "webkit-agent";
        const reasoning = {
            id: "plan",
            run_id: "run",
            status: "streaming",
            text: "",
        };
        const permission = { ...reasoning, id: "check-directory" };
        const tool = {
            id: "background",
            name: "exec_command",
            arguments: JSON.stringify({ cmd: "pwd" }),
            status: "judging",
            run_id: "run",
            output: "",
            working_directory: "/workspace",
            reasoning: [],
        };
        function updateTool() {
            message.tool_calls = [tool];
            send(socket, "ToolUpdatedNtf", 0, {
                session_id: "session",
                message_id: "assistant",
                revision: ++session.session.revision,
                tool,
            });
        }
        function reasoningDelta(block, text, toolId) {
            block.text += text;
            send(socket, "ReasoningDeltaNtf", 0, {
                session_id: "session",
                message_id: "assistant",
                tool_call_id: toolId,
                block: { ...block, text },
                revision: ++session.session.revision,
            });
        }
        if (webkit) {
            message.reasoning.push(reasoning);
            reasoningDelta(reasoning, "先检查");
            reasoningDelta(reasoning, "会话目录。");
            updateTool();
            tool.reasoning.push(permission);
            reasoningDelta(permission, "确认当前工作目录。", tool.id);
        }
        send(socket, "MessageDeltaNtf", 0, {
            session_id: "session",
            message_id: "assistant",
            run_id: "run",
            delta: "binary✓",
            revision: ++session.session.revision,
        });
        send(socket, "ChatRes", requestId, { ret: 1, chat_session: accepted });
        message.content =
            snapshot.username === "webkit-agent"
                ? "binary✓\n\n" +
                  "历史内容，用于验证模型切换时保留阅读位置。\n\n".repeat(70)
                : "binary✓";
        setTimeout(
            () => {
                if (socket.readyState !== socket.OPEN) return;
                if (webkit) {
                    reasoning.status = "completed";
                    reasoningDelta(reasoning, "");
                    permission.status = "completed";
                    reasoningDelta(permission, "", tool.id);
                }
                message.status = 2;
                session.session.run_id = "";
                session.session.revision++;
                send(socket, "SessionUpdatedNtf", 0, { chat_session: session });
                tool.status = "completed";
                tool.output = "background✓";
                updateTool();
            },
            webkit ? 1600 : 600,
        );
    });
});
const address = server.address();
const temporary = await mkdtemp(`${tmpdir()}/skynet-agent-fixture-`);
const agentRuntime = `${temporary}/runtime.js`;
await build({
    stdin: {
        contents: `
            import {initialAgentState, startAgent, reduceAgent} from ${JSON.stringify(`${clientRoot}packages/agent-client/src/index.ts`)};
            export default {
                initialState: initialAgentState, start: startAgent,
                reduce(state, command) { return reduceAgent(state, command, ["ws://127.0.0.1:${address.port}"]); }
            };
        `,
        resolveDir: clientRoot,
    },
    bundle: true,
    platform: "neutral",
    format: "iife",
    globalName: "SkynetRuntime",
    outfile: agentRuntime,
    target: "es2020",
    inject: [`${clientRoot}packages/app-runtime/src/text-codec.ts`],
    footer: { js: "globalThis.SkynetApp = SkynetRuntime.default;" },
});
const child = spawn("swift", ["test", ...process.argv.slice(2)], {
    env: {
        ...process.env,
        SKYNET_TEST_SOCKET: `ws://127.0.0.1:${address.port}`,
        SKYNET_TEST_AGENT_RUNTIME: agentRuntime,
    },
    stdio: "inherit",
});
const code = await new Promise((resolve, reject) => {
    child.once("exit", resolve);
    child.once("error", reject);
});
for (const client of server.clients) client.terminate();
await new Promise((resolve) => server.close(resolve));
await rm(temporary, { recursive: true, force: true });
process.exit(code ?? 1);
