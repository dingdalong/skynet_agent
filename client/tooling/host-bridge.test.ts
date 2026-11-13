import { describe, expect, it, vi } from "vitest";
import type { HostSnapshot } from "@skynet/contracts";
import { createHostStore, type HostTransport } from "@skynet/host-bridge";

const snapshot = (revision: number): HostSnapshot => ({
    revision,
    workspace: { mode: "desktop", panes: [], ratio: 0.5, recent: [] },
    preferences: {
        appearance: "system",
        wallpaper: "coast",
        reduceMotion: false,
    },
    apps: [],
    capabilities: {
        platform: "macos",
        splitView: true,
        localDevelopment: false,
        installApplications: true,
        runtimeIsolation: "process",
    },
});

describe("host subscription leases", () => {
    it("shares one native subscription, rejects stale events, and never owns native resources", async () => {
        const leases: ((value: HostSnapshot) => void)[] = [];
        const detach = vi.fn();
        const transport: HostTransport = {
            command: vi.fn(async () => snapshot(1)),
            subscribe: vi.fn((accept) => {
                leases.push(accept);
                return detach;
            }),
        };
        const store = createHostStore(transport);
        const first = vi.fn();
        const second = vi.fn();
        const stopFirst = store.subscribe(first);
        const stopSecond = store.subscribe(second);
        expect(transport.subscribe).toHaveBeenCalledTimes(1);
        leases[0](snapshot(4));
        await store.command("home");
        expect(store.getSnapshot()?.revision).toBe(4);
        expect(second).toHaveBeenCalledTimes(1);
        stopFirst();
        expect(detach).not.toHaveBeenCalled();
        stopSecond();
        expect(detach).toHaveBeenCalledTimes(1);
        leases[0](snapshot(99));
        expect(store.getSnapshot()?.revision).toBe(4);
        const stopNext = store.subscribe(first);
        stopFirst();
        expect(detach).toHaveBeenCalledTimes(1);
        leases[0](snapshot(100));
        leases[1](snapshot(5));
        expect(store.getSnapshot()?.revision).toBe(5);
        stopNext();
        stopNext();
        expect(detach).toHaveBeenCalledTimes(2);
    });

    it("propagates failed commands without inventing a new snapshot or replaying them", async () => {
        const command = vi.fn(async () => {
            throw new Error("storage unavailable");
        });
        const store = createHostStore({ command, subscribe: () => () => {} });
        await expect(store.command("open", { appId: "agent" })).rejects.toThrow(
            "storage unavailable",
        );
        expect(command).toHaveBeenCalledTimes(1);
        expect(store.getSnapshot()).toBeUndefined();
    });
});
