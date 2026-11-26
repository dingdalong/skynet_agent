import { describe, it, expect } from "vitest";
import type { AppSummary, HostSnapshot, Workspace } from "@skynet/contracts";
import { visiblePanes } from "../packages/workspace/src/Workspace";
import {
    insertionBefore,
    launcherDragCenter,
    previewPlacement,
} from "../packages/workspace/src/launcherLayout";
import {
    activePaneId,
    buildWorkspaceCommands,
    filterWorkspaceCommands,
    formatServerHost,
    overviewSplitPlan,
    splitRatioPercentages,
    validateLoginInput,
} from "../packages/workspace/src/presentation";

const split: Workspace = {
    mode: "apps",
    panes: ["settings", "agent"],
    ratio: 2 / 3,
    recent: ["agent", "settings"],
    dock: ["agent"],
    desktop: ["settings"],
};

const apps: AppSummary[] = [
    {
        id: "agent",
        name: "Agent",
        version: "1.1.0",
        builtin: true,
        permissions: [],
        status: "running",
        pid: 1,
        actions: {},
    },
    {
        id: "settings",
        name: "设置",
        version: "1.0.0",
        builtin: true,
        permissions: [],
        status: "running",
        pid: 2,
        actions: {},
    },
    {
        id: "app-center",
        name: "应用中心",
        version: "1.0.0",
        builtin: true,
        permissions: [],
        status: "stopped",
        pid: 0,
        actions: {},
    },
];

function makeSnapshot(overrides: Partial<HostSnapshot> = {}): HostSnapshot {
    return {
        revision: 1,
        user: {
            userId: "u1",
            username: "tester",
            url: "ws://127.0.0.1:18787/agent",
        },
        workspace: split,
        preferences: {
            appearance: "light",
            wallpaper: "coast",
            reduceMotion: false,
        },
        apps,
        capabilities: {
            platform: "macos",
            splitView: true,
            installApplications: true,
            localDevelopment: true,
            runtimeIsolation: "process",
        },
        ...overrides,
    };
}

describe("workspace presentation", () => {
    it.each([
        [60, 5, 10],
        [60, 49, 40],
        [57, 7, 46],
        [60, 30, 30],
    ])(
        "keeps the grab point on a %ipx tile pressed at (%i, %i)",
        (width, grabX, grabY) => {
            const bounds = { left: 120, top: 75, width, height: width };
            const centerAt = launcherDragCenter(
                bounds,
                bounds.left + grabX,
                bounds.top + grabY,
                60,
            );
            for (const [pointerX, pointerY] of [
                [108, 92],
                [510, 405],
            ]) {
                const center = centerAt(pointerX, pointerY);
                expect(pointerX - (center.x - 30)).toBeCloseTo(
                    (grabX / width) * 60,
                );
                expect(pointerY - (center.y - 30)).toBeCloseTo(
                    (grabY / width) * 60,
                );
            }
        },
    );
    it("targets the actual wrapped row and previews a move across containers", () => {
        const ids = ["settings", "notes", "calendar"];
        const slots = ids.map((id, index) => {
            const left = (index % 2) * 100;
            const top = Math.floor(index / 2) * 100;
            return {
                id,
                rect: { left, top, right: left + 60, bottom: top + 80 },
            };
        });
        expect(insertionBefore(slots, "settings", 120, 40)).toBe("calendar");
        expect(insertionBefore(slots, "calendar", 30, 40)).toBe("settings");
        expect(insertionBefore(slots, "notes", 30, 140)).toBe("");
        const layout = { desktop: ids, dock: ["agent"] };
        const before = insertionBefore(slots, "agent", 10, 130);
        expect(
            previewPlacement(layout, "agent", { area: "desktop", before }),
        ).toEqual({
            desktop: ["settings", "notes", "agent", "calendar"],
            dock: [],
        });
        expect(layout.dock).toEqual(["agent"]);
    });
    it("exposes only the recent pane at narrow widths and restores the pair", () => {
        expect(visiblePanes(split, true)).toEqual(["settings", "agent"]);
        expect(visiblePanes(split, false)).toEqual(["agent"]);
        expect(visiblePanes(split, true)).toEqual(["settings", "agent"]);
        expect(split.ratio).toBe(2 / 3);
    });
    it.each(["desktop", "overview"] as const)(
        "hides all apps in %s",
        (mode) => {
            expect(visiblePanes({ ...split, mode }, true)).toEqual([]);
        },
    );
    it("retains the empty launcher only when both panes fit", () => {
        const workspace = { ...split, panes: [null, "settings"] };
        expect(visiblePanes(workspace, false)).toEqual(["settings"]);
        expect(visiblePanes(workspace, true)).toEqual([null, "settings"]);
    });
    it("validates login url and username before submitting", () => {
        expect(
            validateLoginInput("  wss://gw.example.com/agent ", " alice "),
        ).toEqual({
            valid: true,
            url: "wss://gw.example.com/agent",
            username: "alice",
            errors: {},
        });
        expect(validateLoginInput("", "")).toEqual({
            valid: false,
            url: "",
            username: "",
            errors: {
                url: "请输入服务器地址",
                username: "请输入用户名",
            },
        });
        expect(validateLoginInput("http://127.0.0.1:18787", "alice")).toEqual({
            valid: false,
            url: "http://127.0.0.1:18787",
            username: "alice",
            errors: {
                url: "请输入有效的 ws:// 或 wss:// 服务器地址",
            },
        });
        expect(validateLoginInput("not a url", "alice").valid).toBe(false);
    });
    it("formats server host cleanly with safe fallback", () => {
        expect(formatServerHost("ws://127.0.0.1:18787/agent")).toBe(
            "127.0.0.1:18787",
        );
        expect(formatServerHost("wss://agent.example.com/ws")).toBe(
            "agent.example.com",
        );
        expect(formatServerHost("raw-host")).toBe("raw-host");
        expect(formatServerHost("   ")).toBe("");
    });
    it("resolves active pane from recent order with fallback", () => {
        expect(activePaneId(split, ["settings", "agent"])).toBe("agent");
        expect(
            activePaneId({ ...split, recent: ["settings", "agent"] }, [
                "settings",
                "agent",
            ]),
        ).toBe("settings");
        expect(activePaneId({ ...split, recent: [] }, [null, "settings"])).toBe(
            "settings",
        );
        expect(activePaneId(split, [])).toBeNull();
    });
    it("formats live split percentages and collapse labels", () => {
        expect(splitRatioPercentages(0.5)).toEqual({
            left: 50,
            right: 50,
            label: "50% · 50%",
            collapsing: false,
        });
        expect(splitRatioPercentages(1 / 3)).toEqual({
            left: 33,
            right: 67,
            label: "33% · 67%",
            collapsing: false,
        });
        expect(splitRatioPercentages(1 / 3, "left")).toEqual({
            left: 0,
            right: 100,
            label: "松手收起左侧",
            collapsing: true,
        });
        expect(splitRatioPercentages(2 / 3, "right")).toEqual({
            left: 100,
            right: 0,
            label: "松手收起右侧",
            collapsing: true,
        });
    });
    it("plans overview one-click split across existing, paired, and single states", () => {
        expect(overviewSplitPlan(split, "agent")).toEqual([
            { name: "restore", input: { appId: "agent" } },
        ]);
        expect(
            overviewSplitPlan(
                {
                    ...split,
                    mode: "overview",
                    panes: ["agent"],
                    recent: ["agent", "settings"],
                },
                "settings",
            ),
        ).toEqual([
            { name: "split", input: { appId: "agent", edge: "left" } },
            { name: "open", input: { appId: "settings" } },
        ]);
        expect(
            overviewSplitPlan(
                {
                    ...split,
                    mode: "overview",
                    panes: ["agent"],
                    recent: ["agent"],
                },
                "agent",
            ),
        ).toEqual([{ name: "split", input: { appId: "agent", edge: "left" } }]);
    });
    it("builds context-aware command palette entries across modes and widths", () => {
        const splitCommands = buildWorkspaceCommands(makeSnapshot(), {
            wide: true,
            activePane: "agent",
        });
        const splitIds = splitCommands.map((item) => item.id);
        expect(splitIds).toContain("app:open:agent");
        expect(splitIds).toContain("app:split:app-center");
        expect(splitIds).not.toContain("app:split:settings");
        expect(splitIds).toContain("workspace:split-swap");
        expect(splitIds).toContain("workspace:split-balance");
        expect(splitIds).toContain("workspace:split-exit");
        expect(splitIds).toContain("workspace:close-all");
        expect(splitIds).toContain("account:logout");
        const exitItem = splitCommands.find(
            (item) => item.id === "workspace:split-exit",
        );
        expect(exitItem?.auxiliaryData?.action).toEqual({
            kind: "steps",
            steps: [{ name: "collapse", input: { edge: "left" } }],
        });

        const emptySplitCommands = buildWorkspaceCommands(
            makeSnapshot({
                workspace: { ...split, panes: ["agent", null], ratio: 0.5 },
            }),
            { wide: true, activePane: "agent" },
        );
        expect(
            emptySplitCommands.find(
                (item) => item.id === "workspace:split-cancel",
            )?.auxiliaryData?.action,
        ).toEqual({
            kind: "steps",
            steps: [{ name: "collapse", input: { edge: "right" } }],
        });
        expect(
            emptySplitCommands.find(
                (item) => item.id === "app:split:app-center",
            )?.auxiliaryData?.action,
        ).toEqual({
            kind: "steps",
            steps: [{ name: "open", input: { appId: "app-center" } }],
        });

        const desktopNarrow = buildWorkspaceCommands(
            makeSnapshot({
                user: null,
                workspace: { ...split, mode: "desktop", recent: [] },
            }),
            { wide: false, activePane: null },
        );
        const desktopIds = desktopNarrow.map((item) => item.id);
        expect(desktopIds).not.toContain("workspace:home");
        expect(desktopIds).not.toContain("workspace:split-start");
        expect(desktopIds).not.toContain("workspace:close-all");
        expect(desktopIds).not.toContain("account:logout");
    });
    it("matches command palette items across multiple whitespace-separated tokens", () => {
        const commands = buildWorkspaceCommands(
            makeSnapshot({
                workspace: { ...split, panes: ["agent"], ratio: 0.5 },
            }),
            { wide: true, activePane: "agent" },
        );
        expect(filterWorkspaceCommands(commands, "   ")).toHaveLength(
            commands.length,
        );
        expect(
            filterWorkspaceCommands(commands, "settings split").map(
                (item) => item.id,
            ),
        ).toContain("app:split:settings");
        expect(
            filterWorkspaceCommands(commands, "设置 并排").map(
                (item) => item.id,
            ),
        ).toContain("app:split:settings");
        expect(filterWorkspaceCommands(commands, "不存在的命令")).toEqual([]);
    });
});
