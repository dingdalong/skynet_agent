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
import { hostTheme, tokens } from "@skynet/tokens";
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

type Palette = typeof hostTheme.light | typeof hostTheme.dark;
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
    const palette = dark ? hostTheme.dark : hostTheme.light;
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
    const showWorkspaceToolbar = showDesktop || mode === "overview";
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
                <View
                    style={[styles.topbar, showDesktop && styles.desktopTopbar]}
                >
                    {showDesktop ? (
                        <IconButton
                            label="后台应用"
                            icon="overview"
                            onPress={() => execute("overview")}
                            palette={palette}
                            raised
                        />
                    ) : (
                        <>
                            <IconButton
                                label="返回桌面"
                                icon="home"
                                onPress={() => execute("home")}
                                palette={palette}
                                raised
                            />
                            <Text
                                style={[
                                    styles.topTitle,
                                    { color: palette.onWallpaper },
                                ]}
                            >
                                后台应用
                            </Text>
                        </>
                    )}
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
                                    durationMs={hostTheme.motion.standard}
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
                                        canSplit={wide}
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
    raised = false,
}: {
    label: string;
    icon: HostIcon;
    onPress(): void;
    palette: Palette;
    compact?: boolean;
    raised?: boolean;
}) {
    const { Icon: Symbol, focusProps, inputMode } = useWorkspacePlatform();
    const [hover, setHover] = useState(false);
    const [focused, setFocused] = useState(false);
    const [pressed, setPressed] = useState(false);
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            {...focusProps}
            onHoverIn={() => setHover(true)}
            onHoverOut={() => setHover(false)}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
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
                    backgroundColor: pressed
                        ? palette.selected
                        : hover
                          ? raised
                              ? palette.background
                              : palette.hover
                          : raised
                            ? palette.card
                            : "transparent",
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
                    borderRadius: Math.min(hostTheme.radius.dock, size * 0.25),
                    backgroundColor:
                        app.id === "agent" ? palette.primary : palette.card,
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
                            backgroundColor: palette.card,
                            boxShadow: [
                                {
                                    offsetX: 0,
                                    offsetY: 2,
                                    blurRadius: hostTheme.spacing[3],
                                    color: palette.shadow,
                                },
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
    const { focusProps, Feedback, Icon: Symbol } = useWorkspacePlatform();
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
                    backgroundColor:
                        dock && (hover || pressed)
                            ? pressed
                                ? palette.pressed
                                : palette.hover
                            : "transparent",
                    borderColor: focused
                        ? dock
                            ? palette.ring
                            : palette.onWallpaper
                        : "transparent",
                },
            ]}
        >
            <Feedback
                target={target}
                durationMs={hostTheme.motion.quick}
                reducedMotion={reducedMotion}
                pointerEvents="none"
                style={dock ? styles.dockGlyph : { width: size, height: size }}
            >
                {dock ? (
                    <Symbol
                        name={iconFor(app.id)}
                        tint={palette.foreground}
                        style={styles.dockGlyph}
                    />
                ) : (
                    <AppIcon app={app} palette={palette} size={size} />
                )}
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
                        { color: palette.onWallpaper },
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
    canSplit,
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
    canSplit: boolean;
    reducedMotion: boolean;
    begin(): void;
    place(value?: Placement): void;
    finish(value?: Placement): void;
    execute: Execute;
}) {
    const { Surface, focusProps, dragProps } = useWorkspacePlatform();
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
                    revealDurationMs={hostTheme.motion.quick}
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
                        { backgroundColor: palette.divider },
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
                durationMs={hostTheme.motion.standard}
                entrance={tokens.transitions.overview}
                style={styles.overviewContent}
                pointerEvents="box-none"
            >
                <Text
                    style={[
                        styles.overviewHint,
                        { color: palette.onWallpaper },
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
                        fontSize: hostTheme.type.label,
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
        gap: hostTheme.spacing[4],
        padding: hostTheme.spacing[8],
    },
    topbar: {
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: hostTheme.spacing[4],
        gap: hostTheme.spacing[3],
    },
    desktopTopbar: { justifyContent: "flex-end" },
    topTitle: {
        fontSize: hostTheme.type.heading,
        fontWeight: "600",
    },
    scene: { flex: 1 },
    iconButton: {
        width: hostTheme.button,
        height: hostTheme.button,
        borderRadius: hostTheme.radius.control,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: hostTheme.focusWidth,
    },
    symbol: { width: hostTheme.spacing[5], height: hostTheme.spacing[5] },
    compactIconButton: {
        width: hostTheme.compactButton,
        height: hostTheme.compactButton,
    },
    error: {
        padding: hostTheme.spacing[3],
        margin: hostTheme.spacing[3],
        borderRadius: hostTheme.radius.control,
    },
    desktop: {
        flex: 1,
        paddingHorizontal: hostTheme.spacing[6],
        paddingBottom: hostTheme.spacing[4],
    },
    desktopGrid: {
        paddingTop: hostTheme.spacing[6],
        paddingBottom: hostTheme.spacing[8],
        flexDirection: "row",
        gap: hostTheme.spacing[4],
        flexWrap: "wrap",
    },
    desktopItem: {
        width: 104,
        alignItems: "center",
        gap: hostTheme.spacing[2],
        padding: hostTheme.spacing[2],
        borderRadius: hostTheme.radius.card,
        borderWidth: hostTheme.focusWidth,
    },
    desktopLabel: {
        fontSize: hostTheme.type.label,
        fontWeight: "500",
    },
    appIcon: {
        alignItems: "center",
        justifyContent: "center",
        borderCurve: "continuous",
    },
    dock: {
        alignSelf: "center",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingHorizontal: hostTheme.spacing[2],
        paddingVertical: hostTheme.spacing[1],
        gap: hostTheme.spacing[1],
        borderRadius: hostTheme.radius.dock,
        borderCurve: "continuous",
    },
    dockItem: {
        alignItems: "center",
        justifyContent: "center",
        width: tokens.shell.dockIcon,
        height: tokens.touch.minimumTarget,
        borderWidth: hostTheme.focusWidth,
        borderRadius: hostTheme.radius.dock,
    },
    dockGlyph: { width: hostTheme.spacing[6], height: hostTheme.spacing[6] },
    runningDot: {
        position: "absolute",
        bottom: 1,
        width: hostTheme.spacing[1],
        height: hostTheme.spacing[1],
        borderRadius: hostTheme.spacing[1],
    },
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
        fontSize: hostTheme.type.label,
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
    failureTitle: { fontSize: hostTheme.type.heading, fontWeight: "600" },
    overview: { flex: 1, paddingTop: 48, alignItems: "center" },
    overviewContent: { alignItems: "center", gap: 48, width: "100%" },
    overviewHint: { fontSize: hostTheme.type.label },
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
        borderRadius: hostTheme.radius.card,
        borderWidth: 0.5,
        overflow: "hidden",
    },
    overviewCardHeader: {
        height: 52,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    cardTitle: { flex: 1, fontSize: hostTheme.type.label, fontWeight: "500" },
    cardPreview: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
    },
});
