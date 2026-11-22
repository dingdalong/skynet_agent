import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomInt, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import protobuf from "protobufjs";
import { createCodec } from "../packages/app-sdk/src/protocol.ts";
import { loadProtocol } from "./load-protocol.mjs";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const project = `skynet-test-${randomUUID().slice(0, 8)}`;
const ports = await Promise.all(
    Array.from({ length: 4 }, async () => {
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
const [gatewayPort, centerPort, clusterPort, mongoPort] = ports.map(
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
    APP_MONGO_HOST: "127.0.0.1",
    APP_MONGO_PORT: String(mongoPort),
    APP_MONGO_PASSWORD: randomUUID(),
    CATALOG_MONGO_PASSWORD: randomUUID(),
    SKYNET_ENV_FILE: "/dev/null",
    GATEWAY_CLUSTER_PORT: String(clusterPort),
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
const submit = async (id, name) =>
    (
        await run(
            "./server/appctl",
            [
                "submit",
                "--app-id",
                id,
                "--name",
                name,
                "--image",
                `${project}-${id}:test`,
            ],
            options,
        )
    ).stdout.trim();
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
    await assert.rejects(
        compose(
            "run",
            "--rm",
            "--no-deps",
            "-T",
            "-e",
            "CATALOG_MONGO_PASSWORD=invalid-test-password",
            "app-center",
        ),
        (error) =>
            /初始化服务失败: \.database/.test(error.stdout + error.stderr),
    );
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
    const loginAdmin = async () => {
        assert.equal(
            (await request("LoginReq", { username: "docker-probe" })).body.ret,
            1,
        );
        await until(
            async () =>
                (
                    await request("AppCenterUnlockReq", {
                        token: environment.APP_CENTER_ADMIN_TOKEN,
                    })
                ).body.ret === 1,
            "应用中心就绪",
        );
    };
    await loginAdmin();
    const restartStack = async () => {
        const closed = once(socket, "close");
        socket.close();
        await closed;
        await run("./server/control.sh", ["stop"], options);
        await compose("up", "-d", "gateway");
        await listen();
        await loginAdmin();
    };
    const list = async () => (await request("AppCenterListReq")).body.services;
    const enabled = async (id) =>
        (await list()).find((app) => app.app_id === id)?.enabled;
    const set = async (app_id, enabled) =>
        assert.equal(
            (await request("AppCenterSetReq", { app_id, enabled })).body.ret,
            1,
        );
    const review = async (app_id, request_id, approve) =>
        (await request("AppCenterReviewReq", { app_id, request_id, approve }))
            .body;
    const assertAgentAbsent = async () => {
        const result = await docker(
            "ps",
            "-aq",
            "--filter",
            `name=^/${container("agent")}$`,
        );
        assert.equal(result.stdout.trim(), "");
        assert.equal((await request("AgentSnapshotReq")).name, "RoutingError");
    };
    assert.deepEqual(
        (await list()).map((app) => [app.app_id, app.can_set_enabled]),
        [["app-center", false]],
    );
    assert.equal(
        (await compose("ps", "-q")).stdout.trim().split("\n").length,
        3,
    );
    await assertAgentAbsent();
    const agentRequest = await submit("agent", "Agent");
    const pendingAgent = (await list()).find((app) => app.app_id === "agent");
    assert.equal(pendingAgent.pending.request_id, agentRequest);
    assert.equal(pendingAgent.can_set_enabled, false);
    await assertAgentAbsent();
    assert.equal((await review("agent", agentRequest, false)).ret, 1);
    await assertAgentAbsent();
    const resubmission = await submit("agent", "Agent");
    assert.notEqual(resubmission, agentRequest);
    assert.equal((await review("agent", resubmission, true)).ret, 1);
    const agentReady = async () =>
        (await request("AgentSnapshotReq")).body.ret === 1;
    await until(agentReady, "Agent 批准后就绪");
    await restartStack();
    await until(agentReady, "整套服务重启后恢复已启用的 Agent");
    const restoredAgent = (await list()).find((app) => app.app_id === "agent");
    assert.equal(restoredAgent.approved.request_id, resubmission);
    assert.equal(restoredAgent.desired, true);
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
    const firstRequest = await submit("echo", "Echo");
    assert.match(firstRequest, /^[0-9a-f]{32}$/);
    assert.notEqual(
        (await request("AppCenterUnlockReq", { token: "invalid" })).body.ret,
        1,
    );
    const publicDirectory = (await request("AppCenterListReq")).body;
    assert.deepEqual(publicDirectory.services, []);
    assert.ok(!publicDirectory.names.includes("Echo"));
    assert.notEqual((await review("echo", firstRequest, true)).ret, 1);
    assert.notEqual(
        (await request("AppCenterRemoveReq", { app_id: "agent" })).body.ret,
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
    assert.equal(await submit("echo", "Echo"), firstRequest);
    const echoService = async () =>
        (await list()).find((app) => app.app_id === "echo");
    const pendingEcho = await echoService();
    assert.equal(pendingEcho.pending.request_id, firstRequest);
    assert.equal(pendingEcho.can_set_enabled, false);
    assert.equal((await request("EchoRepeatReq")).name, "RoutingError");
    assert.equal((await review("echo", firstRequest, false)).ret, 1);
    assert.equal((await echoService()).can_set_enabled, false);
    const approvedRequest = await submit("echo", "Echo");
    assert.notEqual(approvedRequest, firstRequest);
    await docker("create", "--name", container("echo"), `${project}-echo:test`);
    assert.equal((await review("echo", approvedRequest, true)).ret, 1);
    assert.equal((await echoService()).can_set_enabled, true);
    assert.equal((await review("echo", approvedRequest, true)).ret, 1);
    assert.notEqual((await review("echo", firstRequest, true)).ret, 1);
    await compose("kill", "app-center");
    await docker("rm", container("echo"));
    await compose("start", "app-center");
    await until(
        async () =>
            (
                await request("AppCenterUnlockReq", {
                    token: environment.APP_CENTER_ADMIN_TOKEN,
                })
            ).body.ret === 1,
        "恢复审批记录",
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
    await compose("pause", "mongodb");
    try {
        const unavailable = request("AppCenterSetReq", {
            app_id: "echo",
            enabled: false,
        });
        assert.deepEqual(
            (await request("EchoRepeatReq", payload)).body,
            payload,
        );
        const result = (await unavailable).body;
        assert.notEqual(result.ret, 1);
        assert.equal(result.error.retryable, true);
    } finally {
        await compose("unpause", "mongodb");
    }
    await until(
        () =>
            messages.some(
                (packet) =>
                    packet.name === "EchoRepeatedNtf" &&
                    packet.body.item.echo_value === "独立协议",
            ),
        "回程通知",
    );
    // 写入超时后数据库仍可能提交。重试同一个请求确认期望状态，再恢复运行。
    await set("echo", false);
    assert.equal(await enabled("echo"), false);
    await set("echo", true);
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
    await restartStack();
    await until(
        async () => (await list()).length === 3 && (await enabled("echo")),
        "整套服务重启后恢复已登记应用",
    );
    assert.equal(await enabled("agent"), false);
    assert.equal(
        (await list()).find((app) => app.app_id === "agent").desired,
        false,
    );
    assert.equal((await request("AgentSnapshotReq")).name, "RoutingError");
    assert.equal(await appRunning("agent"), false);
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    await set("echo", false);
    await docker(
        "build",
        "-f",
        "server/Dockerfile",
        "--target",
        "echo-fixture",
        "--label",
        "test.release=2",
        "-t",
        `${project}-echo:test`,
        ".",
    );
    const oldImage = (
        await docker("inspect", "-f", "{{.Image}}", container("echo"))
    ).stdout.trim();
    const update = await submit("echo", "Echo 2");
    await set("echo", true);
    assert.equal(
        (
            await docker("inspect", "-f", "{{.Image}}", container("echo"))
        ).stdout.trim(),
        oldImage,
    );
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    assert.equal((await review("echo", update, false)).ret, 1);
    const nextUpdate = await submit("echo", "Echo 2");
    await set("echo", false);
    assert.equal((await review("echo", nextUpdate, true)).ret, 1);
    assert.equal(await appRunning("echo"), false);
    await set("echo", true);
    assert.notEqual(
        (
            await docker("inspect", "-f", "{{.Image}}", container("echo"))
        ).stdout.trim(),
        oldImage,
    );
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    await docker("tag", oldImage, `${project}-echo:test`);
    const rollback = await submit("echo", "Echo");
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    assert.equal((await review("echo", rollback, true)).ret, 1);
    await until(async () => {
        const image = await docker(
            "inspect",
            "-f",
            "{{.Image}}",
            container("echo"),
        ).catch(() => null);
        return image?.stdout.trim() === oldImage && (await enabled("echo"));
    }, "批准后更新运行中的镜像");
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
    assert.equal(
        (await request("AppCenterRemoveReq", { app_id: "echo" })).body.ret,
        1,
    );
    await compose("restart", "app-center");
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
    }, "应用中心从数据库恢复停用状态和下架结果");
    const remaining = await docker(
        "ps",
        "-a",
        "-q",
        "--filter",
        `name=^/${container("echo")}$`,
    );
    assert.equal(remaining.stdout.trim(), "");
    const relisted = await submit("echo", "Echo 新名称");
    const pendingRelist = await echoService();
    assert.equal(pendingRelist.name, "Echo 新名称");
    assert.equal(pendingRelist.pending.request_id, relisted);
    assert.ok(!pendingRelist.approved);
    assert.equal(pendingRelist.can_set_enabled, false);
    assert.ok(
        !(await request("AppCenterListReq")).body.names.includes("Echo 新名称"),
    );
    assert.equal((await request("EchoRepeatReq")).name, "RoutingError");
    assert.equal((await review("echo", relisted, true)).ret, 1);
    await until(() => enabled("echo"), "重新上架后的路由就绪");
    assert.ok(
        (await request("AppCenterListReq")).body.names.includes("Echo 新名称"),
    );
    assert.deepEqual((await request("EchoRepeatReq", payload)).body, payload);
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
    await compose("down", "--volumes", "--rmi", "local");
    for (const id of ["agent", "echo"]) {
        await docker("rm", "-f", container(id)).catch(() => {});
        await docker("image", "rm", `${project}-${id}:test`).catch(() => {});
    }
    await docker("volume", "rm", `${project}_agent-work`).catch(() => {});
}
