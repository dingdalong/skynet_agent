import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { skynet } from "../../../client/src/protocol/generated/agent_gateway.js";

const run = promisify(execFile);
const control = fileURLToPath(new URL("../../control.sh", import.meta.url));
const pid = Number(process.env.AGENT_SERVER_PID);
assert.ok(Number.isInteger(pid) && pid > 0, "测试必须持有启动的 Skynet 进程");

const { stdout } = await run(control, ["status", "18001"], { timeout: 5000 });
for (const name of [
  "client_1",
  "client_2",
  "logind_1",
  "logind_2",
  "websocket_1",
  "websocket_2",
  "gateway",
]) {
  assert.match(stdout, new RegExp(`\\.${name} :[0-9a-f]+ ready`));
}
assert.match(stdout, /<CMD OK>/);

const proto = skynet.agent.v1;
const url = process.env.AGENT_WS_URL;
const healthUrl = `${process.env.AGENT_FAKE_LLM_URL}/health`;

function hashName(name) {
  let value = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(`skynet.agent.v1.${name}`)) {
    value = Math.imul(value ^ byte, 0x01000193) >>> 0;
  }
  return value;
}

function send(socket, id, name, args) {
  const body = proto[name].encode(proto[name].create(args)).finish();
  const frame = new Uint8Array(9 + body.length);
  const view = new DataView(frame.buffer);
  view.setUint32(1, id);
  view.setUint32(5, hashName(name));
  frame.set(body, 9);
  socket.send(frame);
}

function waitFrame(socket, id, name, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", onMessage);
      reject(new Error(`等待 ${name} 超时`));
    }, 5000);
    function onMessage(event) {
      const frame = new Uint8Array(event.data);
      const view = new DataView(frame.buffer);
      if (view.getUint32(1) !== id || view.getUint32(5) !== hashName(name))
        return;
      const value = proto[name].decode(frame.subarray(9));
      if (!predicate(value)) return;
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      resolve(value);
    }
    socket.addEventListener("message", onMessage);
  });
}

function runConsole(command) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 18001 });
    let output = "";
    socket.setTimeout(5000, () => socket.destroy(new Error("控制台命令超时")));
    socket.setEncoding("utf8");
    socket.on("error", reject);
    socket.on("connect", () => socket.write(`${command}\n`));
    socket.on("data", (chunk) => {
      output += chunk;
      if (output.includes("<CMD Error>")) {
        socket.destroy(new Error(output));
      } else if (output.includes("<CMD OK>")) {
        socket.end();
        resolve(output);
      }
    });
    socket.on("end", () => {
      if (!output.includes("<CMD OK>")) reject(new Error(output));
    });
  });
}

async function connect() {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return socket;
}

async function startGeneration(prompt) {
  const socket = await connect();
  const login = waitFrame(socket, 1, "LoginRes");
  send(socket, 1, "LoginReq", { username: "control-header" });
  const response = await login;
  assert.equal(response.ret, 1);
  send(socket, 2, "MessageSendReq", {
    sessionId: response.snapshot.sessions[0].id,
    text: prompt,
  });
  return socket;
}

const idle = await connect();
const streaming = await connect();
const login = waitFrame(streaming, 1, "LoginRes");
send(streaming, 1, "LoginReq", { username: "control-stream" });
const loginResponse = await login;
assert.equal(loginResponse.ret, 1);
const sessionId = loginResponse.snapshot.sessions[0].id;
const savedReply = waitFrame(streaming, 0, "SessionUpdatedNtf", (value) =>
  !value.session.runId && value.session.messages.at(-1)?.status === proto.MessageStatus.MESSAGE_STATUS_COMPLETED,
);
send(streaming, 2, "MessageSendReq", {
  sessionId,
  text: "[e2e:history-set]",
});
assert.equal((await savedReply).session.messages.at(-1).content, "E2E 历史已保存");
const hotfixScript = fileURLToPath(
  new URL("../fixtures/hotfix/client_runtime.lua", import.meta.url),
);
assert.match(
  await runConsole(`inject .main ${hotfixScript}`),
  /CLIENT_HOTFIX_OK/,
);
const selection = waitFrame(streaming, 3, "UserSnapshotRes");
send(streaming, 3, "UserSnapshotReq", { sessionId });
const selected = await selection;
assert.equal(selected.ret, 1);
assert.equal(selected.snapshot.sessions[0].messages.length, 2);
assert.equal(selected.snapshot.sessions[0].messages[1].content, "E2E 历史已保存");
const historyReply = waitFrame(streaming, 0, "SessionUpdatedNtf", (value) =>
  !value.session.runId && value.session.messages.at(-1)?.status === proto.MessageStatus.MESSAGE_STATUS_COMPLETED,
);
send(streaming, 4, "MessageSendReq", {
  sessionId,
  text: "[e2e:history-check]",
});
assert.equal((await historyReply).session.messages.at(-1).content, "E2E 历史通过");
const delta = waitFrame(streaming, 0, "MessageDeltaNtf", (value) =>
  Boolean(value.delta),
);
send(streaming, 5, "MessageSendReq", {
  sessionId,
  text: "[e2e:stall]",
});
await delta;
const headerWaiting = await startGeneration("[e2e:header-stall]");
let active = 0;
for (let attempt = 0; attempt < 100; attempt++) {
  active = (await (await fetch(healthUrl)).json()).active_requests;
  if (active === 2) break;
  await delay(10);
}
assert.equal(active, 2, "关服前必须已有流读取和响应头等待中的真实模型请求");
const closing = [idle, streaming, headerWaiting].map(
  (socket) =>
    new Promise((resolve) => {
      socket.addEventListener("close", (event) => resolve(event.code), {
        once: true,
      });
    }),
);
await run(control, ["stop", "18001"], { timeout: 15000 });
assert.deepEqual(await Promise.all(closing), [1001, 1001, 1001]);
let stopped = false;
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
    stopped = true;
    break;
  }
  await delay(100);
}
assert.ok(stopped, "关闭命令应回收全部服务并退出 Skynet 进程");
const health = await (await fetch(healthUrl)).json();
assert.equal(health.active_requests, 0, "退出前必须释放上游模型连接");
assert.equal(health.cancelled_requests, 2, "两个未完成请求都应关闭连接");
console.log("service control smoke passed");
