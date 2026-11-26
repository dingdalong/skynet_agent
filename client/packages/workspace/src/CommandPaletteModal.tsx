import { useMemo } from "react";
import {
    Badge,
    CommandPalette,
    CommandPaletteInput,
    HStack,
    Icon,
    Kbd,
    Text,
    VStack,
} from "@astryxdesign/core";
import {
    ArrowRightStartOnRectangleIcon,
    ArrowsRightLeftIcon,
    HomeIcon,
    RectangleStackIcon,
    ScaleIcon,
    TrashIcon,
    ViewColumnsIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import type { HostSnapshot } from "@skynet/contracts";
import { AppArtwork } from "./Launchers";
import {
    buildWorkspaceCommands,
    filterWorkspaceCommands,
    type PaletteAction,
    type WorkspaceCommandIcon,
    type WorkspaceCommandItem,
} from "./presentation";

function commandIcon(kind?: WorkspaceCommandIcon) {
    switch (kind) {
        case "home":
            return HomeIcon;
        case "overview":
            return RectangleStackIcon;
        case "split":
            return ViewColumnsIcon;
        case "swap":
            return ArrowsRightLeftIcon;
        case "balance":
            return ScaleIcon;
        case "collapse":
            return XMarkIcon;
        case "closeAll":
            return TrashIcon;
        case "logout":
            return ArrowRightStartOnRectangleIcon;
        default:
            return ViewColumnsIcon;
    }
}

export function CommandPaletteModal({
    isOpen,
    onOpenChange,
    snapshot,
    wide,
    activePane,
    onSelectAction,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    snapshot: HostSnapshot;
    wide: boolean;
    activePane: string | null;
    onSelectAction: (action: PaletteAction) => void;
}) {
    const items = useMemo(
        () => buildWorkspaceCommands(snapshot, { wide, activePane }),
        [snapshot, wide, activePane],
    );
    const source = useMemo(
        () => ({
            search: (query: string) => filterWorkspaceCommands(items, query),
            bootstrap: () => items,
        }),
        [items],
    );
    const byId = useMemo(
        () => new Map(items.map((item) => [item.id, item])),
        [items],
    );

    return (
        <CommandPalette
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            searchSource={source}
            label="快捷命令面板"
            width={560}
            maxHeight={440}
            emptySearchText="未找到匹配的应用或命令"
            emptyBootstrapText="暂无可用命令"
            input={
                <CommandPaletteInput
                    label="搜索应用或工作区命令"
                    placeholder="搜索应用、分屏或工作区命令…"
                />
            }
            onValueChange={(id) => {
                const item = byId.get(id);
                if (item?.auxiliaryData) {
                    onSelectAction(item.auxiliaryData.action);
                }
            }}
            renderItem={(item: WorkspaceCommandItem) => {
                const meta = item.auxiliaryData;
                return (
                    <HStack
                        align="center"
                        justify="between"
                        gap={3}
                        width="100%"
                        style={{ minWidth: 0 }}
                    >
                        <HStack
                            align="center"
                            gap={2}
                            style={{ flex: 1, minWidth: 0 }}
                        >
                            {meta?.app ? (
                                <AppArtwork app={meta.app} size={24} />
                            ) : (
                                <HStack
                                    as="span"
                                    width={24}
                                    height={24}
                                    align="center"
                                    justify="center"
                                    style={{ flexShrink: 0 }}
                                >
                                    <Icon
                                        icon={commandIcon(meta?.icon)}
                                        size="sm"
                                        color="secondary"
                                    />
                                </HStack>
                            )}
                            <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                <Text maxLines={1}>{item.label}</Text>
                                {meta?.description && (
                                    <Text
                                        size="xsm"
                                        color="secondary"
                                        maxLines={1}
                                    >
                                        {meta.description}
                                    </Text>
                                )}
                            </VStack>
                        </HStack>
                        {(meta?.badge || meta?.shortcut) && (
                            <HStack
                                align="center"
                                gap={1.5}
                                style={{ flexShrink: 0 }}
                            >
                                {meta.badge && (
                                    <Badge variant="info" label={meta.badge} />
                                )}
                                {meta.shortcut && <Kbd keys={meta.shortcut} />}
                            </HStack>
                        )}
                    </HStack>
                );
            }}
        />
    );
}
