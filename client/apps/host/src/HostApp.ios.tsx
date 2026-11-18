import {
    Animated,
    Image,
    LayoutAnimation,
    StyleSheet,
    View,
    NativeEventEmitter,
    NativeModules,
    requireNativeComponent,
} from "react-native";
import { useEffect, useRef } from "react";
import { Workspace } from "@skynet/workspace";
import { hostTheme } from "@skynet/tokens";
import { createHostStore, type HostTransport } from "@skynet/host-bridge";
import type {
    FeedbackProps,
    HostIcon,
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
    const { tint, ...viewProps } = props;
    return (
        <View {...viewProps}>
            <Image
                style={StyleSheet.absoluteFill}
                source={{ uri: `skynet-symbol://${symbols[name]}` }}
                tintColor={tint}
                resizeMode="contain"
            />
        </View>
    );
}

function Feedback({
    target,
    reducedMotion,
    durationMs,
    children,
    ...props
}: FeedbackProps) {
    const scale = useRef(new Animated.Value(1)).current;
    const offset = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const animation = Animated.parallel([
            Animated.timing(scale, {
                toValue: reducedMotion ? 1 : target.scale,
                duration: reducedMotion ? 0 : durationMs,
                useNativeDriver: true,
            }),
            Animated.timing(offset, {
                toValue: reducedMotion ? 0 : target.offsetY,
                duration: reducedMotion ? 0 : durationMs,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: target.opacity,
                duration: reducedMotion ? 0 : durationMs,
                useNativeDriver: true,
            }),
        ]);
        animation.start();
        return () => animation.stop();
    }, [target, reducedMotion, durationMs, scale, offset, opacity]);
    return (
        <Animated.View
            {...props}
            style={[
                props.style,
                { opacity, transform: [{ scale }, { translateY: offset }] },
            ]}
        >
            {children}
        </Animated.View>
    );
}
function Scene({
    active = true,
    entrance,
    reducedMotion,
    durationMs,
    transitionKey: _key,
    animateLayout: _layout,
    children,
    ...props
}: SceneProps) {
    const opacity = useRef(
        new Animated.Value(reducedMotion ? 1 : (entrance?.opacity ?? 1)),
    ).current;
    const scale = useRef(
        new Animated.Value(reducedMotion ? 1 : (entrance?.scale ?? 1)),
    ).current;
    const offset = useRef(
        new Animated.Value(reducedMotion ? 0 : (entrance?.offsetY ?? 0)),
    ).current;
    useEffect(() => {
        if (!active) return;
        opacity.setValue(reducedMotion ? 1 : (entrance?.opacity ?? 1));
        scale.setValue(reducedMotion ? 1 : (entrance?.scale ?? 1));
        offset.setValue(reducedMotion ? 0 : (entrance?.offsetY ?? 0));
        const animation = Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: reducedMotion ? 0 : durationMs,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 1,
                duration: reducedMotion ? 0 : durationMs,
                useNativeDriver: true,
            }),
            Animated.timing(offset, {
                toValue: 0,
                duration: reducedMotion ? 0 : durationMs,
                useNativeDriver: true,
            }),
        ]);
        animation.start();
        return () => {
            animation.stop();
            opacity.setValue(1);
            scale.setValue(1);
            offset.setValue(0);
        };
    }, [active, reducedMotion, durationMs, opacity, scale, offset, entrance]);
    return (
        <Animated.View
            {...props}
            style={[
                props.style,
                {
                    opacity,
                    transform: [{ scale }, { translateY: offset }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}
const platform: WorkspacePlatform = {
    store,
    Surface: requireNativeComponent<SurfaceProps>("SkynetSurface"),
    Icon,
    Wallpaper: requireNativeComponent<WallpaperProps>("SkynetWallpaper"),
    Frame: requireNativeComponent<SceneFrameProps>("SkynetSceneFrame"),
    Scene,
    Feedback,
    prepareLayoutTransition(reducedMotion) {
        if (!reducedMotion)
            LayoutAnimation.configureNext({
                duration: hostTheme.motion.standard,
                update: { type: "easeInEaseOut" },
            });
    },
    setSystemChrome(colors, lightContent) {
        NativeModules.SkynetHost.setChrome(colors, lightContent);
    },
    focusProps: {},
    dragProps: {},
    inputMode: "touch",
};

export function HostApp() {
    return <Workspace platform={platform} />;
}
