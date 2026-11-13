import { WebSocketServer } from "ws";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
});
server.on("connection", (socket) => {
    const id = randomUUID();
    socket.on("message", () => socket.send(id));
});
const address = server.address();
const child = spawn("swift", ["test", ...process.argv.slice(2)], {
    env: {
        ...process.env,
        SKYNET_TEST_SOCKET: `ws://127.0.0.1:${address.port}`,
    },
    stdio: "inherit",
});
const code = await new Promise((resolve, reject) => {
    child.once("exit", resolve);
    child.once("error", reject);
});
for (const client of server.clients) client.terminate();
await new Promise((resolve) => server.close(resolve));
process.exit(code ?? 1);
