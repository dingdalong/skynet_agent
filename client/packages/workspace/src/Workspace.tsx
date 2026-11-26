import {
    Fragment,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    AlertDialog,
    Badge,
    Button,
    Card,
    Center,
    DropdownMenu,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Icon,
    IconButton,
    MoreMenu,
    OverflowList,
    ResizeHandle,
    StatusDot,
    Text,
    Toolbar,
    useToast,
    VStack,
} from "@astryxdesign/core";
import {
    ExclamationTriangleIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    Squares2X2Icon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { useHotkeys, usePanGesture } from "@astryxdesign/core/hooks";
import type {
    AppSummary,
    HostSnapshot,
    Json,
    PaneToolbar,
    PaneToolbarItem,
    WorkspaceCommandName,
} from "@skynet/contracts";
import { tokens } from "@skynet/tokens";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { AppArtwork, Launchers } from "./Launchers";
import {
    beginDividerDrag,
    gripPlacement,
    moveDividerDrag,
    splitFrames,
    type DividerDrag,
    type Placement,
} from "./geometry";
import {
    activePaneId,
    formatServerHost,
    overviewSplitPlan,
    splitRatioPercentages,
    type CommandStep,
    type PaletteAction,
} from "./presentation";

type Execute = (
    name: WorkspaceCommandName,
    input?: Record<string, Json>,
) => Promise<boolean>;
type ShellProps = {
    snapshot: HostSnapshot;
    execute: Execute;
    errors: Record<string, string>;
    retry: (id: string) => void;
    toolbars: Record<string, PaneToolbar>;
    activate: (appId: string, document: string, action: string) => void;
};
const control = (
    label: string,
    icon: "chevronLeft" | "chevronsLeft" | "chevronsRight" | "close" | "copy",
    click: () => void,
) => (
    <IconButton
        icon={<Icon icon={icon === "chevronLeft" ? HomeIcon : icon} />}
        label={label}
        tooltip={label}
        variant="ghost"
        onClick={click}
    />
);

function RecentApp({
    app,
    execute,
    wide,
    canSplit,
    statusLabel,
    onSplit,
}: {
    app: AppSummary;
    execute: Execute;
    wide: boolean;
    canSplit: boolean;
    statusLabel?: string;
    onSplit: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    usePanGesture(ref, {
        axis: "y",
        onPan: ({ state, translation }) => {
            if (state === "ended" && translation.y < -72)
                execute("close", { appId: app.id });
        },
    });
    return (
        <Card ref={ref} padding={3} elevation="low">
            <HStack align="center" justify="between" gap={1.5}>
                <Button
                    label={app.name}
                    variant="ghost"
                    onClick={() => execute("restore", { appId: app.id })}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        justifyContent: "flex-start",
                    }}
                >
                    <HStack
                        as="span"
                        align="center"
                        gap={2}
                        style={{ minWidth: 0 }}
                    >
                        <AppArtwork app={app} size={24} />
                        <Text maxLines={1}>{app.name}</Text>
                    </HStack>
                </Button>
                {statusLabel && <Badge variant="info" label={statusLabel} />}
                {wide && canSplit && (
                    <IconButton
                        icon={<Icon icon="viewColumns" />}
                        label={`分屏打开${app.name}`}
                        tooltip="一键分屏"
                        variant="ghost"
                        onClick={onSplit}
                    />
                )}
                {control(`关闭${app.name}`, "close", () =>
                    execute("close", { appId: app.id }),
                )}
            </HStack>
        </Card>
    );
}

function PlacementControl({
    app,
    width,
    side,
    execute,
}: {
    app: AppSummary;
    width: number;
    side: number;
    execute: Execute;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const start = useRef(0);
    const moved = useRef(false);
    const [preview, setPreview] = useState<Placement>();
    const place = (edge: Placement) =>
        execute("split", { appId: app.id, edge });
    usePanGesture(ref, {
        axis: "x",
        onPan: ({ state, translation }) => {
            if (state === "began") {
                const rect = ref.current!.getBoundingClientRect();
                start.current = rect.left + rect.width / 2;
                moved.current = true;
            }
            const edge = gripPlacement(
                start.current + translation.x,
                translation.x,
                width,
            );
            if (state === "changed") setPreview(edge);
            if (state === "ended" || state === "cancelled") {
                setPreview(undefined);
                if (state === "ended" && edge) place(edge);
            }
        },
    });
    return (
        <IconButton
            ref={ref}
            label={
                preview
                    ? preview === "left"
                        ? "放到左侧"
                        : "放到右侧"
                    : "分屏或交换位置"
            }
            icon={
                <Icon
                    icon={
                        preview === "left"
                            ? "chevronsLeft"
                            : preview === "right"
                              ? "chevronsRight"
                              : "viewColumns"
                    }
                />
            }
            variant="ghost"
            onPointerDown={() => {
                moved.current = false;
            }}
            onClick={(event) => {
                if (!moved.current || event.detail === 0)
                    place(side === 0 ? "right" : "left");
            }}
        />
    );
}

function PanelToolbar({
    app,
    toolbar,
    activate,
    execute,
    wide,
    index,
    width,
    isSplit,
    isActive,
}: Pick<ShellProps, "activate" | "execute"> & {
    app: AppSummary;
    toolbar?: PaneToolbar;
    wide: boolean;
    index: number;
    width: number;
    isSplit: boolean;
    isActive: boolean;
}) {
    const invoke = (id: string) =>
        toolbar && activate(app.id, toolbar.presentationId, id);
    const menuItem = (choice: PaneToolbarItem) => ({
        id: choice.id,
        label: choice.label,
        icon: choice.selected ? ("check" as const) : undefined,
        onClick: () => invoke(choice.id),
    });
    const actions: {
        id: string;
        control: ReactNode;
        menu: Parameters<typeof MoreMenu>[0]["items"][number];
    }[] = (toolbar?.items ?? []).map((item) => {
        const choices = item.choices?.map(menuItem);
        return {
            id: item.id,
            control: choices ? (
                <DropdownMenu
                    button={{
                        label: item.label,
                        variant: "ghost",
                        isDisabled: !choices.length,
                    }}
                    items={choices}
                />
            ) : (
                <Button
                    label={item.label}
                    variant={item.selected ? "secondary" : "ghost"}
                    aria-pressed={item.selected}
                    onClick={() => invoke(item.id)}
                />
            ),
            menu: choices
                ? {
                      type: "section" as const,
                      title: item.label,
                      items: choices,
                  }
                : menuItem(item),
        };
    });
    const overview = () => execute("overview");
    const close = () => execute("close", { appId: app.id });
    if (isSplit) {
        const edge: Placement = index === 0 ? "left" : "right";
        const collapse = () => execute("collapse", { edge });
        actions.push({
            id: "collapse",
            control: control(
                "收起此面板",
                index === 0 ? "chevronsLeft" : "chevronsRight",
                collapse,
            ),
            menu: { label: "收起此面板", onClick: collapse },
        });
    }
    actions.push(
        {
            id: "overview",
            control: control("后台应用", "copy", overview),
            menu: { label: "后台应用", onClick: overview },
        },
        {
            id: "close",
            control: control(`关闭${app.name}`, "close", close),
            menu: { label: `关闭${app.name}`, onClick: close },
        },
    );
    return (
        <Toolbar
            label={`${app.name}工具栏`}
            data-pane-toolbar={app.id}
            data-active-pane={isSplit && isActive ? "true" : "false"}
            onFocus={(event) => {
                const target = event.target as HTMLElement;
                if (
                    target.closest('[role="menu"]') ||
                    target.getAttribute("aria-haspopup") === "menu"
                ) {
                    event.preventDefault();
                }
            }}
            style={{
                containerType: "inline-size",
                boxShadow:
                    isSplit && isActive
                        ? "inset 0 2px 0 0 var(--color-accent)"
                        : undefined,
            }}
            dividers={["bottom"]}
            startContent={
                <HStack
                    width="100cqw"
                    align="center"
                    gap={1}
                    style={{
                        paddingInlineStart:
                            index === 0
                                ? "var(--window-controls-end, 0px)"
                                : undefined,
                    }}
                >
                    {control("返回桌面", "chevronLeft", () => execute("home"))}
                    <HStack
                        align="center"
                        gap={1.5}
                        style={{ flexShrink: 0, minWidth: 0 }}
                    >
                        {isSplit && isActive && (
                            <StatusDot variant="accent" label="当前活动面板" />
                        )}
                        <Text
                            maxLines={1}
                            weight={isSplit && isActive ? "semibold" : "normal"}
                            color={
                                isSplit && !isActive ? "secondary" : "primary"
                            }
                        >
                            {app.name}
                        </Text>
                    </HStack>
                    {wide && (
                        <PlacementControl
                            app={app}
                            width={width}
                            side={index}
                            execute={execute}
                        />
                    )}
                    <VStack style={{ flex: 1, minWidth: 0 }}>
                        <OverflowList
                            gap={1}
                            overflowRenderer={(hidden) => (
                                <MoreMenu
                                    label="更多"
                                    alignment="end"
                                    items={hidden.map(
                                        ({ index }) => actions[index].menu,
                                    )}
                                />
                            )}
                        >
                            {actions.map((action) => (
                                <HStack
                                    key={action.id}
                                    width="max-content"
                                    style={{ flexShrink: 0 }}
                                >
                                    {action.control}
                                </HStack>
                            ))}
                        </OverflowList>
                    </VStack>
                </HStack>
            }
        />
    );
}

export function Workspace(props: ShellProps) {
    const { snapshot, execute } = props;
    const container = useRef<HTMLElement>(null);
    const [width, setWidth] = useState(window.innerWidth);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [closingAll, setClosingAll] = useState(false);
    const showToast = useToast();
    useLayoutEffect(() => {
        const element = container.current!;
        const measure = () => setWidth(element.clientWidth);
        const observer = new ResizeObserver(measure);
        measure();
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const { workspace } = snapshot;
    const compact = width > 0 && width < 520;
    const wide =
        snapshot.capabilities.splitView &&
        width >= 2 * tokens.shell.comfortablePane + tokens.shell.divider;
    const panes = visiblePanes(workspace, wide);
    const activePane = activePaneId(workspace, panes);
    const recentApps = workspace.recent
        .map((id) => snapshot.apps.find((app) => app.id === id))
        .filter((app): app is AppSummary => Boolean(app));

    const runSteps = useCallback(
        async (steps: CommandStep[]) => {
            for (const step of steps) {
                const ok = await execute(step.name, step.input);
                if (!ok) return false;
            }
            return true;
        },
        [execute],
    );

    const handleCloseAll = useCallback(async () => {
        if (closingAll || !workspace.recent.length) return;
        setClosingAll(true);
        try {
            let closed = 0;
            for (const id of [...workspace.recent]) {
                const ok = await execute("close", { appId: id });
                if (!ok) break;
                closed++;
            }
            if (closed > 0) {
                showToast({
                    type: "info",
                    body: "已关闭全部后台应用",
                    uniqueID: "workspace-close-all",
                });
            }
        } finally {
            setClosingAll(false);
        }
    }, [closingAll, workspace.recent, execute, showToast]);

    const handlePaletteAction = useCallback(
        (action: PaletteAction) => {
            if (action.kind === "steps") {
                void runSteps(action.steps);
            } else if (action.kind === "closeAll") {
                void handleCloseAll();
            } else if (action.kind === "requestLogout") {
                setLogoutOpen(true);
            }
        },
        [runSteps, handleCloseAll],
    );

    useHotkeys([
        {
            keys: "mod+k",
            onPress: () => setPaletteOpen((open) => !open),
            isDisabled: logoutOpen,
        },
        {
            keys: "Escape",
            onPress: () => {
                const emptyIndex = panes.indexOf(null);
                if (panes.length === 2 && emptyIndex >= 0) {
                    void execute("collapse", {
                        edge: emptyIndex === 0 ? "left" : "right",
                    });
                }
            },
            isDisabled:
                paletteOpen ||
                logoutOpen ||
                panes.length !== 2 ||
                !panes.includes(null),
        },
    ]);

    useEffect(() => {
        const onNativePalette = () => {
            if (!logoutOpen) setPaletteOpen((open) => !open);
        };
        window.addEventListener("workspace:commandPalette", onNativePalette);
        return () =>
            window.removeEventListener(
                "workspace:commandPalette",
                onNativePalette,
            );
    }, [logoutOpen]);

    return (
        <VStack
            ref={container}
            height="100dvh"
            gap={0}
            style={{ overflow: "hidden" }}
        >
            {workspace.mode === "desktop" ? (
                <Launchers
                    snapshot={snapshot}
                    execute={execute}
                    compact={compact}
                    onOpenPalette={() => setPaletteOpen(true)}
                    onRequestLogout={() => setLogoutOpen(true)}
                />
            ) : workspace.mode === "overview" ? (
                <VStack
                    height="100%"
                    gap={0}
                    style={{
                        minHeight: 0,
                        background: "var(--color-background-body)",
                    }}
                >
                    <Toolbar
                        label="后台应用"
                        dividers={["bottom"]}
                        startContent={
                            <HStack
                                align="center"
                                gap={2}
                                style={{
                                    paddingInlineStart:
                                        "var(--window-controls-end, 0px)",
                                }}
                            >
                                {control("返回桌面", "chevronLeft", () =>
                                    execute("home"),
                                )}
                                <Heading level={3} accessibilityLevel={1}>
                                    后台应用
                                </Heading>
                                {recentApps.length > 0 && (
                                    <Badge
                                        variant="neutral"
                                        label={`${recentApps.length}`}
                                    />
                                )}
                            </HStack>
                        }
                        endContent={
                            <HStack align="center" gap={1.5}>
                                <IconButton
                                    icon={<Icon icon={MagnifyingGlassIcon} />}
                                    label="快捷命令"
                                    tooltip="快捷命令"
                                    variant="ghost"
                                    onClick={() => setPaletteOpen(true)}
                                />
                                {recentApps.length > 0 && (
                                    <Button
                                        label="全部关闭"
                                        variant="ghost"
                                        size="sm"
                                        icon={<Icon icon={TrashIcon} />}
                                        isLoading={closingAll}
                                        onClick={() => void handleCloseAll()}
                                    />
                                )}
                            </HStack>
                        }
                    />
                    <VStack
                        padding={5}
                        isScrollable
                        style={{ flex: 1, minHeight: 0 }}
                    >
                        {recentApps.length > 0 ? (
                            <Grid columns={{ minWidth: 240, max: 4 }} gap={3}>
                                {recentApps.map((app) => {
                                    const inSplit =
                                        workspace.panes.length === 2 &&
                                        workspace.panes.includes(app.id);
                                    const isLatest =
                                        workspace.recent[0] === app.id;
                                    const statusLabel = inSplit
                                        ? "分屏中"
                                        : isLatest
                                          ? "最近"
                                          : undefined;
                                    return (
                                        <RecentApp
                                            key={app.id}
                                            app={app}
                                            execute={execute}
                                            wide={wide}
                                            canSplit={
                                                snapshot.capabilities.splitView
                                            }
                                            statusLabel={statusLabel}
                                            onSplit={() =>
                                                void runSteps(
                                                    overviewSplitPlan(
                                                        workspace,
                                                        app.id,
                                                    ),
                                                )
                                            }
                                        />
                                    );
                                })}
                            </Grid>
                        ) : (
                            <Center height="100%" padding={6}>
                                <EmptyState
                                    icon={
                                        <Icon icon={Squares2X2Icon} size="lg" />
                                    }
                                    title="暂无后台应用"
                                    description="打开的应用会显示在这里，方便随时切换或一键分屏。"
                                    actions={
                                        <Button
                                            label="返回桌面"
                                            variant="primary"
                                            onClick={() => void execute("home")}
                                        />
                                    }
                                />
                            </Center>
                        )}
                    </VStack>
                </VStack>
            ) : (
                <Panes
                    key={panes.join("|")}
                    {...{
                        ...props,
                        width,
                        wide,
                        panes,
                        activePane,
                    }}
                />
            )}
            <CommandPaletteModal
                isOpen={paletteOpen}
                onOpenChange={setPaletteOpen}
                snapshot={snapshot}
                wide={wide}
                activePane={activePane}
                onSelectAction={handlePaletteAction}
            />
            <AlertDialog
                isOpen={logoutOpen}
                onOpenChange={setLogoutOpen}
                title="确认退出登录？"
                description={
                    snapshot.user
                        ? `将断开与 ${formatServerHost(snapshot.user.url)}（${snapshot.user.username}）的连接并返回登录页。`
                        : "将断开当前工作区连接并返回登录页。"
                }
                cancelLabel="取消"
                actionLabel="退出登录"
                actionVariant="destructive"
                isActionLoading={loggingOut}
                onAction={async () => {
                    setLoggingOut(true);
                    try {
                        const ok = await execute("logout");
                        if (ok) setLogoutOpen(false);
                    } finally {
                        setLoggingOut(false);
                    }
                }}
            />
        </VStack>
    );
}

export function visiblePanes(
    workspace: HostSnapshot["workspace"],
    wide: boolean,
) {
    if (workspace.mode !== "apps") return [];
    if (wide || workspace.panes.length !== 2) return workspace.panes;
    return [
        workspace.panes.find((id) => id === workspace.recent[0]) ??
            workspace.panes.find(Boolean) ??
            null,
    ];
}

function Panes({
    snapshot,
    execute,
    errors,
    retry,
    toolbars,
    activate,
    width,
    wide,
    panes,
    activePane,
}: ShellProps & {
    width: number;
    wide: boolean;
    panes: (string | null)[];
    activePane: string | null;
}) {
    const drag = useRef<DividerDrag | null>(null);
    const [preview, setPreview] = useState<DividerDrag["preview"]>();
    const { ratio } = snapshot.workspace;
    const isSplit = panes.length === 2;
    const frames = splitFrames(
        width,
        preview?.ratio ?? ratio,
        preview?.collapse,
    );
    const available = width - tokens.shell.divider;
    const feedback = preview
        ? splitRatioPercentages(preview.ratio, preview.collapse)
        : null;
    const separator = (
        <ResizeHandle
            label="调整分屏比例"
            hasDivider
            pillPlacement="center"
            onKeyDownCapture={(event) => {
                const edge =
                    event.key === "ArrowLeft" && ratio <= 1 / 3
                        ? "left"
                        : event.key === "ArrowRight" && ratio >= 2 / 3
                          ? "right"
                          : undefined;
                if (edge) {
                    event.preventDefault();
                    event.stopPropagation();
                    execute("collapse", { edge });
                }
            }}
            resizable={{
                _isResizableProps: true,
                _size: frames.panes[0].width,
                _minSizePx: available / 3,
                _maxSizePx: (2 * available) / 3,
                _snaps: [available / 3, available / 2, (2 * available) / 3],
                _collapsible: false,
                _isCollapsed: false,
                _collapsedSize: 0,
                _onResizeStart: () => {
                    drag.current = beginDividerDrag(ratio, width);
                },
                _onResizeMove: (delta) => {
                    if (drag.current) {
                        drag.current = moveDividerDrag(drag.current, delta);
                        setPreview(drag.current.preview);
                    }
                },
                _onResizeCancel: () => {
                    drag.current = null;
                    setPreview(undefined);
                },
                _onResizeEnd: () => {
                    const end = drag.current?.preview;
                    drag.current = null;
                    setPreview(undefined);
                    if (end?.collapse)
                        execute("collapse", { edge: end.collapse });
                    else if (end) execute("resize", { ratio: end.ratio });
                },
            }}
        />
    );
    return (
        <HStack
            gap={0}
            width="100%"
            height="100%"
            style={{ position: "relative" }}
        >
            {panes.map((id, index) => {
                const app = snapshot.apps.find((entry) => entry.id === id);
                const isActive = Boolean(app && app.id === activePane);
                return (
                    <Fragment key={id ?? "launcher"}>
                        {index === 1 && (
                            <HStack
                                width={frames.divider.width}
                                height="100%"
                                justify="center"
                                style={{ flexShrink: 0 }}
                            >
                                {separator}
                            </HStack>
                        )}
                        <VStack
                            width={isSplit ? frames.panes[index].width : "100%"}
                            height="100%"
                            gap={0}
                            data-pane-id={app?.id ?? "empty"}
                            data-pane-active={String(isActive)}
                            onPointerDownCapture={() => {
                                if (isSplit && app && !isActive) {
                                    void execute("restore", { appId: app.id });
                                }
                            }}
                            style={{
                                minWidth: 0,
                                overflow: "hidden",
                                flexShrink: 0,
                            }}
                        >
                            {app ? (
                                <>
                                    <PanelToolbar
                                        {...{
                                            app,
                                            index,
                                            wide,
                                            width,
                                            execute,
                                            activate,
                                            isSplit,
                                            isActive,
                                        }}
                                        toolbar={toolbars[app.id]}
                                    />
                                    <VStack
                                        data-app-slot={app.id}
                                        style={{ flex: 1, minHeight: 0 }}
                                    >
                                        {errors[app.id] && (
                                            <Center height="100%" padding={6}>
                                                <EmptyState
                                                    icon={
                                                        <Icon
                                                            icon={
                                                                ExclamationTriangleIcon
                                                            }
                                                            size="lg"
                                                        />
                                                    }
                                                    title={errors[app.id]}
                                                    description="子应用界面遇到异常，重新载入不会中断正在运行的任务。"
                                                    actions={
                                                        <Button
                                                            label="重新载入界面"
                                                            variant="primary"
                                                            onClick={() =>
                                                                retry(app.id)
                                                            }
                                                        />
                                                    }
                                                />
                                            </Center>
                                        )}
                                    </VStack>
                                </>
                            ) : (
                                <VStack height="100%" gap={0}>
                                    <Toolbar
                                        label="分屏选择工具栏"
                                        dividers={["bottom"]}
                                        startContent={
                                            <HStack
                                                align="center"
                                                gap={2}
                                                style={{
                                                    paddingInlineStart:
                                                        index === 0
                                                            ? "var(--window-controls-end, 0px)"
                                                            : undefined,
                                                }}
                                            >
                                                <Text
                                                    weight="semibold"
                                                    maxLines={1}
                                                >
                                                    选择并排应用
                                                </Text>
                                            </HStack>
                                        }
                                        endContent={
                                            <Button
                                                label="取消分屏"
                                                variant="ghost"
                                                size="sm"
                                                icon={<Icon icon="close" />}
                                                onClick={() =>
                                                    void execute("collapse", {
                                                        edge:
                                                            index === 0
                                                                ? "left"
                                                                : "right",
                                                    })
                                                }
                                            />
                                        }
                                    />
                                    <VStack style={{ flex: 1, minHeight: 0 }}>
                                        <Launchers
                                            snapshot={snapshot}
                                            execute={execute}
                                            embedded
                                        />
                                    </VStack>
                                </VStack>
                            )}
                        </VStack>
                    </Fragment>
                );
            })}
            {isSplit && feedback && (
                <Card
                    padding={1.5}
                    elevation="med"
                    role="status"
                    data-workspace-overlay="split-preview"
                    style={{
                        position: "absolute",
                        left: Math.max(
                            88,
                            Math.min(
                                Math.max(88, width - 88),
                                frames.divider.left + frames.divider.width / 2,
                            ),
                        ),
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 20,
                    }}
                >
                    <Badge
                        variant={feedback.collapsing ? "warning" : "neutral"}
                        label={feedback.label}
                    />
                </Card>
            )}
        </HStack>
    );
}
