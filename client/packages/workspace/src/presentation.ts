import type {
    AppSummary,
    HostSnapshot,
    Json,
    Workspace,
    WorkspaceCommandName,
} from "@skynet/contracts";
import type { SearchableItem } from "@astryxdesign/core/Typeahead";
import type { Placement } from "./geometry";

export type LoginValidation = {
    valid: boolean;
    url: string;
    username: string;
    errors: {
        url?: string;
        username?: string;
    };
};

export function validateLoginInput(
    rawUrl: string,
    rawUsername: string,
): LoginValidation {
    const url = rawUrl.trim();
    const username = rawUsername.trim();
    const errors: LoginValidation["errors"] = {};
    if (!url) {
        errors.url = "请输入服务器地址";
    } else {
        try {
            const parsed = new URL(url);
            if (
                (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") ||
                !parsed.hostname
            ) {
                errors.url = "请输入有效的 ws:// 或 wss:// 服务器地址";
            }
        } catch {
            errors.url = "请输入有效的 ws:// 或 wss:// 服务器地址";
        }
    }
    if (!username) {
        errors.username = "请输入用户名";
    }
    return {
        valid: !errors.url && !errors.username,
        url,
        username,
        errors,
    };
}

export function formatServerHost(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    try {
        const parsed = new URL(trimmed);
        return parsed.host || trimmed;
    } catch {
        return trimmed;
    }
}

export function activePaneId(
    workspace: Workspace,
    visible: (string | null)[],
): string | null {
    const visibleApps = visible.filter((id): id is string => Boolean(id));
    if (!visibleApps.length) return null;
    const recentHit = workspace.recent.find((id) => visibleApps.includes(id));
    return recentHit ?? visibleApps[0];
}

export function splitRatioPercentages(
    ratio: number,
    collapse?: Placement,
): { left: number; right: number; label: string; collapsing: boolean } {
    if (collapse === "left") {
        return {
            left: 0,
            right: 100,
            label: "松手收起左侧",
            collapsing: true,
        };
    }
    if (collapse === "right") {
        return {
            left: 100,
            right: 0,
            label: "松手收起右侧",
            collapsing: true,
        };
    }
    const clamped = Math.max(0, Math.min(1, ratio));
    const left = Math.round(clamped * 100);
    const right = 100 - left;
    return {
        left,
        right,
        label: `${left}% · ${right}%`,
        collapsing: false,
    };
}

export type CommandStep = {
    name: WorkspaceCommandName;
    input?: Record<string, Json>;
};

export function overviewSplitPlan(
    workspace: Workspace,
    appId: string,
): CommandStep[] {
    if (
        workspace.panes.length === 2 &&
        workspace.panes.includes(appId) &&
        !workspace.panes.includes(null)
    ) {
        return [{ name: "restore", input: { appId } }];
    }
    const partner =
        workspace.panes.find((id) => id !== null && id !== appId) ??
        workspace.recent.find((id) => id !== appId);
    if (partner) {
        return [
            { name: "split", input: { appId: partner, edge: "left" } },
            { name: "open", input: { appId } },
        ];
    }
    return [{ name: "split", input: { appId, edge: "left" } }];
}

export type PaletteAction =
    | { kind: "steps"; steps: CommandStep[] }
    | { kind: "closeAll" }
    | { kind: "requestLogout" };

export type WorkspaceCommandIcon =
    | "home"
    | "overview"
    | "split"
    | "swap"
    | "balance"
    | "collapse"
    | "closeAll"
    | "logout";

export type WorkspaceCommandAux = {
    group: "应用" | "工作区" | "账号";
    description?: string;
    shortcut?: string;
    badge?: string;
    keywords: string[];
    app?: AppSummary;
    icon?: WorkspaceCommandIcon;
    action: PaletteAction;
};

export type WorkspaceCommandItem = SearchableItem<WorkspaceCommandAux>;

export function buildWorkspaceCommands(
    snapshot: HostSnapshot,
    options: { wide: boolean; activePane: string | null },
): WorkspaceCommandItem[] {
    const { workspace, apps, capabilities, user } = snapshot;
    const { wide, activePane } = options;
    const canSplit = wide && capabilities.splitView;
    const running = new Set(workspace.recent);
    const visibleApps = new Set(
        workspace.mode === "apps"
            ? workspace.panes.filter((id): id is string => Boolean(id))
            : [],
    );
    const items: WorkspaceCommandItem[] = [];

    for (const app of apps) {
        const isVisible = visibleApps.has(app.id);
        const isRunning = running.has(app.id);
        const isActive = workspace.mode === "apps" && activePane === app.id;
        items.push({
            id: `app:open:${app.id}`,
            label: `打开 ${app.name}`,
            auxiliaryData: {
                group: "应用",
                description: isActive
                    ? "当前活动面板"
                    : isVisible
                      ? "切换到此分屏面板"
                      : isRunning
                        ? "从后台恢复"
                        : "启动应用",
                badge: isRunning ? "运行中" : undefined,
                keywords: [app.id, app.name, "open", "打开", "应用"],
                app,
                action: {
                    kind: "steps",
                    steps: [
                        {
                            name: isRunning ? "restore" : "open",
                            input: { appId: app.id },
                        },
                    ],
                },
            },
        });
    }

    if (canSplit && workspace.mode === "apps" && activePane) {
        for (const app of apps) {
            if (app.id === activePane || visibleApps.has(app.id)) continue;
            const hasEmptySlot =
                workspace.panes.length === 2 && workspace.panes.includes(null);
            const steps: CommandStep[] = hasEmptySlot
                ? [{ name: "open", input: { appId: app.id } }]
                : [
                      {
                          name: "split",
                          input: { appId: activePane, edge: "left" },
                      },
                      { name: "open", input: { appId: app.id } },
                  ];
            items.push({
                id: `app:split:${app.id}`,
                label: `与 ${app.name} 并排分屏`,
                auxiliaryData: {
                    group: "应用",
                    description: "在右侧打开并保持当前应用可见",
                    keywords: [app.id, app.name, "split", "分屏", "并排"],
                    app,
                    icon: "split",
                    action: { kind: "steps", steps },
                },
            });
        }
    }

    if (workspace.mode !== "desktop") {
        items.push({
            id: "workspace:home",
            label: "返回桌面",
            auxiliaryData: {
                group: "工作区",
                description: "回到主屏幕与应用网格",
                shortcut: "mod+shift+h",
                keywords: ["home", "desktop", "桌面", "主屏幕", "返回"],
                icon: "home",
                action: { kind: "steps", steps: [{ name: "home" }] },
            },
        });
    }

    if (workspace.mode !== "overview") {
        items.push({
            id: "workspace:overview",
            label: "后台应用",
            auxiliaryData: {
                group: "工作区",
                description: workspace.recent.length
                    ? `查看 ${workspace.recent.length} 个运行中的应用`
                    : "查看后台应用列表",
                shortcut: "mod+e",
                keywords: ["overview", "recent", "后台", "切换", "任务"],
                icon: "overview",
                action: { kind: "steps", steps: [{ name: "overview" }] },
            },
        });
    }

    if (canSplit && workspace.mode === "apps") {
        if (workspace.panes.length === 1 && activePane) {
            items.push({
                id: "workspace:split-start",
                label: "开启分屏",
                auxiliaryData: {
                    group: "工作区",
                    description: "将当前应用放到左侧并在右侧选择应用",
                    keywords: ["split", "分屏", "并排"],
                    icon: "split",
                    action: {
                        kind: "steps",
                        steps: [
                            {
                                name: "split",
                                input: { appId: activePane, edge: "left" },
                            },
                        ],
                    },
                },
            });
        } else if (workspace.panes.length === 2) {
            const emptyIndex = workspace.panes.indexOf(null);
            if (emptyIndex >= 0) {
                items.push({
                    id: "workspace:split-cancel",
                    label: "取消分屏",
                    auxiliaryData: {
                        group: "工作区",
                        description: "收起空白分屏区域并恢复单栏",
                        keywords: ["cancel", "collapse", "取消分屏", "单栏"],
                        icon: "collapse",
                        action: {
                            kind: "steps",
                            steps: [
                                {
                                    name: "collapse",
                                    input: {
                                        edge:
                                            emptyIndex === 0 ? "left" : "right",
                                    },
                                },
                            ],
                        },
                    },
                });
            } else {
                const leftApp = workspace.panes[0];
                if (leftApp) {
                    items.push({
                        id: "workspace:split-swap",
                        label: "交换左右分屏",
                        auxiliaryData: {
                            group: "工作区",
                            description: "对调当前两个并排应用的位置",
                            keywords: ["swap", "交换", "分屏", "左右"],
                            icon: "swap",
                            action: {
                                kind: "steps",
                                steps: [
                                    {
                                        name: "split",
                                        input: {
                                            appId: leftApp,
                                            edge: "right",
                                        },
                                    },
                                ],
                            },
                        },
                    });
                }
                if (Math.abs(workspace.ratio - 0.5) > 0.01) {
                    items.push({
                        id: "workspace:split-balance",
                        label: "恢复等宽分屏 (50% / 50%)",
                        auxiliaryData: {
                            group: "工作区",
                            description: "将左右两栏重置为均分宽度",
                            keywords: ["balance", "50", "等宽", "均分", "比例"],
                            icon: "balance",
                            action: {
                                kind: "steps",
                                steps: [
                                    { name: "resize", input: { ratio: 0.5 } },
                                ],
                            },
                        },
                    });
                }
                const collapseEdge: Placement =
                    workspace.panes[0] === activePane ? "right" : "left";
                items.push({
                    id: "workspace:split-exit",
                    label: "退出分屏（保留当前应用）",
                    auxiliaryData: {
                        group: "工作区",
                        description: "收起另一侧面板，回到单栏视图",
                        keywords: ["collapse", "single", "退出分屏", "单栏"],
                        icon: "collapse",
                        action: {
                            kind: "steps",
                            steps: [
                                {
                                    name: "collapse",
                                    input: { edge: collapseEdge },
                                },
                            ],
                        },
                    },
                });
            }
        }
    }

    if (workspace.recent.length > 0) {
        items.push({
            id: "workspace:close-all",
            label: "关闭全部后台应用",
            auxiliaryData: {
                group: "工作区",
                description: `关闭当前 ${workspace.recent.length} 个运行中的应用`,
                keywords: ["close", "clear", "全部关闭", "关闭"],
                icon: "closeAll",
                action: { kind: "closeAll" },
            },
        });
    }

    if (user) {
        items.push({
            id: "account:logout",
            label: "退出登录",
            auxiliaryData: {
                group: "账号",
                description: `${user.username} · ${formatServerHost(user.url)}`,
                keywords: ["logout", "signout", "退出", "登出", "账号"],
                icon: "logout",
                action: { kind: "requestLogout" },
            },
        });
    }

    return items;
}

export function filterWorkspaceCommands(
    items: WorkspaceCommandItem[],
    query: string,
): WorkspaceCommandItem[] {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return items;
    return items.filter((item) => {
        const haystack = [
            item.label,
            item.auxiliaryData?.description ?? "",
            ...(item.auxiliaryData?.keywords ?? []),
        ]
            .join(" ")
            .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
    });
}
