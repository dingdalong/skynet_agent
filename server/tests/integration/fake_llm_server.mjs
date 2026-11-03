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
  writeEvent(response, {
    type: "response.output_text.delta",
    delta,
  });
}

function writeCompleted(response) {
  writeEvent(response, {
    type: "response.completed",
    response: {
      id: "response-e2e",
      status: "completed",
      output: [],
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

async function streamResponse(response, prompt, input) {
  if (prompt === "[e2e:header-stall]") return;
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  response.flushHeaders();

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
      cancelled_requests: cancelledRequests,
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
