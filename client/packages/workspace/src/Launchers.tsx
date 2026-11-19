import { useRef, useState, type PointerEvent } from "react";
import {
    Button,
    Card,
    Grid,
    HStack,
    Icon,
    IconButton,
    Text,
    Toolbar,
    VStack,
} from "@astryxdesign/core";
import { Cog6ToothIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import type {
    AppSummary,
    HostSnapshot,
    Json,
    WorkspaceCommandName,
} from "@skynet/contracts";
import {
    insertionBefore,
    launcherDragCenter,
    previewPlacement,
    type Destination,
    type LauncherArea,
} from "./launcherLayout";
import { useLauncherMotion } from "./useLauncherMotion";
import "./launcher.css";

const launcherIconSize = 60;

export function AppArtwork({
    app,
    size = launcherIconSize,
}: {
    app: AppSummary;
    size?: 24 | typeof launcherIconSize;
}) {
    const agent = app.builtin && app.id === "agent";
    const glyph = agent
        ? SparklesIcon
        : app.builtin && app.id === "settings"
          ? Cog6ToothIcon
          : Squares2X2Icon;
    return (
        <HStack
            as="span"
            width={size}
            height={size}
            align="center"
            justify="center"
            aria-hidden="true"
            data-app-artwork={agent ? "graphite" : "silver"}
        >
            <Icon icon={glyph} style={{ width: "56%", height: "56%" }} />
        </HStack>
    );
}

type Placement = Destination & { id: string };
type Gesture = {
    app: AppSummary;
    pointer: number;
    x: number;
    y: number;
    centerAt: ReturnType<typeof launcherDragCenter>;
    active: boolean;
};

export function Launchers({
    snapshot,
    execute,
    embedded = false,
}: {
    snapshot: HostSnapshot;
    execute: (
        name: WorkspaceCommandName,
        input?: Record<string, Json>,
    ) => Promise<boolean>;
    embedded?: boolean;
}) {
    const { apps, workspace, preferences } = snapshot;
    const root = useRef<HTMLElement>(null);
    const gesture = useRef<Gesture | null>(null);
    const suppressClick = useRef(false);
    const [placement, setPlacement] = useState<Placement | null>(null);
    const [lifted, setLifted] = useState<{
        app: AppSummary;
        x: number;
        y: number;
    } | null>(null);
    const [notice, setNotice] = useState("");
    const layout = placement
        ? previewPlacement(workspace, placement.id, placement)
        : workspace;
    const desktop = embedded
        ? [...workspace.desktop, ...workspace.dock]
        : layout.desktop;
    const landing = useLauncherMotion(
        root,
        preferences.reduceMotion,
        JSON.stringify([desktop, layout.dock, lifted?.app.id]),
    );
    const byId = new Map(apps.map((app) => [app.id, app]));
    const move = (id: string, destination: Destination) => {
        const { area, before } = destination;
        const current = workspace[area].indexOf(id);
        if (current >= 0 && (workspace[area][current + 1] ?? "") === before) {
            setPlacement(null);
            return;
        }
        const pending = { id, ...destination };
        setPlacement(pending);
        void execute(area === "dock" ? "dock" : "undock", {
            appId: id,
            beforeAppId: before,
        })
            .then(
                (accepted) =>
                    accepted &&
                    setNotice(
                        `${byId.get(id)?.name}，${area === "dock" ? "Dock" : "主屏幕"}第 ${previewPlacement(workspace, id, destination)[area].indexOf(id) + 1} 位`,
                    ),
            )
            .finally(() =>
                setPlacement((value) => (value === pending ? null : value)),
            );
    };
    const destinationAt = (
        id: string,
        x: number,
        y: number,
    ): Destination | null => {
        const element = document
            .elementFromPoint(x, y)
            ?.closest<HTMLElement>("[data-drop-area]");
        if (!element || !root.current?.contains(element)) return null;
        const area = element.dataset.dropArea as LauncherArea;
        const slots = Array.from(
            element.querySelectorAll<HTMLElement>("[data-launcher]"),
            (slot) => ({
                id: slot.dataset.launcher!,
                rect: slot.getBoundingClientRect(),
            }),
        );
        return { area, before: insertionBefore(slots, id, x, y) };
    };
    const follow = (event: PointerEvent<HTMLElement>) => {
        const source = gesture.current;
        if (!source || source.pointer !== event.pointerId) return;
        if (!source.active) {
            if (
                Math.hypot(event.clientX - source.x, event.clientY - source.y) <
                8
            )
                return;
            root.current!.setPointerCapture(source.pointer);
            suppressClick.current = true;
            source.active = true;
        }
        source.x = event.clientX;
        source.y = event.clientY;
        setLifted({ app: source.app, ...source.centerAt(source.x, source.y) });
        const target = destinationAt(source.app.id, source.x, source.y);
        setPlacement(target ? { id: source.app.id, ...target } : null);
    };
    const finish = (commit: boolean, x?: number, y?: number) => {
        const source = gesture.current;
        if (!source) return;
        gesture.current = null;
        if (!source.active) return;
        const pointerX = x ?? source.x;
        const pointerY = y ?? source.y;
        const id = source.app.id;
        landing.current = { id, ...source.centerAt(pointerX, pointerY) };
        const target = commit && destinationAt(id, pointerX, pointerY);
        if (target) move(id, target);
        else setPlacement(null);
        setLifted(null);
        if (root.current?.hasPointerCapture(source.pointer))
            root.current.releasePointerCapture(source.pointer);
    };
    const launcher = (id: string, docked: boolean) => {
        const app = byId.get(id);
        if (!app) return null;
        const running = docked && workspace.recent.includes(id);
        return (
            <VStack
                key={id}
                data-launcher={id}
                align="center"
                width={docked ? launcherIconSize : 78}
            >
                <VStack
                    as={docked ? "div" : "label"}
                    align="center"
                    gap={docked ? 1 : 2}
                    style={{
                        visibility:
                            lifted?.app.id === id ? "hidden" : undefined,
                    }}
                >
                    <Button
                        data-launcher-button=""
                        label={app.name}
                        tooltip={docked ? app.name : undefined}
                        aria-description={running ? "已打开" : undefined}
                        variant="ghost"
                        elevation="low"
                        width={launcherIconSize}
                        isDisabled={embedded && workspace.panes.includes(id)}
                        style={{
                            height: launcherIconSize,
                            padding: 0,
                            touchAction: embedded ? undefined : "none",
                        }}
                        onPointerDownCapture={(event) => {
                            if (
                                embedded ||
                                gesture.current ||
                                !event.isPrimary ||
                                event.button !== 0
                            )
                                return;
                            suppressClick.current = false;
                            gesture.current = {
                                app,
                                pointer: event.pointerId,
                                x: event.clientX,
                                y: event.clientY,
                                centerAt: launcherDragCenter(
                                    event.currentTarget.getBoundingClientRect(),
                                    event.clientX,
                                    event.clientY,
                                    launcherIconSize,
                                ),
                                active: false,
                            };
                            event.currentTarget.setPointerCapture(
                                event.pointerId,
                            );
                        }}
                        onClick={(event) => {
                            if (event.detail === 0 || !suppressClick.current)
                                void execute("open", { appId: id });
                        }}
                    >
                        <AppArtwork app={app} />
                    </Button>
                    {docked ? (
                        <HStack
                            aria-hidden="true"
                            width={4}
                            height={4}
                            style={{
                                borderRadius: "var(--radius-full)",
                                background: running
                                    ? "var(--color-icon-secondary)"
                                    : undefined,
                            }}
                        />
                    ) : (
                        <Text maxLines={1}>{app.name}</Text>
                    )}
                </VStack>
            </VStack>
        );
    };
    return (
        <VStack
            ref={root}
            height="100%"
            gap={3}
            padding={3}
            style={{
                minHeight: 0,
                background: `var(--wallpaper-${preferences.wallpaper})`,
            }}
            onPointerMoveCapture={follow}
            onPointerUpCapture={(event) => {
                if (gesture.current?.pointer === event.pointerId)
                    finish(true, event.clientX, event.clientY);
            }}
            onPointerCancel={(event) => {
                if (gesture.current?.pointer === event.pointerId) finish(false);
            }}
            onLostPointerCapture={(event) => {
                if (
                    gesture.current?.pointer === event.pointerId &&
                    !root.current?.hasPointerCapture(event.pointerId)
                )
                    finish(false);
            }}
            onKeyDownCapture={(event) => {
                if (event.key === "Escape") finish(false);
            }}
        >
            {!embedded && (
                <Toolbar
                    label="桌面"
                    startContent={
                        <HStack
                            width="100%"
                            justify="end"
                            align="center"
                            style={{
                                paddingInlineStart:
                                    "var(--window-controls-end, 0px)",
                            }}
                        >
                            {snapshot.user && (
                                <Button
                                    label={`${snapshot.user.username} · 退出登录`}
                                    variant="ghost"
                                    onClick={() => void execute("logout")}
                                />
                            )}
                            <IconButton
                                icon={<Icon icon="copy" />}
                                label="后台应用"
                                tooltip="后台应用"
                                variant="ghost"
                                onClick={() => void execute("overview")}
                            />
                        </HStack>
                    }
                />
            )}
            <VStack
                aria-label={embedded ? "选择应用" : "主屏幕"}
                role="group"
                align="center"
                paddingBlock={4}
                isScrollable
                style={{ flex: 1, minHeight: 0 }}
                data-drop-area="desktop"
            >
                <Grid
                    width="100%"
                    style={{ maxWidth: "58rem" }}
                    columns={{ minWidth: 94, max: 6, repeat: "fill" }}
                    gap={3}
                    rowGap={6}
                    justify="center"
                >
                    {desktop.map((id) => launcher(id, false))}
                </Grid>
            </VStack>
            {!embedded && (
                <HStack
                    justify="center"
                    paddingBlockEnd={2}
                    style={{ containerType: "inline-size" }}
                >
                    <Card
                        role="group"
                        aria-label="Dock"
                        padding={2}
                        variant="transparent"
                        elevation="med"
                        width={
                            layout.dock.length
                                ? `calc(2 * var(--dock-inset) + ${layout.dock.length * launcherIconSize}px + ${layout.dock.length - 1} * var(--spacing-3))`
                                : "4.5rem"
                        }
                        maxWidth="100%"
                        data-drop-area="dock"
                    >
                        <HStack
                            justify="center"
                            align="center"
                            gap={3}
                            wrap="wrap"
                            width="max-content"
                            maxWidth="calc(100cqw - 2 * var(--dock-inset))"
                            paddingBlockStart={layout.dock.length ? 2 : 0}
                            style={{ minHeight: 64 }}
                        >
                            {layout.dock.map((id) => launcher(id, true))}
                        </HStack>
                    </Card>
                </HStack>
            )}
            {lifted && (
                <HStack
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        left: lifted.x,
                        top: lifted.y,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                >
                    <AppArtwork app={lifted.app} />
                </HStack>
            )}
            <HStack
                role="status"
                style={{
                    position: "absolute",
                    clipPath: "inset(50%)",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                }}
            >
                {notice}
            </HStack>
        </VStack>
    );
}
