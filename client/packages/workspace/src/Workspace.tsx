import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
    AccessibilityInfo,
    Animated,
    AppState,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    useWindowDimensions,
    View,
} from "react-native";
import type {
    AppSummary,
    HostSnapshot,
    WorkspaceCommandName,
} from "@skynet/contracts";
import { tokens } from "@skynet/tokens";
import {
    PlatformContext,
    useWorkspacePlatform,
    type HostIcon,
    type WorkspacePlatform,
} from "./platform";
import {
    beginDividerDrag,
    moveDividerDrag,
    splitFrames,
    gripPlacement,
    splitLayout,
    stepDivider,
    type DividerAdjustment,
    type DividerDrag,
    type Placement,
} from "./geometry";

type Palette = typeof tokens.light | typeof tokens.dark;
type Layout = { panes: (string | null)[]; ratio: number };
const iconFor = (id: string): HostIcon =>
    id === "settings" ? "settings" : id === "agent" ? "agent" : "application";

export function Workspace({ platform }: { platform: WorkspacePlatform }) {
    return (
        <PlatformContext.Provider value={platform}>
            <WorkspaceContent />
        </PlatformContext.Provider>
    );
}

function WorkspaceContent() {
    const {
        store,
        Wallpaper,
        Frame,
        Scene,
        prepareLayoutTransition,
        setSystemChrome,
    } = useWorkspacePlatform();
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const command = store.command;
    const systemTheme = useColorScheme();
    const { width } = useWindowDimensions();
    const [availableWidth, setAvailableWidth] = useState<number>();
    const [systemReduceMotion, setSystemReduceMotion] = useState(false);
    const [error, setError] = useState<string>();
    const [draft, setDraft] = useState<Layout>();
    const [discarded, setDiscarded] = useState<Set<string>>(new Set());
    const interaction = useRef(0);
    const activeApps = useRef<(string | null)[]>([]);
    const [divider, setDivider] = useState<{
        ratio: number;
        active: boolean;
        collapse?: Placement;
    }>();
    useEffect(() => {
        const subscription = AppState.addEventListener("memoryWarning", () => {
            setDiscarded(
                new Set(
                    snapshot?.workspace.recent.filter(
                        (id) => !activeApps.current.includes(id),
                    ),
                ),
            );
        });
        return () => subscription.remove();
    }, [snapshot?.workspace.recent.join(",")]);
    useEffect(() => {
        void AccessibilityInfo.isReduceMotionEnabled().then(
            setSystemReduceMotion,
        );
        const subscription = AccessibilityInfo.addEventListener(
            "reduceMotionChanged",
            setSystemReduceMotion,
        );
        return () => subscription.remove();
    }, []);
    const preferences = snapshot?.preferences;
    const dark =
        preferences?.appearance === "dark" ||
        (preferences?.appearance !== "light" && systemTheme === "dark");
    const palette = dark ? tokens.dark : tokens.light;
    const reducedMotion = preferences?.reduceMotion || systemReduceMotion;
    const mode = snapshot?.workspace.mode;
    useEffect(() => {
        setSystemChrome?.(
            mode === "desktop" || mode === "overview"
                ? [
                      ...tokens.wallpapers[preferences?.wallpaper ?? "coast"][
                          dark ? "dark" : "light"
                      ],
                  ]
                : [palette.card],
            dark,
        );
    }, [mode, preferences?.wallpaper, dark, palette.card, setSystemChrome]);
    useEffect(() => {
        setDraft(undefined);
        setDivider(undefined);
    }, [snapshot?.workspace.mode, snapshot?.workspace.panes.join(",")]);
    const execute = (
        name: WorkspaceCommandName,
        input: Record<string, string | number> = {},
    ) => {
        const owner = interaction.current;
        if (typeof input.appId === "string")
            setDiscarded((previous) => {
                if (!previous.has(input.appId as string)) return previous;
                const next = new Set(previous);
                next.delete(input.appId as string);
                return next;
            });
        if (name === "split" || name === "collapse")
            prepareLayoutTransition?.(!!reducedMotion);
        setError(undefined);
        void command(name, input)
            .catch((error: Error) => setError(error.message))
            .finally(() => {
                if (interaction.current !== owner) return;
                setDraft(undefined);
                setDivider(undefined);
            });
    };
    if (!snapshot)
        return (
            <View
                style={[
                    styles.loading,
                    { backgroundColor: palette.background },
                ]}
            >
                <Text style={{ color: palette.foreground }}>
                    正在载入工作空间…
                </Text>
            </View>
        );
    const actual = draft ?? {
        panes: snapshot.workspace.panes,
        ratio: divider?.ratio ?? snapshot.workspace.ratio,
    };
    const workspaceWidth = availableWidth ?? width;
    const wide =
        snapshot.capabilities.splitView &&
        workspaceWidth >=
            tokens.shell.comfortablePane * 2 + tokens.shell.divider;
    const panes =
        !wide && actual.panes.length === 2
            ? [
                  actual.panes.find(
                      (id) => id === snapshot.workspace.recent[0],
                  ) ??
                      actual.panes.find(Boolean) ??
                      null,
              ]
            : actual.panes;
    activeApps.current = mode === "apps" ? panes : [];
    const frames = splitFrames(workspaceWidth, actual.ratio, divider?.collapse);
    const showDesktop = mode === "desktop";
    const previewDesktop =
        !!divider?.collapse &&
        actual.panes[divider.collapse === "left" ? 1 : 0] === null;
    const desktopChrome = showDesktop;
    const showWorkspaceToolbar = desktopChrome || mode === "overview";
    const setPlacement = (appId: string, placement?: Placement) => {
        prepareLayoutTransition?.(!!reducedMotion);
        if (!placement) {
            setDraft(undefined);
            return;
        }
        setDraft(
            splitLayout(
                snapshot.workspace.panes,
                snapshot.workspace.ratio,
                appId,
                placement,
            ),
        );
    };
    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            <Wallpaper
                colors={[
                    ...tokens.wallpapers[preferences?.wallpaper ?? "coast"][
                        dark ? "dark" : "light"
                    ],
                ]}
                style={StyleSheet.absoluteFill}
            />
            {showWorkspaceToolbar && (
                <View style={styles.topbar}>
                    {desktopChrome ? (
                        <Text
                            style={[
                                styles.wordmark,
                                { color: palette.desktopForeground },
                            ]}
                        >
                            Skynet
                        </Text>
                    ) : (
                        <IconButton
                            label="返回桌面"
                            icon="home"
                            onPress={() => execute("home")}
                            palette={palette}
                        />
                    )}
                    <Text
                        style={[
                            styles.topTitle,
                            {
                                color: desktopChrome
                                    ? palette.desktopForeground
                                    : palette.foreground,
                            },
                        ]}
                    >
                        {desktopChrome
                            ? "WORKSPACE"
                            : mode === "overview"
                              ? "后台应用"
                              : "Skynet"}
                    </Text>
                    <IconButton
                        label="后台应用"
                        icon="overview"
                        onPress={() => execute("overview")}
                        palette={palette}
                    />
                </View>
            )}
            {error && (
                <Pressable
                    onPress={() => setError(undefined)}
                    style={[styles.error, { backgroundColor: palette.card }]}
                    accessibilityRole="alert"
                >
                    <Text style={{ color: palette.destructive }}>{error}</Text>
                </Pressable>
            )}
            <View
                style={styles.scene}
                onLayout={(event) => {
                    const next = event.nativeEvent.layout.width;
                    if (
                        availableWidth !== undefined &&
                        next !== availableWidth
                    ) {
                        ++interaction.current;
                        setDraft(undefined);
                        setDivider(undefined);
                    }
                    setAvailableWidth(next);
                }}
            >
                {snapshot.apps
                    .filter(
                        (app) =>
                            snapshot.workspace.recent.includes(app.id) &&
                            (!discarded.has(app.id) ||
                                activeApps.current.includes(app.id)),
                    )
                    .map((app) => {
                        const index =
                            mode === "apps" ? panes.indexOf(app.id) : -1;
                        const frame =
                            panes.length === 2 && index >= 0
                                ? frames.panes[index]
                                : { left: 0, width: workspaceWidth };
                        const visible = index >= 0 && frame.width > 0;
                        return (
                            <Frame
                                key={app.id}
                                testID={`app-scene-${app.id}`}
                                visible={visible}
                                collapsable={false}
                                pointerEvents={visible ? "auto" : "none"}
                                accessibilityElementsHidden={!visible}
                                importantForAccessibility={
                                    visible ? "auto" : "no-hide-descendants"
                                }
                                style={[
                                    styles.pane,
                                    frame,
                                    !visible && styles.hidden,
                                ]}
                            >
                                <Scene
                                    testID={`app-transition-${app.id}`}
                                    active={visible}
                                    transitionKey={
                                        visible
                                            ? `${panes.length}:${index}`
                                            : "hidden"
                                    }
                                    animateLayout={!divider?.active}
                                    reducedMotion={!!reducedMotion}
                                    durationMs={tokens.motion.standard}
                                    entrance={tokens.transitions.app}
                                    style={styles.appFrame}
                                >
                                    <AppPane
                                        app={app}
                                        palette={palette}
                                        width={workspaceWidth}
                                        paneWidth={frame.width}
                                        paneLeft={frame.left}
                                        active={visible}
                                        reducedMotion={!!reducedMotion}
                                        execute={execute}
                                        begin={() => {
                                            ++interaction.current;
                                            setDivider(undefined);
                                        }}
                                        place={(placement) =>
                                            setPlacement(app.id, placement)
                                        }
                                        finish={(placement) => {
                                            if (!placement) {
                                                setDraft(undefined);
                                                return;
                                            }
                                            setPlacement(app.id, placement);
                                            execute("split", {
                                                appId: app.id,
                                                edge: placement,
                                            });
                                        }}
                                    />
                                </Scene>
                            </Frame>
                        );
                    })}
                {showDesktop && (
                    <Desktop
                        snapshot={snapshot}
                        palette={palette}
                        reducedMotion={!!reducedMotion}
                        execute={execute}
                    />
                )}
                {mode === "apps" &&
                    panes.map((id, index) =>
                        id === null ? (
                            <View
                                key={`desktop-${index}`}
                                style={[
                                    styles.pane,
                                    panes.length === 2
                                        ? frames.panes[index]
                                        : { left: 0, width: workspaceWidth },
                                ]}
                            >
                                <Desktop
                                    snapshot={snapshot}
                                    palette={palette}
                                    reducedMotion={!!reducedMotion}
                                    execute={execute}
                                    inPane={!previewDesktop}
                                />
                            </View>
                        ) : null,
                    )}
                {mode === "apps" && panes.length === 2 && (
                    <Divider
                        width={workspaceWidth}
                        preview={{
                            ratio: actual.ratio,
                            collapse: divider?.collapse,
                        }}
                        palette={palette}
                        onBegin={() => {
                            ++interaction.current;
                            setDraft(undefined);
                            setDivider({ ratio: actual.ratio, active: true });
                        }}
                        onChange={(value) =>
                            setDivider({ ...value, active: true })
                        }
                        onCancel={() => setDivider(undefined)}
                        onEnd={(value) => {
                            setDivider({ ...value, active: false });
                            if (value.collapse)
                                execute("collapse", { edge: value.collapse });
                            else execute("resize", { ratio: value.ratio });
                        }}
                    />
                )}
                {mode === "overview" && (
                    <Overview
                        snapshot={snapshot}
                        palette={palette}
                        reducedMotion={!!reducedMotion}
                        execute={execute}
                    />
                )}
            </View>
        </View>
    );
}

function IconButton({
    label,
    icon,
    onPress,
    palette,
    compact = false,
}: {
    label: string;
    icon: HostIcon;
    onPress(): void;
    palette: Palette;
    compact?: boolean;
}) {
    const { Icon: Symbol, focusProps, inputMode } = useWorkspacePlatform();
    const [hover, setHover] = useState(false);
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            {...focusProps}
            onHoverIn={() => setHover(true)}
            onHoverOut={() => setHover(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
                styles.iconButton,
                compact && styles.compactIconButton,
                inputMode === "touch" && {
                    minWidth: tokens.touch.minimumTarget,
                    minHeight: tokens.touch.minimumTarget,
                },
                {
                    backgroundColor: hover ? palette.muted : "transparent",
                    borderColor: focused ? palette.ring : "transparent",
                },
            ]}
        >
            <Symbol
                name={icon}
                tint={palette.foreground}
                style={styles.symbol}
            />
        </Pressable>
    );
}

function AppIcon({
    app,
    palette,
    size = tokens.shell.desktopIcon,
}: {
    app: AppSummary;
    palette: Palette;
    size?: number;
}) {
    const { Icon: Symbol } = useWorkspacePlatform();
    return (
        <View
            style={[
                styles.appIcon,
                {
                    width: size,
                    height: size,
                    borderRadius: size * 0.26,
                    backgroundColor:
                        app.id === "agent" ? palette.primary : palette.card,
                    borderColor: palette.border,
                    boxShadow: [
                        ...tokens.elevation[
                            palette === tokens.dark ? "dark" : "light"
                        ].appIcon,
                    ],
                },
            ]}
        >
            <Symbol
                name={iconFor(app.id)}
                tint={
                    app.id === "agent"
                        ? palette.primaryForeground
                        : palette.foreground
                }
                style={{ width: size * 0.52, height: size * 0.52 }}
            />
        </View>
    );
}

type Execute = (
    name: WorkspaceCommandName,
    input?: Record<string, string | number>,
) => void;
function Desktop({
    snapshot,
    palette,
    execute,
    reducedMotion,
    inPane = false,
}: {
    snapshot: HostSnapshot;
    palette: Palette;
    execute: Execute;
    reducedMotion: boolean;
    inPane?: boolean;
}) {
    return (
        <View testID="workspace-desktop" style={styles.desktop}>
            <ScrollView contentContainerStyle={styles.desktopGrid}>
                {snapshot.apps.map((app) => {
                    const visible =
                        inPane && snapshot.workspace.panes.includes(app.id);
                    return (
                        <Launcher
                            key={app.id}
                            app={app}
                            palette={palette}
                            reducedMotion={reducedMotion}
                            disabled={visible}
                            onPress={() => execute("open", { appId: app.id })}
                        />
                    );
                })}
            </ScrollView>
            {!inPane && (
                <View
                    style={[
                        styles.dock,
                        {
                            backgroundColor: `${palette.card}cc`,
                            borderColor: `${palette.border}aa`,
                            boxShadow: [
                                ...tokens.elevation[
                                    palette === tokens.dark ? "dark" : "light"
                                ].dock,
                            ],
                        },
                    ]}
                >
                    {snapshot.apps.map((app) => (
                        <Launcher
                            key={app.id}
                            dock
                            app={app}
                            palette={palette}
                            reducedMotion={reducedMotion}
                            active={snapshot.workspace.recent.includes(app.id)}
                            onPress={() => execute("open", { appId: app.id })}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

function Launcher({
    app,
    palette,
    active,
    onPress,
    reducedMotion,
    dock = false,
    disabled = false,
}: {
    app: AppSummary;
    palette: Palette;
    active?: boolean;
    onPress(): void;
    reducedMotion: boolean;
    dock?: boolean;
    disabled?: boolean;
}) {
    const { focusProps, Feedback } = useWorkspacePlatform();
    const [hover, setHover] = useState(false);
    const [pressed, setPressed] = useState(false);
    const [focused, setFocused] = useState(false);
    const size = dock ? tokens.shell.dockIcon : tokens.shell.desktopIcon;
    const target = disabled
        ? tokens.launcher.rest
        : pressed
          ? tokens.launcher.pressed
          : hover
            ? dock
                ? tokens.launcher.dockHover
                : tokens.launcher.desktopHover
            : tokens.launcher.rest;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${dock ? "Dock " : ""}打开${app.name}`}
            disabled={disabled}
            {...focusProps}
            onHoverIn={() => setHover(true)}
            onHoverOut={() => setHover(false)}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                dock ? styles.dockItem : styles.desktopItem,
                {
                    opacity: disabled ? 0.45 : 1,
                    borderColor: focused
                        ? dock
                            ? palette.ring
                            : palette.desktopFocus
                        : "transparent",
                },
            ]}
        >
            <Feedback
                target={target}
                durationMs={tokens.motion.quick}
                reducedMotion={reducedMotion}
                pointerEvents="none"
                style={{ width: size, height: size }}
            >
                <AppIcon app={app} palette={palette} size={size} />
            </Feedback>
            {dock ? (
                <View
                    style={[
                        styles.runningDot,
                        {
                            backgroundColor: active
                                ? palette.foreground
                                : "transparent",
                        },
                    ]}
                />
            ) : (
                <Text
                    style={[
                        styles.desktopLabel,
                        { color: palette.desktopForeground },
                    ]}
                >
                    {app.name}
                    {disabled ? " · 已打开" : ""}
                </Text>
            )}
        </Pressable>
    );
}

function AppPane({
    app,
    palette,
    width,
    paneWidth,
    paneLeft,
    active,
    reducedMotion,
    begin,
    place,
    finish,
    execute,
}: {
    app: AppSummary;
    palette: Palette;
    width: number;
    paneWidth: number;
    paneLeft: number;
    active: boolean;
    reducedMotion: boolean;
    begin(): void;
    place(value?: Placement): void;
    finish(value?: Placement): void;
    execute: Execute;
}) {
    const { Surface, focusProps, dragProps, store } = useWorkspacePlatform();
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const canSplit =
        !!snapshot?.capabilities.splitView &&
        width >= tokens.shell.comfortablePane * 2 + tokens.shell.divider;
    const compact = paneWidth < tokens.shell.comfortablePane;
    const latest = useRef({ width, paneWidth, paneLeft, begin, place, finish });
    latest.current = { width, paneWidth, paneLeft, begin, place, finish };
    const origin = useRef({ x: 0, width: 0 });
    const candidate = useRef<Placement | undefined>(undefined);
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const current = latest.current;
                origin.current = {
                    x: current.paneLeft + current.paneWidth / 2,
                    width: current.width,
                };
                candidate.current = undefined;
                current.begin();
            },
            onPanResponderTerminationRequest: () => false,
            onPanResponderMove: (_, gesture) => {
                const current = latest.current;
                if (origin.current.width !== current.width) return;
                const next = gripPlacement(
                    origin.current.x + gesture.dx,
                    gesture.dx,
                    origin.current.width,
                );
                if (next !== candidate.current) {
                    candidate.current = next;
                    current.place(next);
                }
            },
            onPanResponderRelease: () => {
                if (origin.current.width === latest.current.width)
                    latest.current.finish(candidate.current);
                candidate.current = undefined;
            },
            onPanResponderTerminate: () => {
                latest.current.place();
                candidate.current = undefined;
            },
        }),
    ).current;
    return (
        <View
            style={[styles.appFrame, { backgroundColor: palette.background }]}
        >
            <View
                style={[
                    styles.paneToolbar,
                    compact && styles.compactToolbar,
                    {
                        borderBottomColor: palette.border,
                        backgroundColor: palette.card,
                    },
                ]}
            >
                <View style={styles.toolbarLeading}>
                    <IconButton
                        label="返回桌面"
                        icon="home"
                        palette={palette}
                        compact={compact}
                        onPress={() => execute("home")}
                    />
                    {!compact && (
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.paneTitle,
                                { color: palette.foreground },
                            ]}
                        >
                            {app.name}
                        </Text>
                    )}
                </View>
                {canSplit && (
                    <View
                        {...pan.panHandlers}
                        accessible
                        focusable
                        {...dragProps}
                        {...focusProps}
                        style={styles.gripArea}
                        accessibilityRole="adjustable"
                        accessibilityLabel={`拖动${app.name}进行分屏`}
                        accessibilityActions={[
                            { name: "increment", label: "放到右侧" },
                            { name: "decrement", label: "放到左侧" },
                        ]}
                        onAccessibilityAction={(event) =>
                            finish(
                                event.nativeEvent.actionName === "increment"
                                    ? "right"
                                    : "left",
                            )
                        }
                    >
                        <View
                            {...dragProps}
                            pointerEvents="none"
                            style={[
                                styles.grip,
                                { backgroundColor: palette.ring },
                            ]}
                        />
                    </View>
                )}
                <View
                    style={[
                        styles.toolbarTrailing,
                        compact && styles.compactToolbarTrailing,
                    ]}
                >
                    <IconButton
                        label="后台应用"
                        icon="overview"
                        palette={palette}
                        compact={compact}
                        onPress={() => execute("overview")}
                    />
                    <IconButton
                        label={`关闭${app.name}`}
                        icon="close"
                        palette={palette}
                        compact={compact}
                        onPress={() => execute("close", { appId: app.id })}
                    />
                </View>
            </View>
            {app.status === "failed" ? (
                <View style={styles.loading}>
                    <Text
                        style={[
                            styles.failureTitle,
                            { color: palette.foreground },
                        ]}
                    >
                        {app.name}已停止运行
                    </Text>
                    <Text
                        style={{
                            color: palette.mutedForeground,
                            maxWidth: 440,
                        }}
                    >
                        {app.error}
                    </Text>
                    <IconButton
                        label={`重新启动${app.name}`}
                        icon="restart"
                        palette={palette}
                        onPress={() => execute("restart", { appId: app.id })}
                    />
                </View>
            ) : (
                <Surface
                    key={`${app.id}:${app.version}`}
                    appId={app.id}
                    active={active}
                    backgroundHex={palette.background}
                    reducedMotion={reducedMotion}
                    revealDurationMs={tokens.motion.quick}
                    style={styles.surface}
                />
            )}
        </View>
    );
}

function Divider({
    width,
    preview,
    palette,
    onBegin,
    onChange,
    onCancel,
    onEnd,
}: {
    width: number;
    preview: DividerAdjustment;
    palette: Palette;
    onBegin(): void;
    onChange(value: DividerAdjustment): void;
    onCancel(): void;
    onEnd(value: DividerAdjustment): void;
}) {
    const { focusProps, dragProps, inputMode } = useWorkspacePlatform();
    const { ratio, collapse } = preview;
    const latest = useRef({ width, ratio, onBegin, onChange, onCancel, onEnd });
    latest.current = { width, ratio, onBegin, onChange, onCancel, onEnd };
    const drag = useRef<DividerDrag | undefined>(undefined);
    useEffect(() => {
        drag.current = undefined;
    }, [width]);
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const current = latest.current;
                drag.current = beginDividerDrag(current.ratio, current.width);
                current.onBegin();
            },
            onPanResponderTerminationRequest: () => false,
            onPanResponderMove: (_, gesture) => {
                if (
                    !drag.current ||
                    drag.current.width !== latest.current.width
                )
                    return;
                drag.current = moveDividerDrag(drag.current, gesture.dx);
                latest.current.onChange(drag.current.preview);
            },
            onPanResponderRelease: () => {
                if (!drag.current) return;
                if (drag.current.width !== latest.current.width) {
                    drag.current = undefined;
                    latest.current.onCancel();
                    return;
                }
                const value = drag.current.preview;
                drag.current = undefined;
                // A move and release can be batched before React renders.
                // Both presentation and commit must use the last accepted move.
                latest.current.onEnd(value);
            },
            onPanResponderTerminate: () => {
                drag.current = undefined;
                latest.current.onCancel();
            },
        }),
    ).current;
    return (
        <View
            {...pan.panHandlers}
            {...dragProps}
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
        >
            <View
                accessible
                focusable
                {...dragProps}
                {...focusProps}
                style={[
                    styles.divider,
                    {
                        left:
                            (width - tokens.shell.divider) * ratio -
                            (inputMode === "touch" ? 18 : 4),
                        width:
                            tokens.shell.divider +
                            (inputMode === "touch" ? 36 : 8),
                        opacity: collapse ? 0 : 1,
                    },
                ]}
                accessibilityRole="adjustable"
                accessibilityLabel="调整分屏比例"
                accessibilityValue={{
                    min: 1 / 3,
                    max: 2 / 3,
                    now: ratio,
                    text: `左侧 ${Math.round(ratio * 100)}%，右侧 ${Math.round((1 - ratio) * 100)}%`,
                }}
                accessibilityActions={[
                    {
                        name: "increment",
                        label:
                            ratio >= 2 / 3 ? "收起右侧，左侧全屏" : "扩大左侧",
                    },
                    {
                        name: "decrement",
                        label:
                            ratio <= 1 / 3 ? "收起左侧，右侧全屏" : "缩小左侧",
                    },
                ]}
                onAccessibilityAction={(event) =>
                    onEnd(
                        stepDivider(
                            ratio,
                            event.nativeEvent.actionName === "increment",
                        ),
                    )
                }
            >
                <View
                    pointerEvents="none"
                    style={[
                        styles.dividerLine,
                        { backgroundColor: `${palette.ring}44` },
                    ]}
                >
                    <View
                        {...dragProps}
                        pointerEvents="none"
                        style={[
                            styles.dividerGrip,
                            { backgroundColor: palette.ring },
                        ]}
                    />
                </View>
            </View>
        </View>
    );
}

function Overview({
    snapshot,
    palette,
    reducedMotion,
    execute,
}: {
    snapshot: HostSnapshot;
    palette: Palette;
    reducedMotion: boolean;
    execute: Execute;
}) {
    const { Scene } = useWorkspacePlatform();
    const recent = snapshot.workspace.recent
        .map((id) => snapshot.apps.find((app) => app.id === id))
        .filter((app): app is AppSummary => !!app);
    return (
        <View style={styles.overview}>
            <Pressable
                style={StyleSheet.absoluteFill}
                accessibilityLabel="后台空白区域返回桌面"
                onPress={() => execute("home")}
            />
            <Scene
                transitionKey=""
                animateLayout={false}
                reducedMotion={reducedMotion}
                durationMs={tokens.motion.standard}
                entrance={tokens.transitions.overview}
                style={styles.overviewContent}
                pointerEvents="box-none"
            >
                <Text
                    style={[
                        styles.overviewHint,
                        { color: palette.desktopHint },
                    ]}
                >
                    {recent.length
                        ? "选择应用以继续 · 向上拖动卡片关闭"
                        : "没有后台应用"}
                </Text>
                <View style={styles.overviewCards} pointerEvents="box-none">
                    {recent.map((app) => (
                        <OverviewCard
                            key={app.id}
                            app={app}
                            palette={palette}
                            execute={execute}
                        />
                    ))}
                </View>
            </Scene>
        </View>
    );
}

function OverviewCard({
    app,
    palette,
    execute,
}: {
    app: AppSummary;
    palette: Palette;
    execute: Execute;
}) {
    const { Icon: Symbol, dragProps } = useWorkspacePlatform();
    const translation = useRef(new Animated.Value(0)).current;
    const pan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dy) > 8,
            onPanResponderMove: (_, gesture) =>
                translation.setValue(Math.min(0, gesture.dy)),
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy < -72) execute("close", { appId: app.id });
                else
                    Animated.spring(translation, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
            },
        }),
    ).current;
    return (
        <Animated.View
            {...pan.panHandlers}
            {...dragProps}
            style={[
                styles.overviewCard,
                {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    transform: [{ translateY: translation }],
                },
            ]}
        >
            <View style={styles.overviewCardHeader}>
                <AppIcon app={app} palette={palette} size={26} />
                <Text style={[styles.cardTitle, { color: palette.foreground }]}>
                    {app.name}
                </Text>
                <IconButton
                    label={`后台关闭${app.name}`}
                    icon="close"
                    palette={palette}
                    onPress={() => execute("close", { appId: app.id })}
                />
            </View>
            <Pressable
                style={[
                    styles.cardPreview,
                    { backgroundColor: palette.background },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`继续${app.name}`}
                onPress={() => execute("restore", { appId: app.id })}
            >
                <Symbol
                    name={iconFor(app.id)}
                    tint={palette.ring}
                    style={{ width: 44, height: 44 }}
                />
                <Text
                    style={{
                        color: palette.mutedForeground,
                        fontSize: tokens.type.supporting,
                    }}
                >
                    继续使用{app.name}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: 32,
    },
    topbar: {
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
    },
    wordmark: {
        fontSize: 20,
        fontWeight: "600",
        letterSpacing: -0.8,
    },
    topTitle: {
        position: "absolute",
        left: 100,
        right: 100,
        textAlign: "center",
        fontSize: tokens.type.caption,
        letterSpacing: 1.5,
    },
    scene: { flex: 1 },
    iconButton: {
        width: tokens.shell.button,
        height: tokens.shell.button,
        borderRadius: tokens.radius.control,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
    },
    symbol: { width: 19, height: 19 },
    compactIconButton: {
        width: tokens.shell.compactButton,
        height: tokens.shell.compactButton,
    },
    error: { padding: 12, margin: 12, borderRadius: tokens.radius.control },
    desktop: { flex: 1, paddingHorizontal: 28, paddingBottom: 24 },
    desktopGrid: {
        paddingTop: 52,
        paddingBottom: 30,
        flexDirection: "row",
        gap: 26,
        flexWrap: "wrap",
    },
    desktopItem: {
        width: 104,
        alignItems: "center",
        gap: 14,
        padding: 8,
        borderRadius: 18,
        borderWidth: 2,
    },
    desktopLabel: {
        fontSize: tokens.type.label,
        textShadowColor: "#00000044",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
    },
    appIcon: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0.5,
        overflow: "visible",
    },
    dock: {
        alignSelf: "center",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 16,
        borderRadius: tokens.radius.dock,
        borderWidth: 0.5,
        overflow: "visible",
    },
    dockItem: {
        alignItems: "center",
        gap: 5,
        borderWidth: 2,
        borderRadius: 16,
        padding: 3,
    },
    runningDot: { width: 3, height: 3, borderRadius: 2 },
    pane: {
        position: "absolute",
        top: 0,
        bottom: 0,
        minWidth: 0,
        overflow: "hidden",
    },
    // The stable parent owns visibility; native animation only owns its child.
    // display:none would discard the retained Fabric/WebView subtree.
    hidden: { opacity: 0 },
    appFrame: { flex: 1 },
    paneToolbar: {
        height: tokens.shell.toolbar,
        borderBottomWidth: 0.5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
    toolbarLeading: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: "50%",
        paddingRight: tokens.shell.gripWidth / 2 + 8,
    },
    compactToolbar: { paddingHorizontal: 8 },
    compactToolbarTrailing: { gap: 0 },
    toolbarTrailing: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
    },
    paneTitle: {
        fontSize: tokens.type.label,
        fontWeight: "500",
        flexShrink: 1,
    },
    gripArea: {
        position: "absolute",
        left: "50%",
        marginLeft: -tokens.shell.gripWidth / 2,
        width: tokens.shell.gripWidth,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    grip: { width: 34, height: 5, borderRadius: 3, opacity: 0.5 },
    surface: { flex: 1 },
    divider: {
        position: "absolute",
        top: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    dividerLine: {
        width: tokens.shell.divider,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    dividerGrip: { height: 34, width: 3, borderRadius: 2 },
    failureTitle: { fontSize: 19, fontWeight: "600" },
    overview: { flex: 1, paddingTop: 48, alignItems: "center" },
    overviewContent: { alignItems: "center", gap: 48, width: "100%" },
    overviewHint: { fontSize: tokens.type.supporting },
    overviewCards: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 24,
        paddingHorizontal: 24,
    },
    overviewCard: {
        width: 300,
        height: 244,
        borderRadius: tokens.radius.window,
        borderWidth: 0.5,
        overflow: "hidden",
        shadowColor: "#000000",
        shadowRadius: 24,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 12 },
    },
    overviewCardHeader: {
        height: 52,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    cardTitle: { flex: 1, fontSize: tokens.type.label, fontWeight: "500" },
    cardPreview: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
    },
});
