import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostSnapshot } from "@skynet/contracts";
import { Workspace } from "../packages/workspace/src/Workspace";
import { tokens } from "@skynet/tokens";
import { splitFrames } from "../packages/workspace/src/geometry";
import type {
    SceneProps,
    WorkspacePlatform,
} from "../packages/workspace/src/platform";

type NativeView = {
    testID?: string;
    collapsable?: boolean;
    visible?: boolean;
    pointerEvents?: string;
    accessibilityElementsHidden?: boolean;
    importantForAccessibility?: string;
    style?: unknown;
    children?: ReactNode;
};
const captured = vi.hoisted(() => ({
    frames: new Map<string, NativeView>(),
    animations: new Map<string, SceneProps>(),
    width: 1280,
}));
vi.mock("react", async (original) => ({
    ...(await original<typeof import("react")>()),
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
}));
vi.mock("react-native", async () => {
    const { createElement } = await import("react");
    function View(props: NativeView) {
        if (props.testID?.startsWith("app-scene-"))
            captured.frames.set(props.testID, props);
        return createElement("div", null, props.children);
    }
    return {
        View,
        Text: View,
        Pressable: View,
        ScrollView: View,
        Animated: { View, Value: class {} },
        PanResponder: { create: () => ({ panHandlers: {} }) },
        StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
        useWindowDimensions: () => ({
            width: captured.width,
            height: 820,
        }),
        useColorScheme: () => "light",
    };
});

function style(input: unknown): Record<string, unknown> {
    if (Array.isArray(input))
        return Object.assign({}, ...input.map((value) => style(value)));
    return input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {};
}

function render(
    workspace: HostSnapshot["workspace"],
    preferences: HostSnapshot["preferences"] = {
        appearance: "light",
        wallpaper: "coast",
        reduceMotion: false,
    },
) {
    const snapshot: HostSnapshot = {
        revision: 1,
        workspace,
        preferences,
        apps: ["agent", "settings"].map((id) => ({
            id,
            name: id,
            version: "1.0.0",
            builtin: true,
            permissions: [],
            status: "running",
            pid: 1,
            actions: {},
        })),
        capabilities: {
            platform: "ios",
            splitView: true,
            localDevelopment: false,
            installApplications: false,
            runtimeIsolation: "in-process",
        },
    };
    const passthrough = ({ children }: { children?: ReactNode }) =>
        createElement("div", null, children);
    const platform: WorkspacePlatform = {
        store: {
            getSnapshot: () => snapshot,
            subscribe: () => () => {},
            command: vi.fn(async () => {}),
        },
        // Deliberately renders its children even when inactive: native animation
        // may still deliver a visible final frame after the workspace switches.
        Scene(props) {
            if (props.testID) captured.animations.set(props.testID, props);
            return createElement("div", null, props.children);
        },
        Frame: ({ visible, ...props }) => {
            captured.frames.set(props.testID!, { ...props, visible });
            return createElement("div", null, props.children);
        },
        Surface: passthrough,
        Icon: passthrough,
        Wallpaper: passthrough,
        Feedback: passthrough,
        focusProps: {},
        dragProps: {},
    };
    renderToStaticMarkup(createElement(Workspace, { platform }));
}

function frame(id: string, visible: boolean) {
    const parent = captured.frames.get(`app-scene-${id}`);
    expect(parent, `${id} needs a stable shared scene container`).toBeDefined();
    expect(parent!.collapsable).toBe(false);
    expect(parent!.visible).toBe(visible);
    expect(style(parent!.style).opacity ?? 1).toBe(visible ? 1 : 0);
    expect(parent!.pointerEvents).toBe(visible ? "auto" : "none");
    expect(parent!.accessibilityElementsHidden).toBe(!visible);
    expect(parent!.importantForAccessibility).toBe(
        visible ? "auto" : "no-hide-descendants",
    );
    const animation = captured.animations.get(`app-transition-${id}`);
    expect(animation).toBeDefined();
    expect(animation!.active).toBe(visible);
    expect(style(animation!.style).opacity).toBeUndefined();
    return style(parent!.style);
}

describe("shared workspace presentation ownership", () => {
    beforeEach(() => {
        captured.frames.clear();
        captured.animations.clear();
        captured.width = 1280;
    });
    it.each(["desktop", "overview"] as const)(
        "keeps retained applications inert in %s even when the platform still renders them",
        (mode) => {
            render({
                mode,
                panes: [],
                ratio: 1 / 2,
                recent: ["agent", "settings"],
            });
            frame("agent", false);
            frame("settings", false);
        },
    );
    it("exposes only the foreground application without discarding other presentations", () => {
        render({
            mode: "apps",
            panes: ["agent"],
            ratio: 1 / 2,
            recent: ["agent", "settings"],
        });
        frame("agent", true);
        frame("settings", false);
        expect(captured.animations.size).toBe(2);
    });
    it("owns both split rectangles outside the platform animation", () => {
        render({
            mode: "apps",
            panes: ["agent", "settings"],
            ratio: 1 / 3,
            recent: ["agent", "settings"],
        });
        const frames = splitFrames(captured.width, 1 / 3);
        expect(frame("agent", true)).toMatchObject(frames.panes[0]);
        expect(frame("settings", true)).toMatchObject(frames.panes[1]);
    });
    it("keeps the temporarily occluded split application inert at a narrow width", () => {
        captured.width = 393;
        render({
            mode: "apps",
            panes: ["settings", "agent"],
            ratio: 1 / 3,
            recent: ["agent", "settings"],
        });
        frame("agent", true);
        frame("settings", false);
    });
    it("restores both iPad panes and their ratio when the workspace grows past the split threshold", () => {
        const workspace: HostSnapshot["workspace"] = {
            mode: "apps",
            panes: ["settings", "agent"],
            ratio: 2 / 3,
            recent: ["agent", "settings"],
        };
        const minimum = tokens.shell.comfortablePane * 2 + tokens.shell.divider;
        for (const width of [1024, minimum - 1, minimum]) {
            captured.width = width;
            render(workspace);
            const frames = splitFrames(width, workspace.ratio).panes;
            expect(frame("agent", true)).toMatchObject(
                width < minimum ? { left: 0, width } : frames[1],
            );
            const other = frame("settings", width >= minimum);
            if (width >= minimum) expect(other).toMatchObject(frames[0]);
        }
    });
    it.each([false, true])(
        "keeps hidden presentations inert through theme and motion preferences (reduced motion %s)",
        (reduceMotion) => {
            render(
                {
                    mode: "desktop",
                    panes: [],
                    ratio: 1 / 2,
                    recent: ["agent", "settings"],
                },
                { appearance: "dark", wallpaper: "forest", reduceMotion },
            );
            frame("agent", false);
            frame("settings", false);
        },
    );
});
