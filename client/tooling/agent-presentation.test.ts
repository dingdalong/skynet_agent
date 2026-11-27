import { describe, expect, it } from "vitest";
import type {
    ChatMessage,
    ChatSession,
    ExecutionTarget,
    ToolCall,
} from "@skynet/agent-client/types";
import {
    connectionStatusMeta,
    directoryBasename,
    formatWorkspaceLabel,
    groupSessionsByProject,
    messageDateLabel,
    parsePatchSummary,
    presentToolCall,
    projectGroupStatusKind,
    sessionStatusKind,
    shouldShowDateDivider,
    sortSessions,
    validateCloudProjectName,
} from "../builtins/agent/src/format";

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: "msg-1",
        role: 2,
        content: "hello",
        created_at: new Date(2026, 10, 26, 10, 0, 0).getTime(),
        status: 2,
        run_id: "run-1",
        error: null,
        ret: 1,
        tool_calls: [],
        reasoning: [],
        ...overrides,
    };
}

function makeSession(
    id: string,
    overrides: Partial<Omit<ChatSession, "session">> & {
        session?: Partial<ChatSession["session"]>;
    } = {},
): ChatSession {
    const { session: sessionOverrides, ...rest } = overrides;
    return {
        model_id: "default",
        permission_model_id: "perm",
        execution_target: null,
        ...rest,
        session: {
            id,
            title: `会话 ${id}`,
            updated_at: new Date(2026, 10, 26, 10, 0, 0).getTime(),
            revision: 1,
            messages: [],
            run_id: "",
            cancelling: false,
            ...sessionOverrides,
        },
    };
}

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
        id: "tool-1",
        name: "exec_command",
        arguments: "{}",
        status: "completed",
        permission_reason: "",
        permission_mode: "default",
        output: "",
        truncated: false,
        changed_files: [],
        error: "",
        process_id: "",
        run_id: "run-1",
        working_directory: "",
        reasoning: [],
        ...overrides,
    };
}

describe("agent UI presentation helpers", () => {
    const now = new Date(2026, 10, 26, 14, 30, 0).getTime();

    it("maps connection states and gives syncing priority", () => {
        expect(connectionStatusMeta("online", false)).toMatchObject({
            label: "已连接",
            dotVariant: "success",
            pulsing: false,
        });
        expect(connectionStatusMeta("online", true)).toMatchObject({
            label: "同步会话",
            dotVariant: "accent",
            badgeVariant: "info",
            pulsing: true,
        });
        expect(connectionStatusMeta("connecting").badgeVariant).toBe("info");
        expect(connectionStatusMeta("retrying").dotVariant).toBe("warning");
        expect(connectionStatusMeta("unavailable").label).toBe("服务已下线");
        expect(connectionStatusMeta("error").dotVariant).toBe("error");
        expect(connectionStatusMeta("offline").dotVariant).toBe("neutral");
    });

    it("groups by project identity, sorts activity, and searches child sessions", () => {
        const dir = {
            device_id: "mac",
            workspace_id: "one",
            directory: "/work/demo",
            platform: "macos",
        };
        const a = makeSession("a", {
            cloud_project: "demo",
            session: { updated_at: 4 },
        });
        const b = makeSession("b", {
            cloud_project: "demo",
            session: { updated_at: 2 },
        });
        const c = makeSession("c", {
            execution_target: dir,
            session: { updated_at: 3 },
        });
        const groups = (query: string) =>
            groupSessionsByProject([b, c, a], ["demo", "空项目"], [dir], query);
        expect(
            groups("").map((g) => g.sessions.map((s) => s.session.id)),
        ).toEqual([["a", "b"], ["c"], []]);
        expect(groups("demo")).toHaveLength(2);
        expect(groups("会话 b")[0].sessions).toEqual([b]);
        expect(groups("缺失")).toEqual([]);
        expect(sortSessions([b, c, a])).toEqual([a, c, b]);
    });
    it("distinguishes local, remote, and cloud groups without leaking raw device ids", () => {
        const localTarget: ExecutionTarget = {
            device_id: "mac-local",
            workspace_id: "ws-local",
            directory: "/work/skynet_agent",
            platform: "macos",
        };
        const remoteTarget: ExecutionTarget = {
            device_id: "mac-studio-raw-id",
            workspace_id: "ws-remote",
            directory: "/work/skynet_agent",
            platform: "macos",
        };
        const localChat = makeSession("s-local", {
            execution_target: localTarget,
            session: { updated_at: 4 },
        });
        const remoteChat = makeSession("s-remote", {
            execution_target: remoteTarget,
            session: { updated_at: 3 },
        });
        const groups = groupSessionsByProject(
            [localChat, remoteChat],
            ["云端演示"],
            [],
            "",
            "mac-local",
            [
                {
                    id: "mac-studio-raw-id",
                    name: "Studio Mac",
                    online: true,
                    remote_enabled: true,
                },
            ],
        );
        const localGroup = groups.find((item) => item.kind === "local");
        const remoteGroup = groups.find((item) => item.kind === "remote");
        const cloudGroup = groups.find((item) => item.kind === "cloud");
        expect(localGroup).toMatchObject({
            name: "skynet_agent · 此计算机",
            detail: "/work/skynet_agent",
            selectable: false,
        });
        expect(remoteGroup).toMatchObject({
            name: "skynet_agent · Studio Mac",
            detail: "Studio Mac · /work/skynet_agent",
            selectable: false,
        });
        expect(remoteGroup?.name).not.toContain("mac-studio-raw-id");
        expect(cloudGroup).toMatchObject({
            selectable: true,
            project: { location: "cloud", id: "云端演示" },
        });
    });
    it("disambiguates duplicate directory basenames using shortest unique parent path", () => {
        const wsA: ExecutionTarget = {
            device_id: "mac-local",
            workspace_id: "ws-a",
            directory: "/private/tmp/alpha-run/workspace",
            platform: "macos",
        };
        const wsB: ExecutionTarget = {
            device_id: "mac-local",
            workspace_id: "ws-b",
            directory: "/private/tmp/beta-run/workspace",
            platform: "macos",
        };
        const wsC: ExecutionTarget = {
            device_id: "mac-local",
            workspace_id: "ws-c",
            directory: "/Users/alice/team/app",
            platform: "macos",
        };
        const wsD: ExecutionTarget = {
            device_id: "mac-local",
            workspace_id: "ws-d",
            directory: "/Users/bob/team/app",
            platform: "macos",
        };
        const groups = groupSessionsByProject(
            [],
            ["app"],
            [wsA, wsB, wsC, wsD],
            "",
            "mac-local",
        );
        const names = groups.map((group) => group.name);
        expect(names).toContain("workspace · alpha-run");
        expect(names).toContain("workspace · beta-run");
        expect(names).toContain("app · alice/team");
        expect(names).toContain("app · bob/team");
        expect(names).toContain("app · 云端");
    });
    it("validates and trims cloud project names and blocks duplicates", () => {
        expect(validateCloudProjectName("  项目 A  ", ["演示"])).toEqual({
            value: "项目 A",
            error: "",
        });
        expect(validateCloudProjectName("   ", ["演示"]).error).toContain(
            "有效",
        );
        expect(validateCloudProjectName("..", ["演示"]).error).toContain(
            "有效",
        );
        expect(validateCloudProjectName("a/b", ["演示"]).error).toContain(
            "有效",
        );
        expect(validateCloudProjectName(" 演示 ", ["演示"]).error).toContain(
            "已存在",
        );
    });
    it("classifies session status dot priority", () => {
        expect(
            sessionStatusKind(
                makeSession("run", {
                    read_only: true,
                    session: { run_id: "run-9" },
                }),
            ),
        ).toBe("running");
        expect(
            sessionStatusKind(
                makeSession("err", {
                    session: {
                        messages: [
                            makeMessage({ id: "u1", role: 1, status: 2 }),
                            makeMessage({ id: "a1", role: 2, status: 4 }),
                        ],
                    },
                }),
            ),
        ).toBe("error");
        expect(
            sessionStatusKind(
                makeSession("recovered", {
                    session: {
                        messages: [
                            makeMessage({ id: "a1", role: 2, status: 4 }),
                            makeMessage({ id: "a2", role: 2, status: 2 }),
                        ],
                    },
                }),
            ),
        ).toBeNull();
        expect(sessionStatusKind(makeSession("ro", { read_only: true }))).toBe(
            "warning",
        );
        expect(
            sessionStatusKind(makeSession("nw", { needs_workspace: true })),
        ).toBe("warning");
        const localTarget: ExecutionTarget = {
            device_id: "mac-1",
            workspace_id: "ws-1",
            directory: "/work/demo",
            platform: "macos",
        };
        const localContext = {
            deviceId: "mac-1",
            name: "Mac",
            authorizationId: "auth-1",
            remoteEnabled: false,
            workspaces: [],
        };
        const revokedLocal = makeSession("revoked", {
            execution_target: localTarget,
        });
        expect(sessionStatusKind(revokedLocal, localContext)).toBe("warning");
        expect(
            projectGroupStatusKind(
                [
                    revokedLocal,
                    makeSession("err", {
                        session: {
                            messages: [makeMessage({ role: 2, status: 4 })],
                        },
                    }),
                ],
                localContext,
            ),
        ).toBe("error");
        expect(
            projectGroupStatusKind([
                makeSession("err", {
                    session: {
                        messages: [makeMessage({ role: 2, status: 4 })],
                    },
                }),
                makeSession("run", { session: { run_id: "run-1" } }),
            ]),
        ).toBe("running");
    });

    it("computes message date dividers and formatted labels across days and years", () => {
        const day1Morning = makeMessage({
            id: "1",
            created_at: new Date(2026, 10, 25, 9, 0, 0).getTime(),
        });
        const day1Night = makeMessage({
            id: "2",
            created_at: new Date(2026, 10, 25, 22, 0, 0).getTime(),
        });
        const day2 = makeMessage({
            id: "3",
            created_at: new Date(2026, 10, 26, 8, 0, 0).getTime(),
        });
        const invalid = makeMessage({ id: "0", created_at: 0 });

        expect(shouldShowDateDivider(undefined, invalid)).toBe(false);
        expect(shouldShowDateDivider(undefined, day1Morning)).toBe(true);
        expect(shouldShowDateDivider(invalid, day1Morning)).toBe(true);
        expect(shouldShowDateDivider(day1Morning, day1Night)).toBe(false);
        expect(shouldShowDateDivider(day1Night, day2)).toBe(true);

        expect(messageDateLabel(0, now)).toBeNull();
        expect(messageDateLabel(day2.created_at, now)).toBe("今天");
        expect(messageDateLabel(day1Morning.created_at, now)).toBe("昨天");
        expect(
            messageDateLabel(new Date(2026, 2, 5, 10, 0, 0).getTime(), now),
        ).toBe("3月5日");
        expect(
            messageDateLabel(new Date(2025, 11, 31, 10, 0, 0).getTime(), now),
        ).toBe("2025年12月31日");
    });

    it("formats workspace basenames and target labels", () => {
        expect(directoryBasename("/Users/dev/project///")).toBe("project");
        expect(directoryBasename("/")).toBe("/");
        const local: ExecutionTarget[] = [
            {
                device_id: "mac",
                workspace_id: "ws-1",
                directory: "/Users/dev/skynet_agent/",
                platform: "macos",
            },
        ];
        expect(
            formatWorkspaceLabel(makeSession("1", { cloud_project: "演示" })),
        ).toBe("云端 · 演示");
        const chat = makeSession("1", { execution_target: local[0] });
        expect(formatWorkspaceLabel(chat, "mac")).toBe(
            "此计算机 · skynet_agent",
        );
        expect(formatWorkspaceLabel(chat, "other")).toBe(
            "远程桌面 · skynet_agent",
        );
        expect(
            formatWorkspaceLabel(chat, "other", [
                {
                    id: "mac",
                    name: "开发机",
                    online: true,
                    remote_enabled: true,
                },
            ]),
        ).toBe("开发机 · skynet_agent");
    });

    it("parses apply_patch file headers and line addition/deletion counts", () => {
        const patch = [
            "*** Begin Patch",
            "*** Update File: src/app.ts",
            "@@",
            " unchanged",
            "-old line",
            "+new line 1",
            "+new line 2",
            "*** Add File: src/helper.ts",
            "+export const ok = true;",
            "*** Delete File: src/old.ts",
            "-removed",
            "*** End Patch",
            "+ignored trailing noise",
        ].join("\r\n");

        expect(parsePatchSummary(patch)).toEqual({
            files: ["src/app.ts", "src/helper.ts", "src/old.ts"],
            additions: 3,
            deletions: 2,
        });
        expect(parsePatchSummary("")).toEqual({
            files: [],
            additions: 0,
            deletions: 0,
        });
    });

    it("presents exec_command, apply_patch, write_stdin, and malformed arguments safely", () => {
        const exec = presentToolCall(
            makeToolCall({
                name: "exec_command",
                arguments: JSON.stringify({
                    cmd: "git status --short\ngit diff",
                    justification: "检查工作区",
                }),
                permission_mode: "require_escalated",
                working_directory: "/Users/dev/skynet_agent",
            }),
        );
        expect(exec).toMatchObject({
            status: "complete",
            statusLabel: "已完成",
            target: "git status --short",
            node: "沙盒外",
            justification: "检查工作区",
            detailCode: {
                title: "执行命令",
                language: "bash",
                code: "git status --short\ngit diff",
            },
        });

        const sandboxedExec = presentToolCall(
            makeToolCall({
                name: "exec_command",
                arguments: JSON.stringify({ cmd: "pwd" }),
                working_directory: "/workspace",
                status: "running",
            }),
        );
        expect(sandboxedExec.node).toBe("workspace");
        expect(sandboxedExec.status).toBe("running");

        const patchCall = presentToolCall(
            makeToolCall({
                name: "apply_patch",
                arguments: JSON.stringify({
                    patch: "*** Begin Patch\n*** Update File: a.ts\n-x\n+y\n+z\n*** Update File: b.ts\n+w\n*** End Patch",
                }),
            }),
        );
        expect(patchCall).toMatchObject({
            target: "a.ts 等 2 个文件",
            additions: 3,
            deletions: 1,
            detailCode: {
                title: "补丁内容",
                language: "plaintext",
                isDiff: true,
            },
        });

        const stdinWrite = presentToolCall(
            makeToolCall({
                name: "write_stdin",
                arguments: JSON.stringify({
                    session_id: 42,
                    chars: "npm test\n",
                }),
            }),
        );
        expect(stdinWrite).toMatchObject({
            target: "输入 → 会话 42 · npm test",
            terminalSessionId: "42",
            detailCode: {
                title: "终端输入",
                language: "plaintext",
                code: "npm test\n",
            },
        });

        const stdinPoll = presentToolCall(
            makeToolCall({
                name: "write_stdin",
                arguments: JSON.stringify({ session_id: "term-7", chars: "" }),
            }),
        );
        expect(stdinPoll.target).toBe("读取输出 · 会话 term-7");
        expect(stdinPoll.detailCode).toBeUndefined();

        const malformed = presentToolCall(
            makeToolCall({
                name: "custom_tool",
                arguments: "{not-json",
                status: "denied",
                working_directory: "/repo",
            }),
        );
        expect(malformed).toMatchObject({
            status: "error",
            statusLabel: "权限拒绝",
            errorMessage: "权限拒绝",
            target: "/repo",
            detailCode: {
                title: "调用参数",
                language: "json",
                code: "{not-json",
            },
        });
    });
});
