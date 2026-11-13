import { execFileSync, spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import { packageApp } from "./build-apps.mjs";

if (process.env.SKYNET_FOREGROUND_UI_TESTS !== "1") {
    console.error(
        "XCUITest 会占用当前 macOS 桌面的鼠标和键盘。请先安排前台测试时段，再使用 SKYNET_FOREGROUND_UI_TESTS=1 make client-e2e。",
    );
    process.exit(2);
}
if (process.argv.includes("--preflight")) process.exit(0);

const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(`${root}test-artifacts`, { recursive: true });
const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
});
server.on("connection", (socket) => {
    const id = randomUUID();
    socket.on("message", () => socket.send(id));
});
const url = `ws://127.0.0.1:${server.address().port}`;
const source = `${root}test-artifacts/connection-source`;
await rm(source, { recursive: true, force: true });
await cp(`${root}tooling/fixtures/connection`, source, { recursive: true });
const manifest = JSON.parse(await readFile(`${source}/manifest.json`, "utf8"));
await writeFile(
    `${source}/manifest.json`,
    JSON.stringify({ ...manifest, networkOrigins: [url] }),
);
await writeFile(
    `${source}/src/config.ts`,
    `export const socketURL = ${JSON.stringify(url)};\n`,
);
await packageApp(source, `${root}test-artifacts/connection.skapp`);
const generated = `${root}test-artifacts/generated-source`;
await rm(generated, { recursive: true, force: true });
execFileSync(
    process.execPath,
    [`${root}tooling/create-app.mjs`, "test.generated", generated],
    { stdio: "inherit" },
);
await packageApp(generated, `${root}test-artifacts/generated.skapp`);
await rm(`${root}test-artifacts/workspace.xcresult`, {
    recursive: true,
    force: true,
});
const child = spawn(
    "xcodebuild",
    [
        "-workspace",
        "macos/SkynetHost.xcworkspace",
        "-scheme",
        "SkynetHost-macOS",
        "-configuration",
        "Release",
        "-derivedDataPath",
        "DerivedData",
        "-destination",
        "platform=macOS",
        `ARCHS=${process.arch === "arm64" ? "arm64" : "x86_64"}`,
        "ONLY_ACTIVE_ARCH=YES",
        "CODE_SIGN_IDENTITY=-",
        "CODE_SIGN_STYLE=Manual",
        "DEVELOPMENT_TEAM=",
        "-resultBundlePath",
        `${root}test-artifacts/workspace.xcresult`,
        ...process.argv.slice(2),
        "test",
    ],
    {
        cwd: `${root}apps/host`,
        env: {
            ...process.env,
            DEVELOPER_DIR:
                process.env.DEVELOPER_DIR ??
                "/Applications/Xcode.app/Contents/Developer",
        },
        stdio: "inherit",
    },
);
const code = await new Promise((resolve, reject) => {
    child.once("exit", resolve);
    child.once("error", reject);
});
for (const socket of server.clients) socket.terminate();
await new Promise((resolve) => server.close(resolve));
process.exit(code ?? 1);
