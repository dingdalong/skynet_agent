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
export type SceneProps = ViewProps & {
    transitionKey: string;
    animateLayout: boolean;
    reducedMotion: boolean;
    durationMs: number;
    entrance?: { scale: number; opacity: number; offsetY: number };
};

/** Platform view details stay in the application adapter. */
export interface WorkspacePlatform {
    store: HostStore;
    Surface: ComponentType<SurfaceProps>;
    Icon: ComponentType<IconProps>;
    Wallpaper: ComponentType<WallpaperProps>;
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
