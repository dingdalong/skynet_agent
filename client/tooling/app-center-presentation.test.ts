import { describe, expect, it } from "vitest";
import type { AppSummary } from "@skynet/contracts";
import {
    buildDiscoverCatalog,
    coverForApp,
    filterAndSortDiscoverApps,
    filterServices,
    formatVersionBadge,
    localStatusLabel,
    serviceDisplayName,
    serviceStatusMeta,
    shortImageId,
    summarizeServices,
    validateAdminToken,
    type Directory,
    type Service,
} from "../builtins/app-center/src/presentation";

const localApps: AppSummary[] = [
    {
        id: "agent",
        name: "Agent",
        version: "1.1.0",
        builtin: true,
        permissions: ["network", "user.identity"],
        status: "running",
        pid: 1001,
        actions: {},
    },
    {
        id: "app-center",
        name: "应用中心",
        version: "1.1.0",
        builtin: true,
        permissions: ["user.identity"],
        status: "stopped",
        pid: 0,
        actions: {},
    },
];

function makeService(partial: Partial<Service> & { app_id: string }): Service {
    return {
        name: "",
        instances: 0,
        enabled: false,
        transition: "",
        desired: false,
        can_set_enabled: false,
        ...partial,
    };
}

describe("app-center presentation helpers", () => {
    it("resolves covers by appId first and falls back to name", () => {
        expect(coverForApp("自定义名", "agent")).toBe("./covers/agent.webp");
        expect(coverForApp("应用中心")).toBe("./covers/app-center.webp");
        expect(coverForApp("日历", "calendar")).toBeUndefined();
    });

    it("formats version badges and shortens long docker digests", () => {
        expect(formatVersionBadge("1.2.3")).toBe("v1.2.3");
        expect(formatVersionBadge("v2.0.0")).toBe("v2.0.0");
        expect(formatVersionBadge("  ")).toBe("");
        expect(
            shortImageId(
                "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            ),
        ).toBe("sha256:0123456789ab");
        expect(shortImageId("short-id")).toBe("short-id");
        expect(shortImageId("abcdefghijklmnopqrstuvwxyz")).toBe(
            "abcdefghijklmnopqrstu…",
        );
        expect(shortImageId("")).toBe("—");
    });

    it("validates admin token input", () => {
        expect(validateAdminToken("")).toBe("请输入管理令牌");
        expect(validateAdminToken("   ")).toBe("请输入管理令牌");
        expect(validateAdminToken("secret-token")).toBeNull();
    });

    it("builds discover catalog merging online metadata and local apps", () => {
        const directory: Directory = {
            names: ["Agent", "应用中心", "日历"],
            online: [
                { app_id: "agent", name: "Agent", version: "1.1.0" },
                { app_id: "app-center", name: "应用中心", version: "0.4.0" },
                { app_id: "calendar", name: "日历", version: "0.1.0" },
            ],
            services: [],
            administrator: false,
        };
        const items = buildDiscoverCatalog(directory, localApps);
        expect(items).toHaveLength(3);
        expect(items[0]).toMatchObject({
            name: "Agent",
            appId: "agent",
            version: "1.1.0",
            cover: "./covers/agent.webp",
            isPlatformCore: false,
        });
        expect(items[0].localApp?.status).toBe("running");
        expect(items[1]).toMatchObject({
            name: "应用中心",
            appId: "app-center",
            isPlatformCore: true,
        });
        expect(items[2]).toMatchObject({
            name: "日历",
            appId: "calendar",
            version: "0.1.0",
            cover: undefined,
            localApp: undefined,
        });
    });

    it("handles discover catalog when online list is absent", () => {
        const directory: Directory = {
            names: ["Agent", "日历"],
            services: [],
            administrator: false,
        };
        const items = buildDiscoverCatalog(directory, localApps);
        expect(items[0].appId).toBe("agent");
        expect(items[0].cover).toBe("./covers/agent.webp");
        expect(items[1].appId).toBeUndefined();
        expect(items[1].cover).toBeUndefined();
    });

    it("filters with multi-token search and sorts without mutating input", () => {
        const directory: Directory = {
            names: ["应用中心", "Agent", "日历"],
            online: [
                { app_id: "app-center", name: "应用中心", version: "1.1.0" },
                { app_id: "agent", name: "Agent", version: "2.3.0" },
                { app_id: "calendar", name: "日历", version: "0.9.0" },
            ],
            services: [],
            administrator: false,
        };
        const catalog = buildDiscoverCatalog(directory, localApps);
        expect(
            filterAndSortDiscoverApps(catalog, "agent 2.3").map((x) => x.name),
        ).toEqual(["Agent"]);
        const asc = filterAndSortDiscoverApps(catalog, "", "name-asc").map(
            (x) => x.name,
        );
        const desc = filterAndSortDiscoverApps(catalog, "", "name-desc").map(
            (x) => x.name,
        );
        expect(asc.indexOf("日历")).toBeLessThan(asc.indexOf("应用中心"));
        expect(desc).toEqual([...asc].reverse());
        expect(catalog.map((x) => x.name)).toEqual([
            "应用中心",
            "Agent",
            "日历",
        ]);
    });

    it("computes service status metadata across all transitions", () => {
        expect(
            serviceStatusMeta(
                makeService({ app_id: "a", transition: "enabling" }),
            ),
        ).toMatchObject({
            label: "正在启动",
            badgeVariant: "warning",
            pulsing: true,
            changing: true,
            attention: true,
        });
        expect(
            serviceStatusMeta(
                makeService({
                    app_id: "b",
                    enabled: false,
                    transition: "disable_failed",
                }),
            ),
        ).toMatchObject({
            label: "停用未完成",
            badgeVariant: "error",
            failed: true,
            attention: true,
            nextEnabled: false,
            toggleLabel: "重试变更",
        });
        expect(
            serviceStatusMeta(
                makeService({
                    app_id: "c",
                    enabled: false,
                    transition: "enable_failed",
                }),
            ),
        ).toMatchObject({
            label: "启动失败",
            nextEnabled: true,
            toggleLabel: "重试变更",
        });
        expect(
            serviceStatusMeta(
                makeService({ app_id: "d", transition: "unavailable" }),
            ),
        ).toMatchObject({
            label: "连接中断",
            badgeVariant: "error",
            attention: true,
        });
        expect(
            serviceStatusMeta(makeService({ app_id: "e", enabled: true })),
        ).toMatchObject({
            label: "运行中",
            badgeVariant: "success",
            nextEnabled: false,
            toggleLabel: "停用",
        });
        expect(
            serviceStatusMeta(makeService({ app_id: "f", desired: true })),
        ).toMatchObject({
            label: "等待启动",
            badgeVariant: "warning",
            nextEnabled: true,
            toggleLabel: "启用",
        });
    });

    it("summarizes and filters services accurately", () => {
        const services: Service[] = [
            makeService({
                app_id: "app-center",
                name: "应用中心",
                enabled: true,
                instances: 1,
            }),
            makeService({
                app_id: "agent",
                name: "Agent",
                enabled: true,
                instances: 1,
                approved: {
                    request_id: "r1",
                    name: "Agent",
                    image: "skynet/agent:1.1",
                    image_id: "sha256:123",
                    accepted: true,
                    reviewer: "alice",
                },
            }),
            makeService({
                app_id: "echo",
                pending: {
                    request_id: "r2",
                    name: "回显服务",
                    image: "skynet/echo:0.2",
                    image_id: "sha256:456",
                    accepted: false,
                    reviewer: "",
                },
            }),
            makeService({
                app_id: "broken",
                name: "故障服务",
                transition: "enable_failed",
                last: {
                    request_id: "r3",
                    name: "故障服务",
                    image: "skynet/broken:0.1",
                    image_id: "",
                    accepted: true,
                    reviewer: "bob",
                },
            }),
        ];
        expect(summarizeServices(services)).toEqual({
            total: 4,
            running: 2,
            pending: 1,
            stopped: 2,
            attention: 1,
        });
        expect(
            filterServices(services, "", "pending").map((s) => s.app_id),
        ).toEqual(["echo"]);
        expect(
            filterServices(services, "", "running").map((s) => s.app_id),
        ).toEqual(["app-center", "agent"]);
        expect(
            filterServices(services, "", "stopped").map((s) => s.app_id),
        ).toEqual(["echo", "broken"]);
        expect(
            filterServices(services, "", "attention").map((s) => s.app_id),
        ).toEqual(["broken"]);
        expect(
            filterServices(services, "bob 故障", "all").map((s) => s.app_id),
        ).toEqual(["broken"]);
        expect(serviceDisplayName(services[2])).toBe("回显服务");
        expect(localStatusLabel("running")).toBe("本地运行中");
        expect(localStatusLabel(undefined)).toBe("服务端可用");
    });
});
