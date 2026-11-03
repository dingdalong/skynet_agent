import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  cp,
  copyFile,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { skynet } from "../../../client/src/protocol/generated/agent_gateway.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "skynet-auto-hotfix-"));
const server = join(temporary, "server");
const proto = skynet.agent.v1;
const processes = [];
const sockets = [];
let serverLog = "";
let modelLog = "";

function start(command, args, options, capture) {
  const child = spawn(command, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
  });
  processes.push(child);
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("error", (error) => capture(String(error)));
  return child;
}

async function until(predicate, message) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(message);
}

function consoleCommand(command) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 18001 });
    let output = "";
    socket.setTimeout(5000, () => socket.destroy(new Error("控制台命令超时")));
    socket.setEncoding("utf8");
    socket.on("error", reject);
    socket.on("connect", () => socket.write(`${command}\n`));
    socket.on("data", (chunk) => {
      output += chunk;
      if (output.includes("<CMD Error>")) socket.destroy(new Error(output));
      else if (output.includes("<CMD OK>")) {
        socket.end();
        resolve(output);
      }
    });
    socket.on("end", () => {
      if (!output.includes("<CMD OK>")) reject(new Error(output));
    });
  });
}

function hashName(name) {
  let value = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(`skynet.agent.v1.${name}`)) {
    value = Math.imul(value ^ byte, 0x01000193) >>> 0;
  }
  return value;
}

function request(socket, id, name, args, predicate = () => true) {
  const responseName = name.replace(/Req$/, "Res");
  const response = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", onMessage);
      reject(new Error(`等待 ${responseName} 超时`));
    }, 5000);
    function onMessage(event) {
      const frame = new Uint8Array(event.data);
      const view = new DataView(frame.buffer);
      if (
        view.getUint32(1) !== id ||
        view.getUint32(5) !== hashName(responseName)
      )
        return;
      const value = proto[responseName].decode(frame.subarray(9));
      if (!predicate(value)) return;
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      resolve(value);
    }
    socket.addEventListener("message", onMessage);
  });
  const body = proto[name].encode(proto[name].create(args)).finish();
  const frame = new Uint8Array(9 + body.length);
  const view = new DataView(frame.buffer);
  view.setUint32(1, id);
  view.setUint32(5, hashName(name));
  frame.set(body, 9);
  socket.send(frame);
  return response;
}

async function connect() {
  const socket = new WebSocket("ws://127.0.0.1:18791/agent");
  sockets.push(socket);
  socket.binaryType = "arraybuffer";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("WebSocket 握手超时")),
      5000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
      { once: true },
    );
  });
  const login = await request(socket, 1, "LoginReq", {});
  assert.equal(login.ret, 1);
  return { socket, sessionId: login.snapshot.activeSessionId };
}

function completed(value) {
  return value.status === proto.MessageStatus.MESSAGE_STATUS_COMPLETED;
}

function marked(source, signature, marker) {
  assert.ok(source.includes(signature), `找不到测试修改入口 ${signature}`);
  return source.replace(
    signature,
    `${signature}\n    skynet.error("${marker}", skynet.address(skynet.self()))`,
  );
}

function markerAddresses(log, marker) {
  return new Set(
    [...log.matchAll(new RegExp(`${marker}\\s+(:[0-9a-f]+)`, "g"))].map(
      (match) => match[1],
    ),
  );
}

async function saveBatch(files, expectedResult = "已更新") {
  const offset = serverLog.length;
  await Promise.all(
    files.map(([path, content]) => writeFile(join(server, path), content)),
  );
  await until(
    () => /\[hotfix_watch\] reload /.test(serverLog.slice(offset)),
    "保存源码后未自动完成热修批次",
  );
  const batch = serverLog.slice(offset);
  const summaries = batch
    .split("\n")
    .filter((line) => line.includes("[hotfix_watch] reload "));
  assert.equal(summaries.length, 1, "每个批次只应输出一次节点结果");
  assert.ok(summaries[0].includes(expectedResult), summaries[0]);
  assert.doesNotMatch(batch, /\[hotfix\]/, "服务不应重复输出热修日志");
  return summaries[0];
}

function updatedFiles(summary) {
  return summary
    .match(/files=([^ ]*)/)[1]
    .split(",")
    .filter(Boolean);
}

try {
  await cp(join(root, "src"), join(server, "src"), { recursive: true });
  await cp(join(root, "etc"), join(server, "etc"), { recursive: true });
  await copyFile(
    join(root, "etc/cfg/channel/test.lua"),
    join(server, "etc/cfg/channel/develop.lua"),
  );
  await symlink(join(root, "3rd"), join(server, "3rd"));
  await symlink(join(root, "luaclib"), join(server, "luaclib"));
  await symlink(join(root, "../common"), join(temporary, "common"));
  start(
    process.execPath,
    [join(root, "tests/integration/fake_llm_server.mjs"), "--port=18792"],
    {},
    (chunk) => {
      modelLog += chunk;
    },
  );
  await until(() => modelLog.includes("listening"), "假模型未启动");
  const runtime = start(
    join(root, "3rd/skynet/skynet"),
    ["etc/config"],
    {
      cwd: server,
      env: {
        ...process.env,
        SKYNET_CFG_CHANNEL: "develop",
        DEEPSEEK_API_KEY: "e2e-test-key",
      },
    },
    (chunk) => {
      serverLog += chunk;
    },
  );
  await until(
    () => serverLog.includes("监听源码"),
    "develop 节点未建立监听基线",
  );
  // 每个 logind 持有独立的 client 轮询游标，需要两轮登录才能覆盖全部 client。
  const connections = [];
  for (let index = 0; index < 4; index++) connections.push(await connect());
  for (const { socket, sessionId } of connections) {
    const response = await request(
      socket,
      2,
      "MessageSendReq",
      { sessionId, text: "[e2e:history-set]" },
      completed,
    );
    assert.equal(response.message.content, "E2E 历史已保存");
  }

  const wsPath = "src/service/websocket/websocket.lua";
  const clientPath = "src/service/client/client.lua";
  const wsSource = await readFile(join(server, wsPath), "utf8");
  const clientSource = await readFile(join(server, clientPath), "utf8");
  const wsSignature =
    "function Websocket:_handle_message(connection, message, message_type)";
  const clientSignature =
    "function ClientService:handle_request(context, id, message_id, name, args)";
  const wsV2 = marked(wsSource, wsSignature, "AUTO_WS_V2");
  const clientV2 = marked(clientSource, clientSignature, "AUTO_CLIENT_V2");
  const batch = await saveBatch([
    [wsPath, wsV2],
    [clientPath, clientV2],
  ]);
  assert.deepEqual(updatedFiles(batch), [clientPath, wsPath]);

  for (const { socket, sessionId } of connections) {
    const selected = await request(socket, 3, "SessionSelectReq", {
      sessionId,
    });
    assert.equal(selected.ret, 1);
    assert.equal(selected.messages.length, 2);
    assert.equal(selected.messages[1].content, "E2E 历史已保存");
    const response = await request(
      socket,
      4,
      "MessageSendReq",
      { sessionId, text: "[e2e:history-check]" },
      completed,
    );
    assert.equal(response.message.content, "E2E 历史通过");
  }
  await until(
    () =>
      markerAddresses(serverLog, "AUTO_WS_V2").size === 2 &&
      markerAddresses(serverLog, "AUTO_CLIENT_V2").size === 2,
    "存量连接未覆盖两个 WebSocket/client 实例",
  );

  // client 与 websocket 位于不同 VM，语法错误必须在通知任意 VM 之前阻止整个批次。
  const protocolPath = "src/lualib/network/protocol.lua";
  const protocolSource = await readFile(join(server, protocolPath), "utf8");
  const protocolV2 =
    'local skynet = require("skynet")\n' +
    marked(protocolSource, "function M:decode_msg(data)", "AUTO_PROTOCOL_V2");
  const clientV3 = marked(clientSource, clientSignature, "AUTO_CLIENT_V3");
  const failed = await saveBatch(
    [
      [wsPath, `${wsV2}\nsyntax error\n`],
      [clientPath, clientV3],
      [protocolPath, protocolV2],
    ],
    "预检查失败",
  );
  assert.ok(failed.includes(wsPath));
  const failedOffset = serverLog.length;
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 5, "SessionSelectReq", { sessionId })).ret,
      1,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(failedOffset), "AUTO_WS_V2").size === 2 &&
      markerAddresses(serverLog.slice(failedOffset), "AUTO_CLIENT_V2").size ===
        2,
    "失败批次后存量连接未继续调用旧实现",
  );
  assert.doesNotMatch(
    serverLog.slice(failedOffset),
    /AUTO_PROTOCOL_V2|AUTO_CLIENT_V3/,
  );
  const recovered = await saveBatch([
    [wsPath, marked(wsSource, wsSignature, "AUTO_WS_V3")],
  ]);
  assert.deepEqual(updatedFiles(recovered), [protocolPath, clientPath, wsPath]);
  const recoveredOffset = serverLog.length;
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 6, "SessionSelectReq", { sessionId })).messages
        .length,
      4,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(recoveredOffset), "AUTO_WS_V3").size ===
        2 &&
      markerAddresses(serverLog.slice(recoveredOffset), "AUTO_PROTOCOL_V2")
        .size === 2 &&
      markerAddresses(serverLog.slice(recoveredOffset), "AUTO_CLIENT_V3")
        .size === 2,
    "修正源码后未重试失败实例的完整批次",
  );

  // 编译通过后，模块执行仍可能失败；VM 内整批校验继续保证旧方法可用。
  const wsV4 = marked(wsSource, wsSignature, "AUTO_WS_V4");
  const protocolV3 = protocolV2.replaceAll(
    "AUTO_PROTOCOL_V2",
    "AUTO_PROTOCOL_V3",
  );
  const executionFailure = await saveBatch(
    [
      [
        wsPath,
        wsV4.replace(
          "return Websocket",
          'error("AUTO_WS_CANDIDATE_ERROR")\nreturn Websocket',
        ),
      ],
      [protocolPath, protocolV3],
    ],
    "热修失败",
  );
  assert.match(executionFailure, /\.websocket_1:.*AUTO_WS_CANDIDATE_ERROR/);
  assert.match(executionFailure, /\.websocket_2:.*AUTO_WS_CANDIDATE_ERROR/);
  const executionOffset = serverLog.length;
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 7, "SessionSelectReq", { sessionId })).ret,
      1,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(executionOffset), "AUTO_WS_V3").size ===
      2,
    "模块执行失败后未保留旧 WebSocket 方法",
  );
  assert.doesNotMatch(
    serverLog.slice(executionOffset),
    /AUTO_WS_V4|AUTO_PROTOCOL_V3/,
  );
  const executionRecovered = await saveBatch([[wsPath, wsV4]]);
  assert.deepEqual(updatedFiles(executionRecovered), [protocolPath, wsPath]);
  const executionRecoveredOffset = serverLog.length;
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 8, "SessionSelectReq", { sessionId })).ret,
      1,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(executionRecoveredOffset), "AUTO_WS_V4")
        .size === 2 &&
      markerAddresses(
        serverLog.slice(executionRecoveredOffset),
        "AUTO_PROTOCOL_V3",
      ).size === 2,
    "模块执行错误修正后未恢复整个失败批次",
  );

  const nodePath = "src/lualib/base/node.lua";
  const rpcPath = "src/lualib/base/rpc.lua";
  const nodeSource = await readFile(join(server, nodePath), "utf8");
  const rpcSource = await readFile(join(server, rpcPath), "utf8");
  const rpcV2 = marked(
    rpcSource,
    "function Rpc.send(address, command, ...)",
    "AUTO_RPC_V2",
  );
  const clientV4 = marked(clientSource, clientSignature, "AUTO_CLIENT_V4");
  const incompatible = await saveBatch(
    [
      [rpcPath, rpcV2],
      [
        clientPath,
        clientV4.replace(
          "return ClientService",
          'ClientService.commands.extra = "extra"\nreturn ClientService',
        ),
      ],
    ],
    "部分更新",
  );
  assert.deepEqual(updatedFiles(incompatible), [rpcPath]);
  assert.match(incompatible, /\.client_1:.*不能新增字段/);
  assert.match(incompatible, /\.client_2:.*不能新增字段/);
  const incompatibleOffset = serverLog.length;
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 9, "SessionSelectReq", { sessionId })).ret,
      1,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(incompatibleOffset), "AUTO_CLIENT_V3")
        .size === 2 &&
      markerAddresses(serverLog.slice(incompatibleOffset), "AUTO_RPC_V2")
        .size === 2,
    "部分失败时未正确保留失败实例并更新其它实例",
  );
  assert.doesNotMatch(serverLog.slice(incompatibleOffset), /AUTO_CLIENT_V4/);
  const compatible = await saveBatch([[clientPath, clientV4]]);
  assert.deepEqual(updatedFiles(compatible), [rpcPath, clientPath]);
  const compatibleOffset = serverLog.length;
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 10, "SessionSelectReq", { sessionId })).ret,
      1,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(compatibleOffset), "AUTO_CLIENT_V4")
        .size === 2 &&
      markerAddresses(serverLog.slice(compatibleOffset), "AUTO_RPC_V2").size ===
        4,
    "兼容性错误修正后未重试失败实例的完整批次",
  );

  const shared = await saveBatch([
    [nodePath, marked(nodeSource, "function Node:status()", "AUTO_NODE_V2")],
    [
      rpcPath,
      marked(
        rpcSource,
        "function Rpc.send(address, command, ...)",
        "AUTO_RPC_V3",
      ),
    ],
  ]);
  assert.deepEqual(updatedFiles(shared), [nodePath, rpcPath]);
  const sharedOffset = serverLog.length;
  assert.match(
    await consoleCommand('call .main "status"'),
    /\.gateway .*ready/,
  );
  for (const { socket, sessionId } of connections) {
    assert.equal(
      (await request(socket, 11, "SessionSelectReq", { sessionId })).ret,
      1,
    );
  }
  await until(
    () =>
      markerAddresses(serverLog.slice(sharedOffset), "AUTO_NODE_V2").size ===
        1 &&
      markerAddresses(serverLog.slice(sharedOffset), "AUTO_RPC_V3").size === 4,
    "主节点和共享基础模块未自动更新",
  );

  const closing = connections.map(
    ({ socket }) =>
      new Promise((resolve) => {
        socket.addEventListener("close", (event) => resolve(event.code), {
          once: true,
        });
      }),
  );
  const exited = once(runtime, "exit");
  await consoleCommand('call .main "shutdown"');
  await until(() => runtime.exitCode !== null, "正常关服未结束测试进程");
  assert.deepEqual(
    await Promise.all(closing),
    connections.map(() => 1001),
  );
  const [code, signal] = await exited;
  assert.equal(code, 0);
  assert.equal(signal, null);
  console.log(
    "auto hotfix smoke passed: 统一预检查、单次文件日志、全部实例、存量历史、失败恢复、正常关服",
  );
} catch (error) {
  console.error(serverLog);
  console.error(modelLog);
  throw error;
} finally {
  for (const socket of sockets) socket.close();
  for (const child of processes.reverse()) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null)
      continue;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 3000);
    await exited;
    clearTimeout(timeout);
  }
  await rm(temporary, { recursive: true, force: true });
}
