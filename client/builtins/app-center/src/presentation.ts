import type { AppSummary } from "@skynet/contracts";

export interface OnlineNode {
    app_id: string;
    name: string;
    version: string;
}

export interface ServiceVersion {
    name: string;
    request_id: string;
    image: string;
    image_id: string;
    accepted: boolean;
    reviewer: string;
}

export interface Service {
    app_id: string;
    name: string;
    instances: number;
    enabled: boolean;
    transition: string;
    approved?: ServiceVersion;
    pending?: ServiceVersion;
    last?: ServiceVersion;
    desired: boolean;
    can_set_enabled: boolean;
}

export interface Directory {
    names: string[];
    online?: OnlineNode[];
    services: Service[];
    administrator: boolean;
}

export interface DiscoverApp {
    key: string;
    name: string;
    appId?: string;
    version?: string;
    cover?: string;
    localApp?: AppSummary;
    isPlatformCore: boolean;
}

export type DiscoverSort = "default" | "name-asc" | "name-desc";

export type ServiceFilter =
    "all" | "pending" | "running" | "stopped" | "attention";

export interface ServiceStatusMeta {
    label: string;
    description: string;
    badgeVariant: "error" | "warning" | "success" | "neutral";
    dotVariant: "error" | "warning" | "success" | "neutral";
    pulsing: boolean;
    failed: boolean;
    changing: boolean;
    attention: boolean;
    nextEnabled: boolean;
    toggleLabel: string;
}

export interface ServiceSummary {
    total: number;
    running: number;
    pending: number;
    stopped: number;
    attention: number;
}

const COVERS_BY_ID = new Map<string, string>([
    ["agent", "./covers/agent.webp"],
    ["app-center", "./covers/app-center.webp"],
]);

const COVERS_BY_NAME = new Map<string, string>([
    ["Agent", "./covers/agent.webp"],
    ["应用中心", "./covers/app-center.webp"],
]);

export function coverForApp(name: string, appId?: string): string | undefined {
    if (appId) {
        const byId = COVERS_BY_ID.get(appId);
        if (byId) return byId;
    }
    return COVERS_BY_NAME.get(name);
}

export function formatVersionBadge(version?: string): string {
    const trimmed = version?.trim() ?? "";
    if (!trimmed) return "";
    return /^[vV]/.test(trimmed) ? trimmed : `v${trimmed}`;
}

export function shortImageId(imageId?: string): string {
    const trimmed = imageId?.trim() ?? "";
    if (!trimmed) return "—";
    const match = trimmed.match(/^([a-z0-9]+):([0-9a-f]{12})[0-9a-f]+$/i);
    if (match) return `${match[1]}:${match[2]}`;
    if (trimmed.length > 24) return `${trimmed.slice(0, 21)}…`;
    return trimmed;
}

export function validateAdminToken(token: string): string | null {
    return token.trim().length > 0 ? null : "请输入管理令牌";
}

function tokenizeQuery(query: string): string[] {
    return query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
}

function matchesTokens(
    tokens: string[],
    fields: (string | undefined)[],
): boolean {
    if (!tokens.length) return true;
    const haystack = fields
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLocaleLowerCase();
    return tokens.every((token) => haystack.includes(token));
}

export function buildDiscoverCatalog(
    directory?: Directory,
    localApps: AppSummary[] = [],
): DiscoverApp[] {
    if (!directory) return [];
    const unusedOnline = [...(directory.online ?? [])];
    const localById = new Map(localApps.map((item) => [item.id, item]));
    const localByName = new Map(localApps.map((item) => [item.name, item]));

    return directory.names.map((name, index) => {
        const onlineIndex = unusedOnline.findIndex(
            (node) => node.name === name,
        );
        const onlineNode =
            onlineIndex >= 0
                ? unusedOnline.splice(onlineIndex, 1)[0]
                : undefined;
        const appId = onlineNode?.app_id;
        const localApp =
            (appId ? localById.get(appId) : undefined) ?? localByName.get(name);
        const resolvedId = appId ?? localApp?.id;
        return {
            key: resolvedId ? `${resolvedId}-${index}` : `${name}-${index}`,
            name,
            appId: resolvedId,
            version: onlineNode?.version,
            cover: coverForApp(name, resolvedId),
            localApp,
            isPlatformCore: resolvedId === "app-center" || name === "应用中心",
        };
    });
}

export function filterAndSortDiscoverApps(
    items: DiscoverApp[],
    query: string,
    sort: DiscoverSort = "default",
): DiscoverApp[] {
    const tokens = tokenizeQuery(query);
    const filtered = items.filter((item) =>
        matchesTokens(tokens, [item.name, item.appId, item.version]),
    );
    if (sort === "default") return filtered;
    const sorted = [...filtered].sort((left, right) =>
        left.name.localeCompare(right.name, "zh-CN"),
    );
    return sort === "name-desc" ? sorted.reverse() : sorted;
}

export function serviceStatusMeta(service: Service): ServiceStatusMeta {
    const transition = service.transition ?? "";
    const failed = transition.endsWith("_failed");
    const changing = transition === "enabling" || transition === "disabling";
    const unavailable = transition === "unavailable";
    const attention = failed || changing || unavailable;
    const nextEnabled = !service.enabled && transition !== "disable_failed";
    const toggleLabel = failed ? "重试变更" : nextEnabled ? "启用" : "停用";

    if (transition === "enabling") {
        return {
            label: "正在启动",
            description: "正在拉起应用容器并等待服务就绪。",
            badgeVariant: "warning",
            dotVariant: "warning",
            pulsing: true,
            failed: false,
            changing: true,
            attention: true,
            nextEnabled,
            toggleLabel,
        };
    }
    if (transition === "disabling") {
        return {
            label: "正在停用",
            description: "正在结束在途任务并停止应用容器。",
            badgeVariant: "warning",
            dotVariant: "warning",
            pulsing: true,
            failed: false,
            changing: true,
            attention: true,
            nextEnabled,
            toggleLabel,
        };
    }
    if (transition === "enable_failed") {
        return {
            label: "启动失败",
            description: "上次启用未能完成，请检查服务状态后重试变更。",
            badgeVariant: "error",
            dotVariant: "error",
            pulsing: false,
            failed: true,
            changing: false,
            attention: true,
            nextEnabled,
            toggleLabel,
        };
    }
    if (transition === "disable_failed") {
        return {
            label: "停用未完成",
            description: "上次停用未完全结束，请先重试停用以完成服务下线。",
            badgeVariant: "error",
            dotVariant: "error",
            pulsing: false,
            failed: true,
            changing: false,
            attention: true,
            nextEnabled,
            toggleLabel,
        };
    }
    if (unavailable) {
        return {
            label: "连接中断",
            description: "当前与该应用服务实例失去连接，正在等待恢复。",
            badgeVariant: "error",
            dotVariant: "error",
            pulsing: false,
            failed: false,
            changing: false,
            attention: true,
            nextEnabled,
            toggleLabel,
        };
    }
    if (service.enabled) {
        return {
            label: "运行中",
            description: "服务已启用并对外提供能力。",
            badgeVariant: "success",
            dotVariant: "success",
            pulsing: false,
            failed: false,
            changing: false,
            attention: false,
            nextEnabled,
            toggleLabel,
        };
    }
    if (service.desired) {
        return {
            label: "等待启动",
            description: "已标记为期望启用，正在等待实例注册上线。",
            badgeVariant: "warning",
            dotVariant: "warning",
            pulsing: false,
            failed: false,
            changing: false,
            attention: false,
            nextEnabled,
            toggleLabel,
        };
    }
    return {
        label: "未运行",
        description: "服务当前处于停用或未上架运行状态。",
        badgeVariant: "neutral",
        dotVariant: "neutral",
        pulsing: false,
        failed: false,
        changing: false,
        attention: false,
        nextEnabled,
        toggleLabel,
    };
}

export function summarizeServices(services: Service[]): ServiceSummary {
    let running = 0;
    let pending = 0;
    let stopped = 0;
    let attention = 0;
    for (const service of services) {
        const status = serviceStatusMeta(service);
        if (service.enabled) running += 1;
        else stopped += 1;
        if (service.pending) pending += 1;
        if (status.attention) attention += 1;
    }
    return {
        total: services.length,
        running,
        pending,
        stopped,
        attention,
    };
}

export function filterServices(
    services: Service[],
    query: string,
    filter: ServiceFilter = "all",
): Service[] {
    const tokens = tokenizeQuery(query);
    return services.filter((service) => {
        const status = serviceStatusMeta(service);
        if (filter === "pending" && !service.pending) return false;
        if (filter === "running" && !service.enabled) return false;
        if (filter === "stopped" && service.enabled) return false;
        if (filter === "attention" && !status.attention) return false;
        return matchesTokens(tokens, [
            service.name,
            service.app_id,
            service.approved?.name,
            service.approved?.image,
            service.pending?.name,
            service.pending?.image,
            service.last?.reviewer,
            service.last?.image,
            status.label,
        ]);
    });
}

export function serviceDisplayName(service: Service): string {
    return (
        service.name?.trim() ||
        service.approved?.name?.trim() ||
        service.pending?.name?.trim() ||
        service.app_id
    );
}

export function localStatusLabel(status?: AppSummary["status"]): string {
    if (status === "running") return "本地运行中";
    if (status === "starting") return "本地启动中";
    if (status === "failed") return "本地异常";
    if (status === "stopped") return "本地已内置";
    return "服务器可用";
}

export const DISCOVER_SORT_LABELS: Record<DiscoverSort, string> = {
    default: "默认排序",
    "name-asc": "名称 A–Z",
    "name-desc": "名称 Z–A",
};
