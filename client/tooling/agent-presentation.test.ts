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
    filterSessions,
    formatWorkspaceLabel,
    groupSessionsByDate,
    messageDateLabel,
    parsePatchSummary,
    presentToolCall,
    sessionDateGroup,
    sessionExecutionKind,
    sessionStatusKind,
    shouldShowDateDivider,
    sortSessions,
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

    it("groups sessions by local calendar day and omits empty buckets", () => {
        const today = makeSession("today", {
            session: { updated_at: new Date(2026, 10, 26, 0, 5, 0).getTime() },
        });
        const yesterday = makeSession("yesterday", {
            session: {
                updated_at: new Date(2026, 10, 25, 23, 55, 0).getTime(),
            },
        });
        const recent = makeSession("recent", {
            session: { updated_at: new Date(2026, 10, 20, 12, 0, 0).getTime() },
        });
        const older = makeSession("older", {
            session: { updated_at: new Date(2026, 10, 19, 12, 0, 0).getTime() },
        });
        const invalid = makeSession("invalid", {
            session: { updated_at: 0 },
        });

        expect(sessionDateGroup(NaN, now)).toBe("older");
        expect(sessionDateGroup(now + 60_000, now)).toBe("today");

        const groups = groupSessionsByDate(
            [today, yesterday, recent, older, invalid],
            now,
        );
        expect(groups.map((group) => [group.key, group.title])).toEqual([
            ["today", "今天"],
            ["yesterday", "昨天"],
            ["recent", "近 7 天"],
            ["older", "更早"],
        ]);
        expect(groups[3].sessions.map((item) => item.session.id)).toEqual([
            "older",
            "invalid",
        ]);

        expect(groupSessionsByDate([today], now)).toHaveLength(1);
    });

    it("sorts and filters sessions by title, untitled fallback, and directory", () => {
        const alpha = makeSession("a", {
            session: { title: "Alpha Bug", updated_at: 2_000_000_000_000 },
            execution_target: {
                device_id: "mac",
                workspace_id: "w1",
                directory: "/Users/dev/skynet_agent",
                platform: "macos",
            },
        });
        const beta = makeSession("b", {
            session: { title: "", updated_at: 2_000_000_000_000 },
        });
        const older = makeSession("c", {
            session: { title: "Older", updated_at: 1_900_000_000_000 },
        });

        expect(
            sortSessions([older, alpha, beta]).map((item) => item.session.id),
        ).toEqual(["b", "a", "c"]);
        expect(filterSessions([alpha, beta], "   ")).toHaveLength(2);
        expect(filterSessions([alpha, beta], "SKYNET_AGENT")).toEqual([alpha]);
        expect(filterSessions([alpha, beta], "新会话")).toEqual([beta]);
        expect(filterSessions([alpha, beta], "不存在")).toEqual([]);
    });

    it("classifies session execution kind and status dot priority", () => {
        const localWorkspaces: ExecutionTarget[] = [
            {
                device_id: "mac-1",
                workspace_id: "ws-1",
                directory: "/Users/dev/app",
                platform: "macos",
            },
        ];
        expect(sessionExecutionKind(makeSession("d"), localWorkspaces)).toBe(
            "default",
        );
        expect(
            sessionExecutionKind(
                makeSession("s", {
                    execution_target: {
                        device_id: "",
                        workspace_id: "",
                        directory: "/workspace",
                        platform: "linux",
                    },
                }),
                localWorkspaces,
            ),
        ).toBe("server");
        expect(
            sessionExecutionKind(
                makeSession("l", { execution_target: localWorkspaces[0] }),
                localWorkspaces,
            ),
        ).toBe("local");
        expect(
            sessionExecutionKind(
                makeSession("r", {
                    execution_target: {
                        device_id: "mac-2",
                        workspace_id: "ws-9",
                        directory: "/Users/other/repo",
                        platform: "macos",
                    },
                }),
                localWorkspaces,
            ),
        ).toBe("remote");

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
        expect(formatWorkspaceLabel(null, local, true)).toBe("原目录不可用");
        expect(formatWorkspaceLabel(null, local)).toBe("服务器工作目录");
        expect(formatWorkspaceLabel(local[0], local)).toBe("skynet_agent");
        expect(
            formatWorkspaceLabel(
                {
                    device_id: "remote-mac",
                    workspace_id: "ws-2",
                    directory: "/work/demo",
                    platform: "macos",
                },
                local,
            ),
        ).toBe("远程桌面 · demo");
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
