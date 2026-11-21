import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomInt, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import protobuf from "protobufjs";
import { createCodec } from "../packages/app-sdk/src/protocol.ts";
import { loadProtocol } from "./load-protocol.mjs";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const project = `skynet-test-${randomUUID().slice(0, 8)}`;
const catalog = await mkdtemp(join(tmpdir(), "skynet-catalog-"));
const ports = await Promise.all(
    Array.from({ length: 3 }, async () => {
        for (;;) {
            const server = createServer().listen(
                randomInt(20000, 32000),
                "127.0.0.1",
            );
            try {
                await once(server, "listening");
                return server;
            } catch (error) {
                if (error.code !== "EADDRINUSE") throw error;
            }
        }
    }),
);
const [gatewayPort, centerPort, clusterPort] = ports.map(
    (server) => server.address().port,
);
await Promise.all(
    ports.map((server) => new Promise((done) => server.close(done))),
);
const environment = {
    ...process.env,
    COMPOSE_PROJECT_NAME: project,
    GATEWAY_PORT: String(gatewayPort),
    APP_CENTER_PORT: String(centerPort),
    GATEWAY_CLUSTER_PORT: String(clusterPort),
    APP_CATALOG_DIR: catalog,
    DEEPSEEK_API_KEY: "docker-fixture",
    DEEPSEEK_BASE_URL: "http://127.0.0.1:1",
    APP_CENTER_ADMIN_TOKEN: randomUUID(),
};
const options = { cwd: root, env: environment, maxBuffer: 16 * 1024 * 1024 };
const compose = (...args) =>
    run(
        "docker",
        ["compose", "-p", project, "-f", "compose.yaml", ...args],
        options,
    );
const docker = (...args) => run("docker", args, options);
const container = (id) => `${project}-app-${id}`;
const appRunning = async (id) =>
    (
        await docker("inspect", "-f", "{{.State.Running}}", container(id))
    ).stdout.trim() === "true";
const register = async (id, name) =>
    writeFile(
        join(catalog, `${id}.json`),
        JSON.stringify({ app_id: id, name, image: `${project}-${id}:test` }),
    );
const namespace = "skynet.agent.v1";
const platform = (await loadProtocol("platform.proto")).toJSON();
const echo = (
    await new protobuf.Root().load(
        `${root}server/tests/fixtures/echo/echo.proto`,
        { keepCase: true },
    )
).toJSON();
const codec = createCodec([
    ...["login", "app-center"].map((id) => ({
        id,
        namespace,
        schema: platform,
    })),
    { id: "echo", namespace, schema: echo },
    {
        id: "agent",
        namespace,
        schema: (await loadProtocol("agent/schema.proto")).toJSON(),
    },
]);
async function until(check, label) {
    const end = Date.now() + 45_000;
    while (Date.now() < end) {
        const value = await check();
        if (value) return value;
        await delay(150);
    }
    throw Error(`等待超时 ${label}`);
}
let socket;
try {
    await compose("build");
    for (const [id, target] of [
        ["agent", "agent"],
        ["echo", "echo-fixture"],
    ]) {
        await docker(
            "build",
            "-f",
            "server/Dockerfile",
            "--target",
            target,
            "-t",
            `${project}-${id}:test`,
            ".",
        );
    }
    await compose("up", "-d", "gateway");
    const connect = async () => {
        const origin = `127.0.0.1:${gatewayPort}`;
        return until(async () => {
            const client = new WebSocket(`ws://${origin}/agent`);
            try {
                await once(client, "open");
                return client;
            } catch {
                client.terminate();
                return false;
            }
        }, "网关");
    };
    const messages = [];
    const listen = async () => {
        socket = await connect();
        socket.on("message", (data) =>
            messages.push(codec.decodePacket(data.toString("base64"))),
        );
    };
    await listen();
    let sequence = 0;
    const request = async (name, body = {}) => {
        const id = ++sequence;
        socket.send(Buffer.from(codec.encodePacket(name, id, body), "base64"));
        return until(() => messages.find((packet) => packet.id === id), name);
    };
    assert.equal(
        (await request("LoginReq", { username: "docker-probe" })).body.ret,
        1,
    );
    assert.equal(
        (
            await request("AppCenterUnlockReq", {
                token: environment.APP_CENTER_ADMIN_TOKEN,
            })
        ).body.ret,
        1,
    );
    const list = async () => (await request("AppCenterListReq")).body.services;
    const enabled = async (id) =>
        (await list()).find((app) => app.app_id === id)?.enabled;
    const set = async (app_id, enabled) =>
        assert.equal(
            (await request("AppCenterSetReq", { app_id, enabled })).body.ret,
            1,
        );
    assert.deepEqual(
        (await list()).map((app) => app.app_id),
        ["app-center"],
    );
    assert.equal(
        (await compose("ps", "-q")).stdout.trim().split("\n").length,
        2,
    );
    await register("agent", "Agent");
    await until(() => enabled("agent"), "Agent 就绪");
    const gatewayId = (await compose("ps", "-q", "gateway")).stdout.trim();
    const boot = () =>
        run(
            "docker",
            ["inspect", "-f", "{{.State.StartedAt}}", gatewayId],
            options,
        ).then((result) => result.stdout);
    const started = await boot();
    assert.equal((await request("EchoRepeatReq")).name, "RoutingError");
    await compose(
        "exec",
        "-T",
        "gateway",
        "sh",
        "-ec",
        "test ! -e ../common/proto/echo.proto && test ! -d ../common/proto/agent && test ! -d ../common/proto/app_center && test ! -e /var/run/docker.sock",
    );
    await register("echo", "Echo");
    await until(
        async () => (await list()).some((app) => app.app_id === "echo"),
        "登记第二个 App",
    );
    await until(() => enabled("echo"), "Echo 自动启动");
    for (const [messages, expected] of [
        ["message Item {} message Item {}", /already defined/],
        ["message Xptdms6 {} message X1hls4ac {}", /消息哈希冲突/],
        ["message WrongReq {} message WrongRes {}", /协议缺少应用前缀/],
        ["message EchoMissingReq {}", /协议缺少配对消息/],
    ]) {
        await assert.rejects(
            docker(
                "exec",
                container("echo"),
                "sh",
                "-ec",
                'dir=$(mktemp -d); printf "%s\\n" "$1" > "$dir/check.proto"; bin/lua deploy/check_protocol.lua echo check.proto "$dir"',
                "check",
                `syntax = "proto3"; package sample; ${messages}`,
            ),
            (error) => expected.test(error.stderr),
        );
    }
    const payload = { item: { echo_value: "独立协议" } };
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    await until(
        () =>
            messages.some(
                (packet) =>
                    packet.name === "EchoRepeatedNtf" &&
                    packet.body.item.echo_value === "独立协议",
            ),
        "回程通知",
    );
    const agentBoot = () =>
        docker(
            "inspect",
            "-f",
            "{{.State.StartedAt}}",
            container("agent"),
        ).then((r) => r.stdout);
    const initialAgentBoot = await agentBoot();
    const endpoint = async (app) => {
        const { stdout, stderr } = await docker("logs", container(app));
        return [
            ...(stdout + stderr).matchAll(/endpoint=127\.0\.0\.1:(\d+)/g),
        ].at(-1)?.[1];
    };
    const agentPort = await endpoint("agent");
    const echoPort = await endpoint("echo");
    assert.ok(
        Number(agentPort) > 0 && Number(echoPort) > 0 && agentPort !== echoPort,
    );
    await compose("restart", "app-center");
    await until(async () => {
        const answer = await request("AppCenterUnlockReq", {
            token: environment.APP_CENTER_ADMIN_TOKEN,
        });
        return (
            answer.body.ret === 1 &&
            (await enabled("agent")) &&
            (await enabled("echo"))
        );
    }, "应用中心重启并接管现有节点");
    assert.equal(await agentBoot(), initialAgentBoot);
    assert.equal(await endpoint("agent"), agentPort);
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    await docker(
        "exec",
        container("agent"),
        "sh",
        "-ec",
        'cd /work; mkdir -p check; /usr/local/libexec/workspace-sandbox /work/check -- sh -ec "echo kept > /work/check/probe; if touch /work/outside || cat /proc/1/environ >/dev/null; then exit 1; fi"',
    );
    assert.equal(
        (
            await request("AgentDesktopRegisterReq", {
                device_id: "desktop",
                name: "Desktop",
                authorization_id: "docker-auth",
            })
        ).body.ret,
        1,
    );
    const target = {
        device_id: "desktop",
        workspace_id: "workspace",
        directory: "/project",
        platform: "macos",
    };
    assert.equal(
        (
            await request("AgentChatReq", {
                text: "检查工作目录",
                execution_target: target,
            })
        ).body.ret,
        1,
    );
    const action = await until(
        () =>
            messages.find(
                (packet) => packet.name === "AgentExecutionActionNtf",
            ),
        "桌面执行",
    );
    const first = messages.length;
    const stopping = request("AppCenterSetReq", {
        app_id: "agent",
        enabled: false,
    });
    await until(
        () =>
            messages
                .slice(first)
                .some(
                    (packet) =>
                        packet.name === "AppCenterChangedNtf" &&
                        packet.body.app_id === "agent" &&
                        !packet.body.enabled,
                ),
        "等待收尾",
    );
    assert.notEqual((await request("AgentSnapshotReq")).body.ret, 1);
    assert.equal(
        (
            await request("AgentExecutionResultReq", {
                request_id: action.body.request_id,
                result: JSON.stringify({
                    ok: true,
                    project: { workspace: "/project" },
                }),
            })
        ).body.ret,
        1,
    );
    assert.equal((await stopping).body.ret, 1);
    assert.equal(
        (
            await docker(
                "inspect",
                "-f",
                "{{.State.ExitCode}}",
                container("agent"),
            )
        ).stdout.trim(),
        "0",
    );
    assert.equal((await request("AgentSnapshotReq")).name, "RoutingError");
    assert.equal(await appRunning("agent"), false);
    await set("agent", true);
    assert.equal((await request("AgentSnapshotReq")).body.ret, 1);
    await docker(
        "exec",
        container("agent"),
        "grep",
        "-qx",
        "kept",
        "/work/check/probe",
    );
    const enabledBoot = await agentBoot();
    const previousPort = await endpoint("agent");
    await docker("kill", "-s", "SIGKILL", container("agent"));
    await until(
        async () => (await request("AgentSnapshotReq")).body.ret === 1,
        "意外退出恢复",
    );
    assert.notEqual(await agentBoot(), enabledBoot);
    assert.ok(Number(await endpoint("agent")) > 0);
    console.log(
        `Agent 故障恢复后重新注册 ${previousPort} → ${await endpoint("agent")}`,
    );
    assert.equal(await boot(), started);
    await set("agent", false);
    const closed = once(socket, "close");
    socket.close();
    await closed;
    await compose("restart", "gateway");
    await listen();
    assert.equal(
        (await request("LoginReq", { username: "docker-probe" })).body.ret,
        1,
    );
    assert.equal(
        (
            await request("AppCenterUnlockReq", {
                token: environment.APP_CENTER_ADMIN_TOKEN,
            })
        ).body.ret,
        1,
    );
    await until(async () => (await list()).length === 3, "恢复已登记应用");
    assert.equal(await enabled("agent"), false);
    assert.equal(await appRunning("agent"), false);
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    await set("echo", false);
    await compose("stop", "app-center");
    await rm(join(catalog, "echo.json"));
    await compose("start", "app-center");
    await until(async () => {
        const unlocked = await request("AppCenterUnlockReq", {
            token: environment.APP_CENTER_ADMIN_TOKEN,
        });
        if (unlocked.body.ret !== 1) return false;
        const services = await list();
        return (
            services?.length === 2 &&
            services.some((app) => app.app_id === "agent" && !app.enabled)
        );
    }, "应用中心从配置恢复停用状态并回收移出的应用");
    const remaining = await docker(
        "ps",
        "-a",
        "-q",
        "--filter",
        `name=^/${container("echo")}$`,
    );
    assert.equal(remaining.stdout.trim(), "");
    console.log(
        "Docker 应用接入、同名类型、通知、沙盒、容器启停和故障恢复通过",
    );
} catch (error) {
    console.error(
        (await compose("logs", "--tail=35", "gateway", "app-center")).stdout,
    );
    throw error;
} finally {
    socket?.terminate();
    try {
        await compose("down", "--volumes", "--rmi", "local");
        for (const id of ["agent", "echo"]) {
            await docker("rm", "-f", container(id)).catch(() => {});
            await docker("image", "rm", `${project}-${id}:test`).catch(
                () => {},
            );
        }
        await docker("volume", "rm", `${project}_agent-work`).catch(() => {});
    } finally {
        await rm(catalog, { recursive: true, force: true });
    }
}
