import {
    Fragment,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    Banner,
    Button,
    Card,
    Grid,
    HStack,
    Icon,
    IconButton,
    DropdownMenu,
    MoreMenu,
    OverflowList,
    ResizeHandle,
    Text,
    Toolbar,
    VStack,
} from "@astryxdesign/core";
import { HomeIcon } from "@heroicons/react/24/outline";
import { usePanGesture } from "@astryxdesign/core/hooks";
import type {
    AppSummary,
    HostSnapshot,
    Json,
    PaneToolbar,
    PaneToolbarItem,
    WorkspaceCommandName,
} from "@skynet/contracts";
import { tokens } from "@skynet/tokens";
import { AppArtwork, Launchers } from "./Launchers";
import {
    beginDividerDrag,
    gripPlacement,
    moveDividerDrag,
    splitFrames,
    type DividerDrag,
    type Placement,
} from "./geometry";

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
    icon: "chevronLeft" | "close" | "copy",
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

function RecentApp({ app, execute }: { app: AppSummary; execute: Execute }) {
    const ref = useRef<HTMLDivElement>(null);
    usePanGesture(ref, {
        axis: "y",
        onPan: ({ state, translation }) => {
            if (state === "ended" && translation.y < -72)
                execute("close", { appId: app.id });
        },
    });
    return (
        <Card ref={ref} padding={3}>
            <HStack align="center" justify="between">
                <Button
                    label={app.name}
                    variant="ghost"
                    onClick={() => execute("restore", { appId: app.id })}
                >
                    <HStack as="span" align="center" gap={2}>
                        <AppArtwork app={app} size={24} />
                        <Text maxLines={1}>{app.name}</Text>
                    </HStack>
                </Button>
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
}: Pick<ShellProps, "activate" | "execute"> & {
    app: AppSummary;
    toolbar?: PaneToolbar;
    wide: boolean;
    index: number;
    width: number;
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
            style={{ containerType: "inline-size" }}
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
                    <Text maxLines={1}>{app.name}</Text>
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
    useLayoutEffect(() => {
        const element = container.current!;
        const measure = () => setWidth(element.clientWidth);
        const observer = new ResizeObserver(measure);
        measure();
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const { workspace } = snapshot;
    const wide =
        snapshot.capabilities.splitView &&
        width >= 2 * tokens.shell.comfortablePane + tokens.shell.divider;
    const panes = visiblePanes(workspace, wide);
    return (
        <VStack
            ref={container}
            height="100dvh"
            gap={0}
            style={{ overflow: "hidden" }}
        >
            {workspace.mode === "desktop" ? (
                <Launchers snapshot={snapshot} execute={execute} />
            ) : workspace.mode === "overview" ? (
                <VStack height="100%" gap={4} padding={4} isScrollable>
                    <Toolbar
                        label="后台应用"
                        startContent={
                            <HStack
                                style={{
                                    paddingInlineStart:
                                        "var(--window-controls-end, 0px)",
                                }}
                            >
                                {control("返回桌面", "chevronLeft", () =>
                                    execute("home"),
                                )}
                            </HStack>
                        }
                        centerContent={<Text>后台应用</Text>}
                    />
                    <Grid columns={{ minWidth: 180, max: 5 }} gap={3}>
                        {workspace.recent
                            .map((id) =>
                                snapshot.apps.find((app) => app.id === id),
                            )
                            .map(
                                (app) =>
                                    app && (
                                        <RecentApp
                                            key={app.id}
                                            app={app}
                                            execute={execute}
                                        />
                                    ),
                            )}
                    </Grid>
                    {!workspace.recent.length && <Text>暂无后台应用</Text>}
                </VStack>
            ) : (
                <Panes
                    key={panes.join("|")}
                    {...{
                        ...props,
                        width,
                        wide,
                        panes,
                    }}
                />
            )}
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
}: ShellProps & { width: number; wide: boolean; panes: (string | null)[] }) {
    const drag = useRef<DividerDrag | null>(null);
    const [preview, setPreview] = useState<DividerDrag["preview"]>();
    const { ratio } = snapshot.workspace;
    const frames = splitFrames(
        width,
        preview?.ratio ?? ratio,
        preview?.collapse,
    );
    const available = width - tokens.shell.divider;
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
        <HStack gap={0} width="100%" height="100%">
            {panes.map((id, index) => {
                const app = snapshot.apps.find((entry) => entry.id === id);
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
                            width={
                                panes.length === 2
                                    ? frames.panes[index].width
                                    : "100%"
                            }
                            height="100%"
                            gap={0}
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
                                        }}
                                        toolbar={toolbars[app.id]}
                                    />
                                    <VStack
                                        data-app-slot={app.id}
                                        style={{ flex: 1, minHeight: 0 }}
                                    >
                                        {errors[app.id] && (
                                            <>
                                                <Banner
                                                    status="error"
                                                    title={errors[app.id]}
                                                />
                                                <Button
                                                    label="重新载入界面"
                                                    onClick={() =>
                                                        retry(app.id)
                                                    }
                                                />
                                            </>
                                        )}
                                    </VStack>
                                </>
                            ) : (
                                <VStack
                                    height="100%"
                                    style={{
                                        paddingTop:
                                            index === 0
                                                ? "var(--window-controls-height, 0px)"
                                                : undefined,
                                    }}
                                >
                                    <Launchers
                                        snapshot={snapshot}
                                        execute={execute}
                                        embedded
                                    />
                                </VStack>
                            )}
                        </VStack>
                    </Fragment>
                );
            })}
        </HStack>
    );
}
