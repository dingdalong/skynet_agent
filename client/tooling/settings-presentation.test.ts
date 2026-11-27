import { describe, expect, it } from "vitest";
import type { AppSummary, HostCapabilities } from "@skynet/contracts";
import {
    appStatusMeta,
    buildAboutAppRows,
    capabilitiesSummary,
    filterInstalledApps,
    formatDiagnosticSummary,
    formatVersion,
    isolationLabel,
    permissionLabel,
    platformLabel,
    searchSettings,
    sectionMeta,
    summarizeInstalledApps,
} from "../builtins/settings/src/presentation";

function makeApp(overrides: Partial<AppSummary> = {}): AppSummary {
    return {
        id: "agent",
        name: "Agent",
        version: "1.1.0",
        build: "abc123",
        builtin: true,
        permissions: ["user.identity"],
        status: "running",
        pid: 4201,
        actions: {},
        ...overrides,
    };
}

describe("settings presentation helpers", () => {
    it("searches settings entries across Chinese labels, descriptions, and English aliases", () => {
        expect(searchSettings("")).toEqual([]);
        expect(searchSettings("   ")).toEqual([]);
        expect(searchSettings("深色").map((item) => item.section)).toEqual([
            "appearance",
        ]);
        expect(searchSettings("暮色").map((item) => item.section)).toEqual([
            "wallpaper",
        ]);
        expect(
            searchSettings("reduce motion").map((item) => item.section),
        ).toEqual(["motion"]);
        expect(searchSettings("权限").map((item) => item.section)).toEqual([
            "apps",
        ]);
        expect(searchSettings("gateway").map((item) => item.section)).toEqual([
            "about",
        ]);
        expect(searchSettings("不存在的关键词")).toEqual([]);
        expect(sectionMeta("apps").label).toBe("应用管理");
    });

    it("formats versions, status metadata, and human-friendly permission labels", () => {
        expect(formatVersion("1.2.0", "deadbeef")).toBe("1.2.0+deadbeef");
        expect(formatVersion("1.2.0")).toBe("1.2.0");
        expect(formatVersion("  ")).toBe("未上报");
        expect(formatVersion(undefined, "abc")).toBe("未上报");

        expect(appStatusMeta("running")).toMatchObject({
            label: "运行中",
            badgeVariant: "success",
            pulsing: false,
        });
        expect(appStatusMeta("starting")).toMatchObject({
            label: "正在启动",
            badgeVariant: "info",
            pulsing: true,
        });
        expect(appStatusMeta("failed")).toMatchObject({
            label: "运行异常",
            badgeVariant: "error",
        });
        expect(appStatusMeta("stopped")).toMatchObject({
            label: "未运行",
            badgeVariant: "neutral",
        });

        expect(permissionLabel("host.preferences")).toBe("读写外观与系统偏好");
        expect(permissionLabel("host.apps")).toBe("管理本地已安装应用");
        expect(permissionLabel("user.identity")).toBe("读取当前登录用户身份");
        expect(permissionLabel("custom.scope")).toBe("custom.scope");
    });

    it("summarizes and filters installed apps by status, source, and multi-token query", () => {
        const apps: AppSummary[] = [
            makeApp({
                id: "agent",
                name: "Agent",
                builtin: true,
                status: "running",
            }),
            makeApp({
                id: "settings",
                name: "设置",
                builtin: true,
                status: "running",
                permissions: ["host.preferences", "host.apps"],
            }),
            makeApp({
                id: "notes",
                name: "随手记",
                builtin: false,
                status: "failed",
                permissions: ["user.identity"],
                error: "启动崩溃",
            }),
            makeApp({
                id: "timer",
                name: "计时器",
                builtin: false,
                status: "stopped",
                permissions: [],
            }),
        ];

        expect(summarizeInstalledApps(apps)).toEqual({
            total: 4,
            running: 2,
            builtin: 2,
            thirdParty: 2,
            failed: 1,
        });
        expect(
            filterInstalledApps(apps, "running", "").map((a) => a.id),
        ).toEqual(["agent", "settings"]);
        expect(
            filterInstalledApps(apps, "builtin", "").map((a) => a.id),
        ).toEqual(["agent", "settings"]);
        expect(
            filterInstalledApps(apps, "third-party", "").map((a) => a.id),
        ).toEqual(["notes", "timer"]);
        expect(
            filterInstalledApps(apps, "failed", "").map((a) => a.id),
        ).toEqual(["notes"]);
        expect(
            filterInstalledApps(apps, "all", "偏好 设置").map((a) => a.id),
        ).toEqual(["settings"]);
        expect(
            filterInstalledApps(apps, "third-party", "notes 身份").map(
                (a) => a.id,
            ),
        ).toEqual(["notes"]);
        expect(
            filterInstalledApps(apps, "all", "扩展").map((a) => a.id),
        ).toEqual(["notes", "timer"]);
        expect(filterInstalledApps(apps, "all", "不存在")).toEqual([]);
    });

    it("describes platform capabilities and builds merged about version rows", () => {
        const macCapabilities: HostCapabilities = {
            platform: "macos",
            splitView: true,
            installApplications: true,
            localDevelopment: true,
            runtimeIsolation: "process",
        };
        const iosCapabilities: HostCapabilities = {
            platform: "ios",
            splitView: true,
            installApplications: false,
            localDevelopment: false,
            runtimeIsolation: "in-process",
        };

        expect(platformLabel(macCapabilities.platform)).toBe("macOS");
        expect(isolationLabel(macCapabilities.runtimeIsolation)).toBe(
            "独立进程隔离",
        );
        expect(capabilitiesSummary(macCapabilities)).toBe(
            "支持分屏 · 允许安装扩展应用 · 支持本机执行",
        );
        expect(platformLabel(iosCapabilities.platform)).toBe("iOS");
        expect(isolationLabel(iosCapabilities.runtimeIsolation)).toBe(
            "进程内独立 VM 隔离",
        );
        expect(capabilitiesSummary(iosCapabilities)).toBe(
            "支持分屏 · 仅内置应用",
        );
        expect(capabilitiesSummary(undefined)).toBe("未上报");

        const localApps: AppSummary[] = [
            makeApp({
                id: "agent",
                name: "Agent",
                version: "1.1.0",
                build: "a1",
            }),
            makeApp({
                id: "settings",
                name: "设置",
                version: "1.2.0",
                build: "b2",
            }),
            makeApp({
                id: "offline-app",
                name: "离线应用",
                version: "0.9.0",
                build: "",
                builtin: false,
            }),
        ];

        const loadingRows = buildAboutAppRows(
            localApps,
            undefined,
            true,
            false,
        );
        expect(
            loadingRows.find((row) => row.id === "settings")?.serverVersion,
        ).toBe("仅本机");
        expect(
            loadingRows.find((row) => row.id === "agent")?.serverVersion,
        ).toBe("正在读取…");

        const errorRows = buildAboutAppRows(localApps, undefined, false, true);
        expect(errorRows.find((row) => row.id === "agent")?.statusVariant).toBe(
            "error",
        );

        const loadedRows = buildAboutAppRows(
            localApps,
            [
                { app_id: "agent", name: "Agent", version: "1.0.0+srv" },
                { app_id: "remote-only", name: "云端应用", version: "2.0.0" },
            ],
            false,
            false,
        );
        expect(loadedRows.map((row) => row.id)).toEqual([
            "agent",
            "offline-app",
            "remote-only",
            "settings",
        ]);
        expect(loadedRows.find((row) => row.id === "agent")).toMatchObject({
            localVersion: "1.1.0+a1",
            serverVersion: "1.0.0+srv",
            statusLabel: "在线",
            statusVariant: "success",
        });
        expect(
            loadedRows.find((row) => row.id === "offline-app"),
        ).toMatchObject({
            serverVersion: "未发现在线服务",
            statusVariant: "warning",
        });
        expect(
            loadedRows.find((row) => row.id === "remote-only"),
        ).toMatchObject({
            localVersion: "未安装",
            serverVersion: "2.0.0",
            statusLabel: "仅服务端",
            statusVariant: "info",
        });

        const diagnostics = formatDiagnosticSummary({
            about: {
                clientVersion: "0.3.0",
                build: "0635bcc",
                gatewayVersion: "0.2.0+gw",
                catalogRevision: 1,
            },
            capabilities: macCapabilities,
            rows: loadedRows,
        });
        expect(diagnostics).toContain("宿主客户端: 0.3.0+0635bcc");
        expect(diagnostics).toContain("Gateway 服务端: 0.2.0+gw");
        expect(diagnostics).toContain("运行平台: macOS (独立进程隔离)");
        expect(diagnostics).toContain(
            "- Agent (agent): 客户端 1.1.0+a1 / 服务端 1.0.0+srv",
        );
    });
});
