import { Fragment, useLayoutEffect, useRef, useState } from "react";
import {
    Banner,
    Button,
    Card,
    ClickableCard,
    Grid,
    HStack,
    Icon,
    IconButton,
    ResizeHandle,
    StatusDot,
    Text,
    Toolbar,
    VStack,
} from "@astryxdesign/core";
import {
    Cog6ToothIcon,
    SparklesIcon,
    Squares2X2Icon,
    HomeIcon,
} from "@heroicons/react/24/outline";
import { usePanGesture } from "@astryxdesign/core/hooks";
import type {
    AppSummary,
    HostSnapshot,
    Json,
    WorkspaceCommandName,
} from "@skynet/contracts";
import { tokens } from "@skynet/tokens";
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
) => void;
type ShellProps = {
    snapshot: HostSnapshot;
    execute: Execute;
    errors: Record<string, string>;
    retry: (id: string) => void;
};
const appGlyph = (id: string) => (
    <Icon
        size="lg"
        icon={
            id === "settings"
                ? Cog6ToothIcon
                : id === "agent"
                  ? SparklesIcon
                  : Squares2X2Icon
        }
    />
);
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

function Launchers({
    snapshot,
    execute,
    embedded = false,
}: {
    snapshot: HostSnapshot;
    execute: Execute;
    embedded?: boolean;
}) {
    const open = (app: AppSummary) => execute("open", { appId: app.id });
    return (
        <VStack
            height="100%"
            justify="between"
            padding={4}
            gap={4}
            style={{
                minHeight: 0,
                background: `var(--wallpaper-${snapshot.preferences.wallpaper})`,
            }}
        >
            <VStack gap={4} isScrollable>
                {!embedded && (
                    <Toolbar
                        label="桌面"
                        endContent={control("后台应用", "copy", () =>
                            execute("overview"),
                        )}
                    />
                )}
                <Grid
                    columns={{ minWidth: 104, max: 7, repeat: "fill" }}
                    gap={3}
                >
                    {snapshot.apps.map((app) => (
                        <ClickableCard
                            key={app.id}
                            width={96}
                            padding={3}
                            label={app.name}
                            isDisabled={
                                embedded &&
                                snapshot.workspace.panes.includes(app.id)
                            }
                            onClick={() => open(app)}
                        >
                            <VStack align="center" gap={2}>
                                {appGlyph(app.id)}
                                <Text>{app.name}</Text>
                            </VStack>
                        </ClickableCard>
                    ))}
                </Grid>
            </VStack>
            {!embedded && (
                <HStack justify="center">
                    <Card padding={1}>
                        <Toolbar
                            label="Dock"
                            size="lg"
                            centerContent={snapshot.apps.map((app) => (
                                <VStack key={app.id} align="center" gap={1}>
                                    <IconButton
                                        label={app.name}
                                        tooltip={app.name}
                                        icon={appGlyph(app.id)}
                                        variant="ghost"
                                        onClick={() => open(app)}
                                    />
                                    {snapshot.workspace.recent.includes(
                                        app.id,
                                    ) && (
                                        <StatusDot
                                            label="已打开"
                                            variant="accent"
                                        />
                                    )}
                                </VStack>
                            ))}
                        />
                    </Card>
                </HStack>
            )}
        </VStack>
    );
}

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
                    icon={appGlyph(app.id)}
                    variant="ghost"
                    onClick={() => execute("restore", { appId: app.id })}
                />
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

export function Workspace({ snapshot, execute, errors, retry }: ShellProps) {
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
                        startContent={control("返回桌面", "chevronLeft", () =>
                            execute("home"),
                        )}
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
                    key={`${panes.join("|")}:${width}`}
                    {...{
                        snapshot,
                        execute,
                        errors,
                        retry,
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
                                    <Toolbar
                                        label={`${app.name}工具栏`}
                                        dividers={["bottom"]}
                                        startContent={
                                            <>
                                                {control(
                                                    "返回桌面",
                                                    "chevronLeft",
                                                    () => execute("home"),
                                                )}
                                                <Text>{app.name}</Text>
                                            </>
                                        }
                                        centerContent={
                                            wide && (
                                                <PlacementControl
                                                    app={app}
                                                    width={width}
                                                    side={index}
                                                    execute={execute}
                                                />
                                            )
                                        }
                                        endContent={
                                            <>
                                                {control(
                                                    "后台应用",
                                                    "copy",
                                                    () => execute("overview"),
                                                )}
                                                {control(
                                                    `关闭${app.name}`,
                                                    "close",
                                                    () =>
                                                        execute("close", {
                                                            appId: app.id,
                                                        }),
                                                )}
                                            </>
                                        }
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
                                <Launchers
                                    snapshot={snapshot}
                                    execute={execute}
                                    embedded
                                />
                            )}
                        </VStack>
                    </Fragment>
                );
            })}
        </HStack>
    );
}
