import { createContext, useContext, type ComponentType } from "react";
import type { ViewProps } from "react-native";
import type { HostStore } from "@skynet/host-bridge";

export type HostIcon =
    | "settings"
    | "agent"
    | "application"
    | "home"
    | "overview"
    | "close"
    | "restart";

export type SurfaceProps = ViewProps & {
    appId: string;
    active: boolean;
    backgroundHex: string;
    reducedMotion: boolean;
    revealDurationMs: number;
};
export type IconProps = ViewProps & { name: HostIcon; tint: string };
export type WallpaperProps = ViewProps & { colors: string[] };
export type FeedbackProps = ViewProps & {
    target: { scale: number; offsetY: number; opacity: number };
    reducedMotion: boolean;
    durationMs: number;
};
export type SceneFrameProps = ViewProps & {
    /** Map directly to the platform's native hidden state, retaining children. */
    visible: boolean;
};
export type SceneProps = ViewProps & {
    /** Animation activation only. The shared parent owns visibility and input. */
    active?: boolean;
    transitionKey: string;
    animateLayout: boolean;
    reducedMotion: boolean;
    durationMs: number;
    entrance?: { scale: number; opacity: number; offsetY: number };
};

/** Platform view details stay in the application adapter. */
export interface WorkspacePlatform {
    inputMode?: "pointer" | "touch";
    prepareLayoutTransition?(reducedMotion: boolean): void;
    setSystemChrome?(colors: string[], lightContent: boolean): void;
    store: HostStore;
    Surface: ComponentType<SurfaceProps>;
    Icon: ComponentType<IconProps>;
    Wallpaper: ComponentType<WallpaperProps>;
    Frame: ComponentType<SceneFrameProps>;
    Scene: ComponentType<SceneProps>;
    Feedback: ComponentType<FeedbackProps>;
    focusProps: Partial<ViewProps> & Record<string, unknown>;
    dragProps: Partial<ViewProps> & Record<string, unknown>;
}

export const PlatformContext = createContext<WorkspacePlatform | undefined>(
    undefined,
);

export function useWorkspacePlatform() {
    const platform = useContext(PlatformContext);
    if (!platform) throw new Error("Workspace platform adapter is required");
    return platform;
}
