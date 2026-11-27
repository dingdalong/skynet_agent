import type {
    Appearance,
    AppSnapshot,
    AppSummary,
    HostCapabilities,
    Wallpaper,
} from "@skynet/contracts";
import type { Section } from "./runtime";

export type SettingsGroup = "personalization" | "system";

export interface SectionMeta {
    id: Section;
    label: string;
    group: SettingsGroup;
    description: string;
    keywords: string[];
}

export interface SettingSearchEntry {
    id: string;
    section: Section;
    label: string;
    sectionLabel: string;
    description: string;
    keywords: string[];
}

export interface OnlineNode {
    app_id: string;
    name: string;
    version: string;
}

export type AppFilter =
    "all" | "running" | "builtin" | "third-party" | "failed";

export interface AppSummaryMetrics {
    total: number;
    running: number;
    builtin: number;
    thirdParty: number;
    failed: number;
}

export interface AboutAppRow {
    id: string;
    name: string;
    localVersion: string;
    serverVersion: string;
    installed: boolean;
    statusLabel: string;
    statusVariant: "neutral" | "success" | "warning" | "error" | "info";
}

export const SETTINGS_GROUPS: ReadonlyArray<{
    id: SettingsGroup;
    title: string;
}> = [
    { id: "personalization", title: "个性化" },
    { id: "system", title: "系统" },
];

export const SETTINGS_SECTIONS: ReadonlyArray<SectionMeta> = [
    {
        id: "appearance",
        label: "外观",
        group: "personalization",
        description: "选择应用明暗主题，立即同步至宿主工作区与所有打开的应用",
        keywords: [
            "外观",
            "主题",
            "浅色",
            "深色",
            "暗色",
            "跟随系统",
            "appearance",
            "theme",
            "light",
            "dark",
            "system",
        ],
    },
    {
        id: "wallpaper",
        label: "壁纸",
        group: "personalization",
        description: "自定义桌面背景氛围，壁纸色调会随浅色与深色模式自动适配",
        keywords: [
            "壁纸",
            "背景",
            "桌面",
            "海岸",
            "暮色",
            "森林",
            "wallpaper",
            "coast",
            "dusk",
            "forest",
        ],
    },
    {
        id: "motion",
        label: "动态效果",
        group: "personalization",
        description: "调整界面过渡、分屏缩放与流式动效强度，兼容系统辅助功能",
        keywords: [
            "动态效果",
            "动画",
            "减少动态效果",
            "辅助功能",
            "过渡",
            "motion",
            "animation",
            "reduce",
        ],
    },
    {
        id: "apps",
        label: "应用管理",
        group: "system",
        description:
            "查看已安装应用的运行状态、权限清单与导出动作，支持重启或移除",
        keywords: [
            "应用管理",
            "已安装应用",
            "安装应用",
            "重启",
            "移除",
            "权限",
            "进程",
            "apps",
            "install",
            "restart",
            "permissions",
        ],
    },
    {
        id: "about",
        label: "关于",
        group: "system",
        description: "查看宿主客户端、Gateway 与各子应用版本及当前设备运行环境",
        keywords: [
            "关于",
            "版本",
            "诊断",
            "网关",
            "gateway",
            "about",
            "version",
            "build",
            "platform",
        ],
    },
];

export const SETTING_SEARCH_ENTRIES: ReadonlyArray<SettingSearchEntry> = [
    {
        id: "appearance-mode",
        section: "appearance",
        label: "外观模式",
        sectionLabel: "外观",
        description: "切换浅色、深色或跟随系统外观",
        keywords: [
            "外观",
            "主题",
            "浅色",
            "深色",
            "跟随系统",
            "dark",
            "light",
            "theme",
        ],
    },
    {
        id: "wallpaper-choice",
        section: "wallpaper",
        label: "桌面壁纸",
        sectionLabel: "壁纸",
        description: "选择海岸、暮色或森林渐变壁纸",
        keywords: [
            "壁纸",
            "背景",
            "海岸",
            "暮色",
            "森林",
            "wallpaper",
            "coast",
            "dusk",
            "forest",
        ],
    },
    {
        id: "reduce-motion",
        section: "motion",
        label: "减少动态效果",
        sectionLabel: "动态效果",
        description: "关闭缩放和位移动画以降低视觉干扰",
        keywords: [
            "减少动态效果",
            "动画",
            "辅助功能",
            "过渡",
            "motion",
            "reduce",
        ],
    },
    {
        id: "installed-apps",
        section: "apps",
        label: "已安装应用与权限",
        sectionLabel: "应用管理",
        description: "安装、重启、移除应用并检查声明的权限",
        keywords: [
            "应用管理",
            "安装",
            "重启",
            "移除",
            "权限",
            "apps",
            "permissions",
        ],
    },
    {
        id: "about-versions",
        section: "about",
        label: "版本与环境信息",
        sectionLabel: "关于",
        description: "核对客户端与服务端在线版本，复制诊断信息",
        keywords: [
            "关于",
            "版本",
            "gateway",
            "诊断",
            "平台",
            "about",
            "version",
        ],
    },
];

export const APPEARANCE_OPTIONS: ReadonlyArray<{
    value: Appearance;
    label: string;
    summary: string;
}> = [
    {
        value: "light",
        label: "浅色",
        summary: "始终使用明亮清晰的浅色表面与高对比文字。",
    },
    {
        value: "dark",
        label: "深色",
        summary: "始终使用低眩光的深色表面，适合夜间或长时间专注工作。",
    },
    {
        value: "system",
        label: "跟随系统",
        summary: "自动同步当前操作系统的浅色或深色外观设置。",
    },
];

export const WALLPAPER_OPTIONS: ReadonlyArray<{
    value: Wallpaper;
    label: string;
    description: string;
}> = [
    {
        value: "coast",
        label: "海岸",
        description: "清透海雾与青蓝层次，轻盈安静",
    },
    {
        value: "dusk",
        label: "暮色",
        description: "柔和霞紫与暮灰渐变，温润克制",
    },
    {
        value: "forest",
        label: "森林",
        description: "松柏与深苔绿调，沉稳护眼",
    },
];

export function sectionMeta(section: Section): SectionMeta {
    return (
        SETTINGS_SECTIONS.find((item) => item.id === section) ??
        SETTINGS_SECTIONS[0]
    );
}

export function wallpaperMeta(wallpaper: Wallpaper) {
    return (
        WALLPAPER_OPTIONS.find((item) => item.value === wallpaper) ??
        WALLPAPER_OPTIONS[0]
    );
}

export function appearanceMeta(appearance: Appearance) {
    return (
        APPEARANCE_OPTIONS.find((item) => item.value === appearance) ??
        APPEARANCE_OPTIONS[0]
    );
}

export function searchSettings(query: string): SettingSearchEntry[] {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return SETTING_SEARCH_ENTRIES.filter((entry) => {
        const haystack = [
            entry.label,
            entry.sectionLabel,
            entry.description,
            ...entry.keywords,
        ]
            .join(" ")
            .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
    });
}

export function formatVersion(version?: string, build?: string): string {
    const cleanVersion = version?.trim();
    if (!cleanVersion) return "未上报";
    const cleanBuild = build?.trim();
    return cleanBuild ? `${cleanVersion}+${cleanBuild}` : cleanVersion;
}

export function appStatusMeta(status: AppSummary["status"]): {
    label: string;
    dotVariant: "success" | "accent" | "neutral" | "error";
    badgeVariant: "success" | "info" | "neutral" | "error";
    pulsing: boolean;
} {
    switch (status) {
        case "running":
            return {
                label: "运行中",
                dotVariant: "success",
                badgeVariant: "success",
                pulsing: false,
            };
        case "starting":
            return {
                label: "正在启动",
                dotVariant: "accent",
                badgeVariant: "info",
                pulsing: true,
            };
        case "failed":
            return {
                label: "运行异常",
                dotVariant: "error",
                badgeVariant: "error",
                pulsing: false,
            };
        default:
            return {
                label: "未运行",
                dotVariant: "neutral",
                badgeVariant: "neutral",
                pulsing: false,
            };
    }
}

const PERMISSION_LABELS: Record<string, string> = {
    "host.preferences": "读写外观与系统偏好",
    "host.apps": "管理本地已安装应用",
    "user.identity": "读取当前登录用户身份",
};

export function permissionLabel(permission: string): string {
    return PERMISSION_LABELS[permission] ?? permission;
}

export function summarizeInstalledApps(
    apps: ReadonlyArray<AppSummary>,
): AppSummaryMetrics {
    let running = 0;
    let builtin = 0;
    let thirdParty = 0;
    let failed = 0;
    for (const entry of apps) {
        if (entry.status === "running") running += 1;
        if (entry.builtin) builtin += 1;
        else thirdParty += 1;
        if (entry.status === "failed") failed += 1;
    }
    return {
        total: apps.length,
        running,
        builtin,
        thirdParty,
        failed,
    };
}

export function filterInstalledApps(
    apps: ReadonlyArray<AppSummary>,
    filter: AppFilter,
    query: string,
): AppSummary[] {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return apps.filter((entry) => {
        if (filter === "running" && entry.status !== "running") return false;
        if (filter === "builtin" && !entry.builtin) return false;
        if (filter === "third-party" && entry.builtin) return false;
        if (filter === "failed" && entry.status !== "failed") return false;
        if (!tokens.length) return true;
        const haystack = [
            entry.name,
            entry.id,
            entry.version,
            entry.build ?? "",
            appStatusMeta(entry.status).label,
            entry.builtin ? "内置" : "扩展 第三方",
            ...entry.permissions,
            ...entry.permissions.map(permissionLabel),
        ]
            .join(" ")
            .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
    });
}

export function platformLabel(platform?: HostCapabilities["platform"]): string {
    switch (platform) {
        case "macos":
            return "macOS";
        case "ios":
            return "iOS";
        case "android":
            return "Android";
        case "windows":
            return "Windows";
        case "linux":
            return "Linux";
        case "web":
            return "Web";
        default:
            return "未知平台";
    }
}

export function isolationLabel(
    isolation?: HostCapabilities["runtimeIsolation"],
): string {
    switch (isolation) {
        case "process":
            return "独立进程隔离";
        case "in-process":
            return "进程内独立 VM 隔离";
        case "worker":
            return "Worker 隔离";
        case "remote":
            return "远程隔离";
        default:
            return "未上报";
    }
}

export function capabilitiesSummary(capabilities?: HostCapabilities): string {
    if (!capabilities) return "未上报";
    const parts = [
        capabilities.splitView ? "支持分屏" : "单窗模式",
        capabilities.installApplications ? "允许安装扩展应用" : "仅内置应用",
    ];
    if (capabilities.localDevelopment) parts.push("支持本机执行");
    return parts.join(" · ");
}

export function buildAboutAppRows(
    apps: ReadonlyArray<AppSummary>,
    online: ReadonlyArray<OnlineNode> | undefined,
    loading: boolean,
    hasError: boolean,
): AboutAppRow[] {
    const servers = new Map((online ?? []).map((node) => [node.app_id, node]));
    const installed = new Map(apps.map((entry) => [entry.id, entry]));
    const ids = [...new Set([...installed.keys(), ...servers.keys()])].sort();
    return ids.map((id) => {
        const local = installed.get(id);
        const server = servers.get(id);
        const name = local?.name ?? server?.name ?? id;
        const localVersion = local
            ? formatVersion(local.version, local.build)
            : "未安装";

        let serverVersion = server?.version?.trim() || "未上报";
        let statusLabel = "在线";
        let statusVariant: AboutAppRow["statusVariant"] = "success";

        if (!server && id === "settings") {
            serverVersion = "仅本机";
            statusLabel = "本机内置";
            statusVariant = "neutral";
        } else if (!server && loading) {
            serverVersion = "正在读取…";
            statusLabel = "读取中";
            statusVariant = "info";
        } else if (!server && hasError) {
            serverVersion = "读取失败";
            statusLabel = "检查失败";
            statusVariant = "error";
        } else if (!server && online !== undefined) {
            serverVersion = "未发现在线服务";
            statusLabel = "未在线";
            statusVariant = "warning";
        } else if (!local && server) {
            statusLabel = "仅服务端";
            statusVariant = "info";
        }

        return {
            id,
            name,
            localVersion,
            serverVersion,
            installed: Boolean(local),
            statusLabel,
            statusVariant,
        };
    });
}

export function formatDiagnosticSummary(input: {
    about?: AppSnapshot["about"];
    capabilities?: HostCapabilities;
    rows: ReadonlyArray<AboutAppRow>;
}): string {
    const lines = [
        "Skynet Agent 环境与版本信息",
        `宿主客户端: ${formatVersion(input.about?.clientVersion, input.about?.build)}`,
        `Gateway 服务端: ${input.about?.gatewayVersion?.trim() || "未上报"}`,
        `运行平台: ${platformLabel(input.capabilities?.platform)} (${isolationLabel(input.capabilities?.runtimeIsolation)})`,
        `系统能力: ${capabilitiesSummary(input.capabilities)}`,
    ];
    if (input.rows.length) {
        lines.push("", "子应用版本:");
        for (const row of input.rows) {
            lines.push(
                `- ${row.name} (${row.id}): 客户端 ${row.localVersion} / 服务端 ${row.serverVersion}`,
            );
        }
    }
    return lines.join("\n");
}
