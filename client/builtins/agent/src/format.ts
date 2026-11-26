import type {
    AgentState,
    ChatMessage,
    ChatSession,
    ExecutionTarget,
    ToolCall,
} from "@skynet/agent-client/types";

const VALID_TIMESTAMP_FLOOR_MS = 946_684_800_000;
const DAY_MS = 86_400_000;

export type SessionGroupKey = "today" | "yesterday" | "recent" | "older";

export interface SessionGroup {
    key: SessionGroupKey;
    title: string;
    sessions: ChatSession[];
}

const GROUP_TITLES: Record<SessionGroupKey, string> = {
    today: "今天",
    yesterday: "昨天",
    recent: "近 7 天",
    older: "更早",
};

const GROUP_ORDER: SessionGroupKey[] = [
    "today",
    "yesterday",
    "recent",
    "older",
];

export interface StarterPrompt {
    id: string;
    title: string;
    description: string;
    prompt: string;
    icon: "debug" | "architecture" | "test" | "refactor";
}

export const STARTER_PROMPTS: readonly StarterPrompt[] = [
    {
        id: "debug",
        title: "排查问题与定位根因",
        description: "分析报错日志与调用链路，给出最小改动修复方案",
        prompt: "帮我排查下面这个问题，先定位根因并说明最小修复方案：\n",
        icon: "debug",
    },
    {
        id: "architecture",
        title: "梳理项目结构与入口",
        description: "快速了解当前目录模块划分、核心数据流和关键入口",
        prompt: "帮我梳理当前工作目录的模块结构、核心入口和数据流。",
        icon: "architecture",
    },
    {
        id: "test",
        title: "补充测试并运行验证",
        description: "针对关键分支和边界条件编写测试用例并执行回归",
        prompt: "帮我检查最近改动，补充覆盖正常、边界与异常场景的测试并运行验证。",
        icon: "test",
    },
    {
        id: "refactor",
        title: "重构与简化实现",
        description: "在不改变外部行为的前提下消除重复逻辑并提升可读性",
        prompt: "帮我审阅并简化以下代码的复杂度，保持行为一致：\n",
        icon: "refactor",
    },
];

export type ConnectionStatus = AgentState["connection"]["status"];

export interface ConnectionStatusMeta {
    label: string;
    dotVariant: "success" | "warning" | "error" | "accent" | "neutral";
    badgeVariant: "success" | "warning" | "error" | "blue" | "neutral";
    pulsing: boolean;
    description: string;
}

export function connectionStatusMeta(
    status: ConnectionStatus,
    syncing = false,
): ConnectionStatusMeta {
    if (syncing) {
        return {
            label: "同步会话",
            dotVariant: "accent",
            badgeVariant: "blue",
            pulsing: true,
            description: "正在与服务器同步最新会话状态。",
        };
    }
    switch (status) {
        case "online":
            return {
                label: "已连接",
                dotVariant: "success",
                badgeVariant: "success",
                pulsing: false,
                description: "已连接到网关，可以发送任务并接收实时响应。",
            };
        case "connecting":
            return {
                label: "连接中",
                dotVariant: "accent",
                badgeVariant: "blue",
                pulsing: true,
                description: "正在建立与网关的安全连接。",
            };
        case "restoring":
            return {
                label: "恢复会话",
                dotVariant: "accent",
                badgeVariant: "blue",
                pulsing: true,
                description: "正在恢复会话快照与任务状态。",
            };
        case "retrying":
            return {
                label: "重新连接中",
                dotVariant: "warning",
                badgeVariant: "warning",
                pulsing: true,
                description: "连接暂时中断，系统正在自动重试。",
            };
        case "unavailable":
            return {
                label: "服务已下线",
                dotVariant: "warning",
                badgeVariant: "warning",
                pulsing: false,
                description: "Agent 服务当前不可用，上线后会自动恢复。",
            };
        case "error":
            return {
                label: "连接失败",
                dotVariant: "error",
                badgeVariant: "error",
                pulsing: false,
                description: "无法连接到网关，请检查网络或手动重新连接。",
            };
        case "offline":
        default:
            return {
                label: "未连接",
                dotVariant: "neutral",
                badgeVariant: "neutral",
                pulsing: false,
                description: "当前处于离线状态。",
            };
    }
}

function startOfLocalDay(timestampMs: number): number {
    const date = new Date(timestampMs);
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    ).getTime();
}

export function sessionDateGroup(
    updatedAtMs: number,
    nowMs: number = Date.now(),
): SessionGroupKey {
    if (
        !Number.isFinite(updatedAtMs) ||
        updatedAtMs < VALID_TIMESTAMP_FLOOR_MS
    ) {
        return "older";
    }
    const todayStart = startOfLocalDay(nowMs);
    const itemDayStart = startOfLocalDay(updatedAtMs);
    const diffDays = Math.floor((todayStart - itemDayStart) / DAY_MS);
    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return "recent";
    return "older";
}

export function sortSessions(sessions: ChatSession[]): ChatSession[] {
    return sessions
        .slice()
        .sort(
            (left, right) =>
                right.session.updated_at - left.session.updated_at ||
                right.session.id.localeCompare(left.session.id),
        );
}

export function filterSessions(
    sessions: ChatSession[],
    query: string,
): ChatSession[] {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sessions;
    return sessions.filter((chat) => {
        const title = (chat.session.title || "新会话").toLowerCase();
        const directory = (
            chat.execution_target?.directory || ""
        ).toLowerCase();
        return title.includes(keyword) || directory.includes(keyword);
    });
}

export function groupSessionsByDate(
    sessions: ChatSession[],
    nowMs: number = Date.now(),
): SessionGroup[] {
    const buckets: Record<SessionGroupKey, ChatSession[]> = {
        today: [],
        yesterday: [],
        recent: [],
        older: [],
    };
    for (const chat of sessions) {
        buckets[sessionDateGroup(chat.session.updated_at, nowMs)].push(chat);
    }
    return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
        key,
        title: GROUP_TITLES[key],
        sessions: buckets[key],
    }));
}

export function messageDateLabel(
    timestampMs: number,
    nowMs: number = Date.now(),
): string | null {
    if (
        !Number.isFinite(timestampMs) ||
        timestampMs < VALID_TIMESTAMP_FLOOR_MS
    ) {
        return null;
    }
    const todayStart = startOfLocalDay(nowMs);
    const messageDayStart = startOfLocalDay(timestampMs);
    const diffDays = Math.floor((todayStart - messageDayStart) / DAY_MS);
    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "昨天";
    const date = new Date(timestampMs);
    const now = new Date(nowMs);
    const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;
    if (date.getFullYear() === now.getFullYear()) return monthDay;
    return `${date.getFullYear()}年${monthDay}`;
}

export function shouldShowDateDivider(
    previous: ChatMessage | undefined,
    current: ChatMessage,
): boolean {
    if (
        !Number.isFinite(current.created_at) ||
        current.created_at < VALID_TIMESTAMP_FLOOR_MS
    ) {
        return false;
    }
    if (
        !previous ||
        !Number.isFinite(previous.created_at) ||
        previous.created_at < VALID_TIMESTAMP_FLOOR_MS
    ) {
        return true;
    }
    return (
        startOfLocalDay(previous.created_at) !==
        startOfLocalDay(current.created_at)
    );
}

export function directoryBasename(directory: string): string {
    const trimmed = directory.replace(/\/+$/, "");
    if (!trimmed) return directory || "/";
    const parts = trimmed.split("/");
    return parts[parts.length - 1] || trimmed;
}

export function formatWorkspaceLabel(
    target: ExecutionTarget | null | undefined,
    localWorkspaces: ExecutionTarget[],
    needsWorkspace?: boolean,
): string {
    if (needsWorkspace && !target?.device_id) {
        return "原目录不可用";
    }
    if (!target?.device_id) {
        return "服务器工作目录";
    }
    const matched = localWorkspaces.find(
        (item) =>
            item.workspace_id === target.workspace_id &&
            item.device_id === target.device_id,
    );
    const folder = directoryBasename(matched?.directory || target.directory);
    return matched ? folder : `远程桌面 · ${folder}`;
}

function truncateLine(text: string, maxLength = 88): string {
    const firstLine =
        text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0) ?? "";
    if (firstLine.length <= maxLength) return firstLine;
    return `${firstLine.slice(0, maxLength - 1)}…`;
}

export interface PatchSummary {
    files: string[];
    additions: number;
    deletions: number;
}

export function parsePatchSummary(patchText: string): PatchSummary {
    const files: string[] = [];
    let additions = 0;
    let deletions = 0;
    let inFileBody = false;

    for (const line of patchText.split(/\r?\n/)) {
        const fileMatch = line.match(
            /^\*\*\*\s+(?:Update|Add|Delete)\s+File:\s+(.+)$/,
        );
        if (fileMatch) {
            const filePath = fileMatch[1].trim();
            if (filePath && !files.includes(filePath)) files.push(filePath);
            inFileBody = true;
            continue;
        }
        if (line.startsWith("*** ")) {
            if (line.startsWith("*** End Patch")) inFileBody = false;
            continue;
        }
        if (!inFileBody) continue;
        if (line.startsWith("+") && !line.startsWith("+++")) {
            additions += 1;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
            deletions += 1;
        }
    }

    return { files, additions, deletions };
}

export interface ToolCallPresentation {
    status: "pending" | "running" | "complete" | "error";
    statusLabel: string;
    target?: string;
    node?: string;
    additions?: number;
    deletions?: number;
    errorMessage?: string;
    detailCode?: {
        title: string;
        language: string;
        code: string;
        isDiff?: boolean;
    };
    justification?: string;
    terminalSessionId?: string;
}

export type SessionExecutionKind = "local" | "remote" | "server" | "default";
export type SessionStatusKind = "running" | "error" | "warning" | null;

export function sessionExecutionKind(
    chat: ChatSession,
    localWorkspaces: ExecutionTarget[],
): SessionExecutionKind {
    const target = chat.execution_target;
    if (!target) return "default";
    if (!target.device_id) return "server";
    const isLocal = localWorkspaces.some(
        (item) =>
            item.workspace_id === target.workspace_id &&
            item.device_id === target.device_id,
    );
    return isLocal ? "local" : "remote";
}

export function sessionStatusKind(chat: ChatSession): SessionStatusKind {
    if (chat.session.run_id) return "running";
    const messages = chat.session.messages;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.role === 2) {
            if (message.status === 4) return "error";
            break;
        }
    }
    if (chat.read_only || chat.needs_workspace) return "warning";
    return null;
}

const TOOL_STATUS_LABELS: Record<string, string> = {
    interrupted: "执行中断",
    pending: "等待执行",
    judging: "检查权限",
    running: "执行中",
    completed: "已完成",
    failed: "执行失败",
    denied: "权限拒绝",
    cancelled: "已取消",
};

export function presentToolCall(tool: ToolCall): ToolCallPresentation {
    let parsed: Record<string, unknown> | null = null;
    if (tool.arguments) {
        try {
            const value = JSON.parse(tool.arguments);
            if (value && typeof value === "object" && !Array.isArray(value)) {
                parsed = value as Record<string, unknown>;
            }
        } catch {
            parsed = null;
        }
    }

    const status: ToolCallPresentation["status"] =
        tool.error ||
        ["failed", "denied", "cancelled", "interrupted"].includes(tool.status)
            ? "error"
            : tool.status === "pending"
              ? "pending"
              : ["running", "judging"].includes(tool.status)
                ? "running"
                : "complete";

    const statusLabel = TOOL_STATUS_LABELS[tool.status] ?? tool.status;
    const errorMessage =
        tool.error ||
        (tool.status === "cancelled"
            ? "已取消"
            : tool.status === "denied"
              ? "权限拒绝"
              : tool.status === "interrupted"
                ? "执行中断"
                : undefined);

    const justification =
        typeof parsed?.justification === "string" && parsed.justification.trim()
            ? parsed.justification.trim()
            : undefined;

    const directoryLabel = tool.working_directory
        ? directoryBasename(tool.working_directory)
        : "";
    const node =
        tool.permission_mode === "require_escalated"
            ? "沙盒外"
            : directoryLabel && directoryLabel !== "/"
              ? directoryLabel
              : undefined;

    if (tool.name === "exec_command" && typeof parsed?.cmd === "string") {
        return {
            status,
            statusLabel,
            target:
                truncateLine(parsed.cmd) || tool.working_directory || undefined,
            node,
            errorMessage,
            justification,
            detailCode: {
                title: "执行命令",
                language: "bash",
                code: parsed.cmd,
            },
        };
    }

    if (tool.name === "apply_patch" && typeof parsed?.patch === "string") {
        const summary = parsePatchSummary(parsed.patch);
        const files =
            tool.changed_files.length > 0 ? tool.changed_files : summary.files;
        const target =
            files.length === 1
                ? files[0]
                : files.length > 1
                  ? `${directoryBasename(files[0])} 等 ${files.length} 个文件`
                  : tool.working_directory || undefined;
        return {
            status,
            statusLabel,
            target,
            node,
            additions: summary.additions > 0 ? summary.additions : undefined,
            deletions: summary.deletions > 0 ? summary.deletions : undefined,
            errorMessage,
            justification,
            detailCode: {
                title: "补丁内容",
                language: "plaintext",
                code: parsed.patch,
                isDiff: true,
            },
        };
    }

    if (
        tool.name === "write_stdin" &&
        (typeof parsed?.session_id === "string" ||
            typeof parsed?.session_id === "number")
    ) {
        const sessionId = String(parsed.session_id);
        const chars = typeof parsed.chars === "string" ? parsed.chars : "";
        const preview = chars ? truncateLine(chars, 48) : "";
        return {
            status,
            statusLabel,
            target: preview
                ? `输入 → 会话 ${sessionId} · ${preview}`
                : `读取输出 · 会话 ${sessionId}`,
            node,
            errorMessage,
            terminalSessionId: sessionId,
            detailCode: chars
                ? {
                      title: "终端输入",
                      language: "plaintext",
                      code: chars,
                  }
                : undefined,
        };
    }

    const fallbackTarget =
        (typeof parsed?.cmd === "string" && truncateLine(parsed.cmd)) ||
        (typeof parsed?.path === "string" && parsed.path) ||
        (typeof parsed?.file === "string" && parsed.file) ||
        tool.working_directory ||
        undefined;

    const prettyArguments = parsed
        ? JSON.stringify(parsed, null, 2)
        : tool.arguments;

    return {
        status,
        statusLabel,
        target: fallbackTarget,
        node,
        errorMessage,
        justification,
        detailCode: prettyArguments
            ? {
                  title: "调用参数",
                  language: "json",
                  code: prettyArguments,
              }
            : undefined,
    };
}
