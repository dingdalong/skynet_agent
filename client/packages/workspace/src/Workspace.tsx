import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
    AccessibilityInfo,
    Animated,
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
    dividerPosition,
    gripPlacement,
    splitLayout,
    stepDivider,
    type DividerAdjustment,
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
    const { store, Wallpaper, Scene } = useWorkspacePlatform();
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const command = store.command;
    const systemTheme = useColorScheme();
    const { width } = useWindowDimensions();
    const [systemReduceMotion, setSystemReduceMotion] = useState(false);
    const [error, setError] = useState<string>();
    const [draft, setDraft] = useState<Layout>();
    const [divider, setDivider] = useState<{
        ratio: number;
        active: boolean;
        collapse?: Placement;
    }>();
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
        setDraft(undefined);
        setDivider(undefined);
    }, [
        snapshot?.workspace.mode,
        snapshot?.workspace.panes.join(","),
        snapshot?.workspace.ratio,
    ]);
    const execute = (
        name: WorkspaceCommandName,
        input: Record<string, string | number> = {},
    ) => {
        setError(undefined);
        void command(name, input)
            .catch((error: Error) => setError(error.message))
            .finally(() => {
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
    const workspaceWidth = width;
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
    const showDesktop = mode === "desktop";
    const previewDesktop =
        !!divider?.collapse &&
        actual.panes[divider.collapse === "left" ? 1 : 0] === null;
    const desktopChrome = showDesktop || previewDesktop;
    const showWorkspaceToolbar = desktopChrome || mode === "overview";
    const setPlacement = (appId: string, placement?: Placement) => {
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
            <View style={styles.scene}>
                {showDesktop ? (
                    <Desktop
                        snapshot={snapshot}
                        palette={palette}
                        reducedMotion={!!reducedMotion}
                        execute={execute}
                    />
                ) : mode === "overview" ? (
                    <Overview
                        snapshot={snapshot}
                        palette={palette}
                        reducedMotion={!!reducedMotion}
                        execute={execute}
                    />
                ) : (
                    <View style={styles.panes}>
                        {panes
                            .map((id, index) => (
                                <Scene
                                    key={id ?? `desktop-${index}`}
                                    transitionKey={`${panes.length}:${index}`}
                                    animateLayout={!divider?.active}
                                    reducedMotion={!!reducedMotion}
                                    durationMs={tokens.motion.standard}
                                    entrance={
                                        id ? tokens.transitions.app : undefined
                                    }
                                    style={[
                                        styles.pane,
                                        {
                                            flex: divider?.collapse
                                                ? index ===
                                                  (divider.collapse === "left"
                                                      ? 1
                                                      : 0)
                                                    ? 1
                                                    : 0
                                                : panes.length === 1
                                                  ? 1
                                                  : index === 0
                                                    ? actual.ratio
                                                    : 1 - actual.ratio,
                                        },
                                    ]}
                                >
                                    {id ? (
                                        <AppPane
                                            app={snapshot.apps.find(
                                                (app) => app.id === id,
                                            )!}
                                            palette={palette}
                                            width={workspaceWidth}
                                            paneWidth={
                                                divider?.collapse
                                                    ? workspaceWidth
                                                    : panes.length === 1
                                                      ? workspaceWidth
                                                      : (workspaceWidth -
                                                            tokens.shell
                                                                .divider) *
                                                        (index === 0
                                                            ? actual.ratio
                                                            : 1 - actual.ratio)
                                            }
                                            reducedMotion={!!reducedMotion}
                                            execute={execute}
                                            place={(placement) =>
                                                setPlacement(id, placement)
                                            }
                                            finish={(placement) => {
                                                if (!placement) {
                                                    setDraft(undefined);
                                                    return;
                                                }
                                                setPlacement(id, placement);
                                                execute("split", {
                                                    appId: id,
                                                    edge: placement,
                                                });
                                            }}
                                        />
                                    ) : (
                                        <Desktop
                                            snapshot={snapshot}
                                            palette={palette}
                                            reducedMotion={!!reducedMotion}
                                            execute={execute}
                                            inPane={!previewDesktop}
                                        />
                                    )}
                                </Scene>
                            ))
                            .flatMap((pane, index) =>
                                index === 0
                                    ? [pane]
                                    : [
                                          <Divider
                                              key="divider"
                                              width={workspaceWidth}
                                              ratio={actual.ratio}
                                              previewingFullscreen={
                                                  !!divider?.collapse
                                              }
                                              palette={palette}
                                              onChange={(value) =>
                                                  setDivider({
                                                      ...value,
                                                      active: true,
                                                  })
                                              }
                                              onCancel={() =>
                                                  setDivider(undefined)
                                              }
                                              onEnd={(value) => {
                                                  setDivider({
                                                      ...value,
                                                      active: false,
                                                  });
                                                  if (value.collapse)
                                                      execute("collapse", {
                                                          edge: value.collapse,
                                                      });
                                                  else
                                                      execute("resize", {
                                                          ratio: value.ratio,
                                                      });
                                              }}
                                          />,
                                          pane,
                                      ],
                            )}
                    </View>
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
    const { Icon: Symbol, focusProps } = useWorkspacePlatform();
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
        <View style={styles.desktop}>
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
    reducedMotion,
    place,
    finish,
    execute,
}: {
    app: AppSummary;
    palette: Palette;
    width: number;
    paneWidth: number;
    reducedMotion: boolean;
    place(value?: Placement): void;
    finish(value?: Placement): void;
    execute: Execute;
}) {
    const { Surface, focusProps, dragProps } = useWorkspacePlatform();
    const compact = paneWidth < tokens.shell.comfortablePane;
    const latest = useRef({ width, place, finish });
    latest.current = { width, place, finish };
    const candidate = useRef<Placement | undefined>(undefined);
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                const current = latest.current;
                const next = gripPlacement(
                    gesture.moveX,
                    gesture.dx,
                    current.width,
                );
                if (next !== candidate.current) {
                    candidate.current = next;
                    current.place(next);
                }
            },
            onPanResponderRelease: () => {
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
                        style={[styles.grip, { backgroundColor: palette.ring }]}
                    />
                </View>
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
    ratio,
    previewingFullscreen,
    palette,
    onChange,
    onCancel,
    onEnd,
}: {
    width: number;
    ratio: number;
    previewingFullscreen: boolean;
    palette: Palette;
    onChange(value: DividerAdjustment): void;
    onCancel(): void;
    onEnd(value: DividerAdjustment): void;
}) {
    const { focusProps, dragProps } = useWorkspacePlatform();
    const latest = useRef({ width, ratio, onChange, onCancel, onEnd });
    latest.current = { width, ratio, onChange, onCancel, onEnd };
    const last = useRef<ReturnType<typeof dividerPosition>>({ ratio });
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                last.current = { ratio: latest.current.ratio };
            },
            onPanResponderMove: (_, gesture) => {
                const next = dividerPosition(
                    gesture.moveX,
                    latest.current.width,
                    last.current,
                );
                last.current = next;
                latest.current.onChange(next);
            },
            onPanResponderRelease: () => latest.current.onEnd(last.current),
            onPanResponderTerminate: () => latest.current.onCancel(),
        }),
    ).current;
    return (
        <View
            {...pan.panHandlers}
            accessible
            focusable
            {...dragProps}
            {...focusProps}
            style={[
                styles.divider,
                previewingFullscreen && { width: 0, opacity: 0 },
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
                    label: ratio >= 2 / 3 ? "收起右侧，左侧全屏" : "扩大左侧",
                },
                {
                    name: "decrement",
                    label: ratio <= 1 / 3 ? "收起左侧，右侧全屏" : "缩小左侧",
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
                {...dragProps}
                pointerEvents="none"
                style={[styles.dividerGrip, { backgroundColor: palette.ring }]}
            />
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
    panes: {
        flex: 1,
        flexDirection: "row",
        overflow: "hidden",
    },
    pane: {
        minWidth: 0,
    },
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
        width: tokens.shell.divider,
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
