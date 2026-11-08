import { createServer } from "node:http";

const portArgument = process.argv.find((argument) =>
  argument.startsWith("--port="),
);
const port = Number(
  process.env.FAKE_LLM_PORT ?? portArgument?.slice("--port=".length) ?? 18792,
);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("假模型端口必须是 1 到 65535 的整数");
}

let requestCount = 0;
let activeRequests = 0;
let cancelledRequests = 0;
let permissionRequests = 0;
const failedToolResponses = new Set();

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error("请求体超过 1 MiB");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeEvent(response, event) {
  if (response.destroyed || response.writableEnded) {
    return;
  }
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function writeDelta(response, delta) {
  response.answer = (response.answer ?? "") + delta;
  writeEvent(response, {
    type: "response.output_text.delta",
    delta,
  });
}

function writeReasoning(response, text) {
  response.reasoningItem = { id: `reasoning-${requestCount}`, type: "reasoning",
    content: [{ type: "reasoning_text", text }], summary: [] };
  writeEvent(response, { type: "response.reasoning_text.delta", output_index: 0, content_index: 0, delta: text.slice(0, 4) });
  writeEvent(response, { type: "response.reasoning_text.delta", output_index: 0, content_index: 0, delta: text.slice(4) });
  writeEvent(response, { type: "response.reasoning_text.done", output_index: 0, content_index: 0, text });
}

function writeCompleted(response) {
  writeEvent(response, {
    type: "response.completed",
    response: {
      id: "response-e2e",
      status: "completed",
      model: response.model,
      usage: { input_tokens: 2048, input_tokens_details: { cached_tokens: 1024 }, output_tokens: 20 },
      output: response.reasoningItem ? [response.reasoningItem, { type: "message", role: "assistant", content: [{ type: "output_text", text: response.answer ?? "" }] }] : [],
    },
  });
  response.end();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function userText(message) {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) return message.content.map(part => part.text ?? "").join("");
  return "";
}

function lastUserInput(input) {
  for (let index = input.length - 1; index >= 0; index -= 1) {
    if (input[index]?.role === "user") {
      return userText(input[index]);
    }
  }
  return "";
}

function hasConversationHistory(input) {
  const messages = input.map((message) => ({
    role: message.role,
    content: userText(message),
  }));
  return (
    messages.some((message) => message.role === "system") &&
    messages.some(
      (message) =>
        message.role === "user" && message.content === "[e2e:history-set]",
    ) &&
    messages.some(
      (message) =>
        message.role === "assistant" && message.content === "E2E 历史已保存",
    )
  );
}

function toolCall(response, name, args) {
  const outputIndex = response.reasoningItem ? 1 : 0;
  const item = { type: "function_call", name, arguments: JSON.stringify(args),
    call_id: `tool-${requestCount}`, id: `item-${requestCount}`, status: "completed" };
  writeEvent(response, { type: "response.output_item.added", output_index: outputIndex,
    item: { ...item, arguments: "", status: "in_progress" } });
  const middle = Math.floor(item.arguments.length / 2);
  for (const delta of [item.arguments.slice(0, middle), item.arguments.slice(middle)])
    writeEvent(response, { type: "response.function_call_arguments.delta", output_index: outputIndex, delta });
  writeEvent(response, { type: "response.output_item.done", output_index: outputIndex, item });
  writeEvent(response, { type: "response.completed", response: { id: `response-${requestCount}`,
    status: "completed", output: [...(response.reasoningItem ? [response.reasoningItem] : []), item], model: response.model, usage: { input_tokens: 2048, input_tokens_details: { cached_tokens: 1024 }, output_tokens: 20 } } });
  response.end();
}

function toolScenario(response, prompt, input) {
  if (String(input[0]?.content).startsWith("你是独立权限判断器")) {
    permissionRequests++;
    const argumentsMarker = "\n原始参数:\n";
    const args = JSON.parse(prompt.slice(prompt.lastIndexOf(argumentsMarker) + argumentsMarker.length));
    writeReasoning(response, "权限思考：根据真实用户目标核对动作及工作区范围。");
    if (args.cmd?.includes("permission-timeout")) return true;
    if (args.cmd?.includes("permission-invalid")) {
      writeDelta(response, "invalid permission result"); writeCompleted(response); return true;
    }
    const deny = args.cmd?.includes("permission-deny");
    writeDelta(response, JSON.stringify({ decision: deny ? "deny" : "allow",
      reason: deny ? "E2E 权限拒绝" : "E2E 操作符合用户目标" }));
    writeCompleted(response);
    return true;
  }
  const scenarios = ["tools", "denied", "rules-denied", "outside", "pty", "tool-slow", "tool-retry", "sandbox-denied", "network", "permission-timeout", "permission-invalid", "env", "terminal-open", "terminal-input", "reasoning", "unlimited", "model-switch"];
  if (!scenarios.some((name) => prompt === `[e2e:${name}]`)) return false;
  const userIndex = input.findLastIndex((item) => item.role === "user");
  const outputs = input.slice(userIndex + 1).filter((item) => item.type === "function_call_output");
  const results = outputs.map((item) => JSON.parse(item.output));
  let steps;
  if (prompt === "[e2e:unlimited]") steps = Array.from({length:40}, (_, index) => ["exec_command", {cmd:`printf '${index+1}\\n' >> steps.txt`}]);
  else if (prompt === "[e2e:reasoning]" || prompt === "[e2e:model-switch]") steps = [["exec_command", { cmd: "printf reasoning-ok" }]];
  else if (prompt === "[e2e:tools]") steps = [
    ["apply_patch", { patch: "*** Begin Patch\n*** Add File: hello.txt\n+工具调用成功\n*** End Patch\n" }],
    ["exec_command", { cmd: "cat hello.txt" }],
    ["apply_patch", { patch: "*** Begin Patch\n*** Update File: hello.txt\n*** Move to: result.txt\n@@\n-工具调用成功\n+补丁移动成功\n*** End Patch\n" }],
    ["exec_command", { cmd: "cat result.txt" }],
  ];
  else if (prompt === "[e2e:pty]") steps = [
    ["exec_command", { cmd: 'read -r value; printf "got:%s\\n" "$value"', tty: true, yield_time_ms: 100 }],
    ["write_stdin", { session_id: results[0]?.session_id, chars: "终端输入\n", yield_time_ms: 1000 }],
  ];
  else if (prompt === "[e2e:terminal-open]") steps = [
    ["exec_command", { cmd: 'read -r value; printf "got:%s\\n" "$value"', tty: true, yield_time_ms: 100 }],
  ];
  else if (prompt === "[e2e:terminal-input]") {
    const previous = input.slice(0, userIndex).filter((item) => item.type === "function_call_output")
      .map((item) => JSON.parse(item.output)).findLast((result) => result.session_id);
    steps = [["write_stdin", { session_id: previous?.session_id, chars: "跨轮次输入\n", yield_time_ms: 1000 }]];
  }
  else if (prompt === "[e2e:outside]") steps = [["exec_command", { cmd: "printf outside",
    sandbox_permissions: "require_escalated", justification: "验证用户要求的沙盒外执行能力" }]];
  else if (prompt === "[e2e:denied]") steps = [["exec_command", { cmd: "printf never # permission-deny" }]];
  else if (prompt === "[e2e:rules-denied]") steps = [["exec_command", { cmd: "reboot now" }]];
  else if (prompt === "[e2e:tool-slow]") steps = [["exec_command", { cmd: "printf tool-started; sleep 20; printf tool-finished" }]];
  else if (prompt === "[e2e:tool-retry]") steps = [["exec_command", { cmd: "printf x >> once.txt; cat once.txt" }]];
  else if (prompt === "[e2e:permission-timeout]") steps = [["exec_command", { cmd: "printf never # permission-timeout" }]];
  else if (prompt === "[e2e:permission-invalid]") steps = [["exec_command", { cmd: "printf never # permission-invalid" }]];
  else if (prompt === "[e2e:env]") steps = [["exec_command", { cmd: 'test -z "$DEEPSEEK_API_KEY" && printf env-clean' }]];
  else if (prompt === "[e2e:network]") steps = [["exec_command", { cmd: `curl -fsS http://127.0.0.1:${port}/health` }]];
  else steps = [["exec_command", { cmd: "printf forbidden > ../outside.txt" }]];
  if (outputs.length < steps.length) { toolCall(response, ...steps[outputs.length]); return true; }
  let text;
  if (prompt === "[e2e:denied]") text = results[0]?.error === "E2E 权限拒绝" ? "E2E 权限阻止成功" : "E2E 权限失败";
  else if (prompt === "[e2e:rules-denied]") text = results[0]?.error?.includes("禁止命令规则") ? "E2E 规则阻止成功" : "E2E 规则失败";
  else if (prompt === "[e2e:permission-timeout]" || prompt === "[e2e:permission-invalid]")
    text = results[0]?.error?.includes("权限模型") ? `E2E ${prompt.slice(5, -1)}通过` : "E2E 权限失败";
  else if (prompt === "[e2e:sandbox-denied]") text = results[0]?.exit_code !== 0 ? "E2E 沙盒阻止成功" : "E2E 沙盒失败";
  else if (prompt === "[e2e:tool-retry]" && !failedToolResponses.has(outputs[0].call_id)) {
    failedToolResponses.add(outputs[0].call_id);
    writeEvent(response, { type: "response.failed", response: { error: { message: "工具后的模型故障" } } });
    response.end(); return true;
  } else {
    const passed = results.every((result) => result.ok !== false && (!('exit_code' in result) || result.exit_code === 0));
    const correct = (prompt !== "[e2e:tool-retry]" || results[0]?.output === "x")
      && (prompt !== "[e2e:env]" || results[0]?.output === "env-clean")
      && (prompt !== "[e2e:terminal-input]" || results[0]?.output?.includes("got:跨轮次输入"));
    text = passed && correct ? `E2E ${prompt.slice(5, -1)}通过` : `E2E 工具失败 ${JSON.stringify(results)}`;
  }
  writeDelta(response, text); writeCompleted(response); return true;
}

async function streamResponse(response, prompt, input) {
  if (prompt === "[e2e:header-stall]") return;
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  response.flushHeaders();
  if (String(input[0]?.content).startsWith("你是独立权限判断器")) {
    if (toolScenario(response, prompt, input)) return;
  }
  if (["[e2e:reasoning]", "[e2e:model-switch]", "[e2e:unlimited]"].includes(prompt)) {
    writeReasoning(response, "主模型思考：逐步执行任务，核验工具真实返回值。");
    if (prompt === "[e2e:model-switch]") await delay(800);
  }
  if (toolScenario(response, prompt, input)) return;

  if (prompt === "[e2e:error]") {
    writeEvent(response, {
      type: "response.failed",
      response: {
        status: "failed",
        error: {
          message: "E2E 假模型失败",
        },
      },
    });
    response.end();
    return;
  }

  if (prompt === "[e2e:stall]") {
    writeDelta(response, "E2E 等待");
    return;
  }

  if (prompt === "[e2e:slow]") {
    writeDelta(response, "E2E ");
    await delay(500);
    writeDelta(response, "慢速完成");
    await delay(200);
    writeCompleted(response);
    return;
  }

  let answer = "E2E 成功";
  if (prompt === "[e2e:history-set]") {
    answer = "E2E 历史已保存";
  } else if (prompt === "[e2e:history-check]") {
    answer = hasConversationHistory(input) ? "E2E 历史通过" : "E2E 历史缺失";
  }

  writeDelta(response, answer.slice(0, 4));
  await delay(20);
  writeDelta(response, answer.slice(4));
  await delay(20);
  writeCompleted(response);
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, {
      status: "ok",
      requests: requestCount,
      active_requests: activeRequests,
      cancelled_requests: cancelledRequests, permissionRequests,
    });
    return;
  }
  if (request.method !== "POST" || request.url !== "/responses") {
    sendJson(response, 404, {
      error: "not found",
    });
    return;
  }
  if (!request.headers.authorization) {
    sendJson(response, 401, {
      error: {
        message: "缺少 Authorization",
      },
    });
    return;
  }

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    sendJson(response, 400, {
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return;
  }
  if (payload.stream !== true || !Array.isArray(payload.input)) {
    sendJson(response, 400, {
      error: {
        message: "仅支持 Responses 流式请求",
      },
    });
    return;
  }

  requestCount += 1;
  activeRequests += 1;
  response.once("close", () => {
    activeRequests -= 1;
    if (!response.writableEnded) cancelledRequests += 1;
  });
  const prompt = lastUserInput(payload.input);
  console.log(`[fake-llm] request=${requestCount} prompt=${prompt}`);
  response.model = payload.model;
  await streamResponse(response, prompt, payload.input);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[fake-llm] listening http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
