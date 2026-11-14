import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostSnapshot } from "@skynet/contracts";
import { tokens } from "@skynet/tokens";
import { Workspace } from "../packages/workspace/src/Workspace";
import type { WorkspacePlatform } from "../packages/workspace/src/platform";

type Gesture = {
    onPanResponderGrant(event: { nativeEvent: { pageX: number } }): void;
    onPanResponderMove(event: unknown, gesture: { dx: number }): void;
    onPanResponderRelease(): void;
    onPanResponderTerminate(): void;
};
const captured = vi.hoisted(() => ({
    divider: undefined as Gesture | undefined,
}));

// No render occurs between these callbacks: native input can deliver move and
// release in one batch. Keeping the previous rendered ratio must not lose input.
vi.mock("react", async (original) => ({
    ...(await original<typeof import("react")>()),
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
}));
vi.mock("react-native", async () => {
    const { createElement } = await import("react");
    function View(props: {
        children?: ReactNode;
        pointerEvents?: string;
        gestureForTest?: Gesture;
    }) {
        if (props.pointerEvents === "box-none" && props.gestureForTest)
            captured.divider = props.gestureForTest;
        return createElement("div", null, props.children);
    }
    return {
        View,
        Text: View,
        Pressable: View,
        ScrollView: View,
        Animated: { View },
        PanResponder: {
            create: (gesture: Gesture) => ({
                panHandlers: { gestureForTest: gesture },
            }),
        },
        StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
        useWindowDimensions: () => ({ width: 1280, height: 820 }),
        useColorScheme: () => "light",
    };
});

function begin(ratio: number) {
    const snapshot: HostSnapshot = {
        revision: 1,
        workspace: {
            mode: "apps",
            panes: ["settings", null],
            ratio,
            recent: ["settings"],
        },
        preferences: {
            appearance: "light",
            wallpaper: "coast",
            reduceMotion: false,
        },
        apps: [
            {
                id: "settings",
                name: "设置",
                version: "1.0.0",
                builtin: true,
                permissions: [],
                status: "running",
                pid: 1,
                actions: {},
            },
        ],
        capabilities: {
            platform: "macos",
            splitView: true,
            localDevelopment: true,
            installApplications: true,
            runtimeIsolation: "process",
        },
    };
    const passthrough = ({ children }: { children?: ReactNode }) =>
        createElement("div", null, children);
    const command = vi.fn(async () => {});
    const platform: WorkspacePlatform = {
        store: {
            getSnapshot: () => snapshot,
            subscribe: () => () => {},
            command,
        },
        Scene: passthrough,
        Frame: passthrough,
        Surface: passthrough,
        Icon: passthrough,
        Wallpaper: passthrough,
        Feedback: passthrough,
        focusProps: {},
        dragProps: {},
    };
    renderToStaticMarkup(createElement(Workspace, { platform }));
    const divider = captured.divider!;
    expect(divider).toBeDefined();
    divider.onPanResponderGrant({ nativeEvent: { pageX: 0 } });
    return { divider, command };
}

describe("workspace batched native input", () => {
    beforeEach(() => {
        captured.divider = undefined;
    });
    it("commits the final resize preview before another render", () => {
        const { divider, command } = begin(1 / 2);
        divider.onPanResponderMove(null, { dx: -120 });
        divider.onPanResponderRelease();
        expect(command).toHaveBeenCalledWith("resize", {
            ratio: 1 / 2 - 120 / (1280 - tokens.shell.divider),
        });
    });
    it("commits fullscreen when the accepted preview has crossed the confirmation distance", () => {
        const { divider, command } = begin(2 / 3);
        divider.onPanResponderMove(null, {
            dx: tokens.shell.collapseDistance,
        });
        divider.onPanResponderRelease();
        expect(command).toHaveBeenCalledWith("collapse", { edge: "right" });
    });
    it("locks a fast first movement, then accepts a deliberate further push in the same batch", () => {
        const { divider, command } = begin(1 / 2);
        divider.onPanResponderMove(null, { dx: 400 });
        divider.onPanResponderMove(null, {
            dx: 400 + tokens.shell.collapseDistance,
        });
        divider.onPanResponderRelease();
        expect(command).toHaveBeenCalledWith("collapse", { edge: "right" });
    });
    it("cancels a preview without persisting a layout", () => {
        const { divider, command } = begin(1 / 2);
        divider.onPanResponderMove(null, { dx: -400 });
        divider.onPanResponderTerminate();
        divider.onPanResponderRelease();
        expect(command).not.toHaveBeenCalled();
    });
});
