import {
    NativeEventEmitter,
    NativeModules,
    requireNativeComponent,
} from "react-native";
import type { ViewProps } from "react-native";
import { Workspace } from "@skynet/workspace";
import { createHostStore, type HostTransport } from "@skynet/host-bridge";
import type {
    HostIcon,
    FeedbackProps,
    IconProps,
    SceneProps,
    SceneFrameProps,
    SurfaceProps,
    WallpaperProps,
    WorkspacePlatform,
} from "@skynet/workspace/platform";

const native = NativeModules.SkynetHost as Pick<HostTransport, "command">;
const emitter = new NativeEventEmitter(NativeModules.SkynetHost);
const store = createHostStore({
    command: (name, input) => native.command(name, input),
    subscribe(accept) {
        const subscription = emitter.addListener("workspace", accept);
        return () => subscription.remove();
    },
});
const Symbol = requireNativeComponent<
    ViewProps & { symbol: string; tint: string }
>("SkynetIcon");
const symbols: Record<HostIcon, string> = {
    settings: "gearshape",
    agent: "sparkles",
    application: "app",
    home: "house",
    overview: "square.stack.3d.up",
    close: "xmark",
    restart: "arrow.clockwise",
};
function Icon({ name, ...props }: IconProps) {
    return <Symbol {...props} symbol={symbols[name]} />;
}

const platform: WorkspacePlatform = {
    store,
    Surface: requireNativeComponent<SurfaceProps>("SkynetSurface"),
    Icon,
    Wallpaper: requireNativeComponent<WallpaperProps>("SkynetWallpaper"),
    Frame: requireNativeComponent<SceneFrameProps>("SkynetSceneFrame"),
    Scene: requireNativeComponent<SceneProps>("SkynetScene"),
    Feedback: requireNativeComponent<FeedbackProps>("SkynetFeedback"),
    focusProps: { enableFocusRing: false },
    dragProps: { mouseDownCanMoveWindow: false },
};

export function HostApp() {
    return <Workspace platform={platform} />;
}
