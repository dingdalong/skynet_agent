import { useEffect, useMemo, useState } from "react";
import {
    Badge,
    Banner,
    Button,
    Card,
    Drawer,
    DrawerHeader,
    DropdownMenu,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Icon,
    IconButton,
    Layout,
    LayoutContent,
    LayoutFooter,
    List,
    ListItem,
    MetadataList,
    MetadataListItem,
    OverflowList,
    StackItem,
    StatusDot,
    Text,
    TextInput,
    ToggleButton,
    ToggleButtonGroup,
    VStack,
    useToast,
} from "@astryxdesign/core";
import { useClipboard } from "@astryxdesign/core/hooks";
import {
    CheckIcon,
    ChevronRightIcon,
    ClipboardDocumentIcon,
    Cog6ToothIcon,
    CubeIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    SparklesIcon,
    Squares2X2Icon,
    WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { AppSummary, HostCapabilities } from "@skynet/contracts";
import {
    appStatusMeta,
    filterInstalledApps,
    formatVersion,
    permissionLabel,
    summarizeInstalledApps,
    type AppFilter,
} from "./presentation";

function iconForApp(appId: string) {
    if (appId === "agent") return SparklesIcon;
    if (appId === "app-center") return Squares2X2Icon;
    if (appId === "settings") return Cog6ToothIcon;
    return CubeIcon;
}

function CopyableField({ value, label }: { value: string; label: string }) {
    const showToast = useToast();
    const { copy, isCopied } = useClipboard({ announce: `已复制${label}` });

    const handleCopy = async () => {
        const copied = await copy(value);
        if (copied) {
            showToast({
                uniqueID: `settings-copy-${label}`,
                body: `已复制${label}`,
                type: "info",
                autoHideDuration: 2200,
            });
        } else {
            showToast({
                uniqueID: "settings-copy-failed",
                body: "无法写入剪贴板，请手动复制",
                type: "error",
            });
        }
    };

    return (
        <HStack gap={1.5} vAlign="center" hAlign="between" width="100%">
            <Text
                type="body"
                size="sm"
                style={{ wordBreak: "break-all", flex: 1, minWidth: 0 }}
            >
                {value}
            </Text>
            <IconButton
                label={isCopied ? `已复制${label}` : `复制${label}`}
                tooltip={isCopied ? "已复制" : `复制${label}`}
                variant="ghost"
                size="sm"
                icon={
                    <Icon
                        icon={isCopied ? CheckIcon : ClipboardDocumentIcon}
                        size="sm"
                    />
                }
                onClick={() => void handleCopy()}
            />
        </HStack>
    );
}

function AppDetailDrawer({
    entry,
    busy,
    restarting,
    onClose,
    onRestart,
    onRequestRemove,
}: {
    entry: AppSummary | null;
    busy: boolean;
    restarting: boolean;
    onClose: () => void;
    onRestart: (entry: AppSummary) => void;
    onRequestRemove: (entry: AppSummary) => void;
}) {
    const [cached, setCached] = useState<AppSummary | null>(entry);
    useEffect(() => {
        if (entry) setCached(entry);
    }, [entry]);
    const active = entry ?? cached;
    const status = active ? appStatusMeta(active.status) : null;
    const exportedActions = active ? Object.entries(active.actions ?? {}) : [];

    return (
        <Drawer
            isOpen={entry !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            side="end"
            width={420}
            label={active ? `${active.name} 应用详情` : "应用详情"}
        >
            {active && status && (
                <Layout
                    height="fill"
                    header={
                        <DrawerHeader
                            title={active.name}
                            subtitle={active.id}
                            endContent={
                                <Badge
                                    variant={status.badgeVariant}
                                    label={status.label}
                                />
                            }
                            hasDivider
                            onOpenChange={(open) => {
                                if (!open) onClose();
                            }}
                        />
                    }
                    content={
                        <LayoutContent isScrollable>
                            <VStack gap={5}>
                                {active.error && (
                                    <Banner
                                        status="error"
                                        title="应用运行异常"
                                        description={active.error}
                                    />
                                )}

                                <MetadataList title="运行与版本">
                                    <MetadataListItem label="运行状态">
                                        <HStack gap={1.5} vAlign="center">
                                            <StatusDot
                                                variant={status.dotVariant}
                                                isPulsing={status.pulsing}
                                                label={status.label}
                                            />
                                            <Text type="body" size="sm">
                                                {status.label}
                                            </Text>
                                        </HStack>
                                    </MetadataListItem>
                                    <MetadataListItem label="应用标识">
                                        <CopyableField
                                            value={active.id}
                                            label="应用标识"
                                        />
                                    </MetadataListItem>
                                    <MetadataListItem label="应用版本">
                                        <Text
                                            type="body"
                                            size="sm"
                                            hasTabularNumbers
                                        >
                                            {formatVersion(
                                                active.version,
                                                active.build,
                                            )}
                                        </Text>
                                    </MetadataListItem>
                                    <MetadataListItem label="来源类型">
                                        {active.builtin
                                            ? "系统内置应用"
                                            : "本地安装的扩展应用"}
                                    </MetadataListItem>
                                    <MetadataListItem label="进程编号">
                                        <Text
                                            type="body"
                                            size="sm"
                                            hasTabularNumbers
                                        >
                                            {active.pid > 0
                                                ? `PID ${active.pid}`
                                                : "未分配"}
                                        </Text>
                                    </MetadataListItem>
                                </MetadataList>

                                <VStack gap={2}>
                                    <VStack gap={0.5}>
                                        <Heading level={3}>声明权限</Heading>
                                        <Text
                                            type="supporting"
                                            size="sm"
                                            color="secondary"
                                        >
                                            {active.permissions.length > 0
                                                ? `共 ${active.permissions.length} 项宿主权限`
                                                : "未申请额外宿主权限"}
                                        </Text>
                                    </VStack>
                                    {active.permissions.length > 0 ? (
                                        <List>
                                            {active.permissions.map(
                                                (permission) => (
                                                    <ListItem
                                                        key={permission}
                                                        label={permissionLabel(
                                                            permission,
                                                        )}
                                                        description={permission}
                                                        startContent={
                                                            <Icon
                                                                icon={
                                                                    ShieldCheckIcon
                                                                }
                                                                size="sm"
                                                                color="secondary"
                                                            />
                                                        }
                                                    />
                                                ),
                                            )}
                                        </List>
                                    ) : (
                                        <Text
                                            type="supporting"
                                            size="sm"
                                            color="secondary"
                                        >
                                            此应用仅在独立沙盒视图中运行，不调用受限宿主接口。
                                        </Text>
                                    )}
                                </VStack>

                                {exportedActions.length > 0 && (
                                    <VStack gap={2}>
                                        <VStack gap={0.5}>
                                            <Heading level={3}>
                                                导出动作
                                            </Heading>
                                            <Text
                                                type="supporting"
                                                size="sm"
                                                color="secondary"
                                            >
                                                可供宿主或其他受权应用调用的声明式动作
                                            </Text>
                                        </VStack>
                                        <List>
                                            {exportedActions.map(
                                                ([actionId, meta]) => (
                                                    <ListItem
                                                        key={actionId}
                                                        label={
                                                            meta.title ||
                                                            actionId
                                                        }
                                                        description={actionId}
                                                        startContent={
                                                            <Icon
                                                                icon={
                                                                    WrenchScrewdriverIcon
                                                                }
                                                                size="sm"
                                                                color="secondary"
                                                            />
                                                        }
                                                    />
                                                ),
                                            )}
                                        </List>
                                    </VStack>
                                )}
                            </VStack>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter hasDivider>
                            <HStack
                                hAlign="between"
                                vAlign="center"
                                gap={2}
                                wrap="wrap"
                            >
                                <HStack gap={2} vAlign="center">
                                    <Button
                                        label="重启"
                                        variant="secondary"
                                        isLoading={restarting}
                                        isDisabled={busy}
                                        onClick={() => onRestart(active)}
                                    />
                                    {!active.builtin && (
                                        <Button
                                            label="移除"
                                            variant="destructive"
                                            isDisabled={busy}
                                            onClick={() =>
                                                onRequestRemove(active)
                                            }
                                        />
                                    )}
                                </HStack>
                                <Button
                                    label="关闭"
                                    variant="ghost"
                                    onClick={onClose}
                                />
                            </HStack>
                        </LayoutFooter>
                    }
                />
            )}
        </Drawer>
    );
}

export function AppsSection({
    apps,
    capabilities,
    busy,
    restartingAppId,
    onRestart,
    onRequestRemove,
}: {
    apps: ReadonlyArray<AppSummary>;
    capabilities?: HostCapabilities;
    busy: boolean;
    restartingAppId: string;
    onRestart: (entry: AppSummary) => void;
    onRequestRemove: (entry: AppSummary) => void;
}) {
    const [filter, setFilter] = useState<AppFilter>("all");
    const [query, setQuery] = useState("");
    const [detailAppId, setDetailAppId] = useState<string | null>(null);

    const metrics = useMemo(() => summarizeInstalledApps(apps), [apps]);
    const visibleApps = useMemo(
        () => filterInstalledApps(apps, filter, query),
        [apps, filter, query],
    );
    const detailEntry = useMemo(
        () =>
            detailAppId
                ? (apps.find((entry) => entry.id === detailAppId) ?? null)
                : null,
        [apps, detailAppId],
    );

    const summaryCards: ReadonlyArray<{
        key: string;
        label: string;
        value: number;
        dot: "neutral" | "success" | "accent" | "error";
    }> = [
        { key: "total", label: "已安装", value: metrics.total, dot: "neutral" },
        {
            key: "running",
            label: "运行中",
            value: metrics.running,
            dot: "success",
        },
        {
            key: "third-party",
            label: "扩展应用",
            value: metrics.thirdParty,
            dot: "accent",
        },
        {
            key: "failed",
            label: "运行异常",
            value: metrics.failed,
            dot: metrics.failed > 0 ? "error" : "neutral",
        },
    ];

    const filterItems: Array<{ id: AppFilter; label: string }> = [
        { id: "all", label: `全部 (${metrics.total})` },
        { id: "running", label: `运行中 (${metrics.running})` },
        { id: "builtin", label: `内置 (${metrics.builtin})` },
        { id: "third-party", label: `扩展 (${metrics.thirdParty})` },
    ];
    if (metrics.failed > 0) {
        filterItems.push({
            id: "failed",
            label: `异常 (${metrics.failed})`,
        });
    }

    return (
        <VStack gap={4} width="100%">
            {capabilities?.installApplications === false && (
                <Banner
                    status="info"
                    title="当前平台仅运行内置应用"
                    description="此设备运行随安装包交付的受信任内置应用，不支持动态安装扩展应用包。"
                />
            )}

            <Grid
                columns={{ minWidth: 116, max: 4, repeat: "fill" }}
                gap={3}
                width="100%"
            >
                {summaryCards.map((card) => (
                    <Card key={card.key} padding={3}>
                        <VStack gap={1}>
                            <HStack gap={1.5} vAlign="center">
                                <StatusDot
                                    variant={card.dot}
                                    label={card.label}
                                />
                                <Text
                                    type="supporting"
                                    size="xsm"
                                    color="secondary"
                                >
                                    {card.label}
                                </Text>
                            </HStack>
                            <Text
                                type="body"
                                size="lg"
                                weight="semibold"
                                hasTabularNumbers
                            >
                                {card.value}
                            </Text>
                        </VStack>
                    </Card>
                ))}
            </Grid>

            <VStack gap={3} width="100%">
                <TextInput
                    type="search"
                    label="搜索已安装应用"
                    isLabelHidden
                    placeholder="按应用名称、标识、版本或权限搜索…"
                    startIcon="search"
                    hasClear
                    width="100%"
                    value={query}
                    onChange={setQuery}
                />
                <HStack hAlign="between" vAlign="center" gap={3} width="100%">
                    <StackItem size="fill">
                        <VStack>
                            <ToggleButtonGroup
                                type="single"
                                label="按状态筛选应用"
                                size="sm"
                                value={filter}
                                onChange={(next) =>
                                    setFilter(
                                        (next as AppFilter | null) ?? "all",
                                    )
                                }
                            >
                                <OverflowList
                                    gap={1.5}
                                    behavior="observeParent"
                                    overflowRenderer={(overflowItems) => (
                                        <DropdownMenu
                                            button={{
                                                label: `+${overflowItems.length}`,
                                                variant: "ghost",
                                                size: "sm",
                                            }}
                                            items={overflowItems.flatMap(
                                                ({ index }) => {
                                                    const item =
                                                        filterItems[index];
                                                    if (!item) return [];
                                                    return [
                                                        {
                                                            id: item.id,
                                                            label: item.label,
                                                            onClick: () =>
                                                                setFilter(
                                                                    item.id,
                                                                ),
                                                        },
                                                    ];
                                                },
                                            )}
                                        />
                                    )}
                                >
                                    {filterItems.map((item) => (
                                        <ToggleButton
                                            key={item.id}
                                            value={item.id}
                                            label={item.label}
                                        />
                                    ))}
                                </OverflowList>
                            </ToggleButtonGroup>
                        </VStack>
                    </StackItem>
                    <Text
                        type="supporting"
                        size="xsm"
                        color="secondary"
                        hasTabularNumbers
                    >
                        显示 {visibleApps.length} / {apps.length}
                    </Text>
                </HStack>
            </VStack>

            {visibleApps.length === 0 ? (
                <Card padding={6} width="100%">
                    <EmptyState
                        icon={
                            <Icon
                                icon={MagnifyingGlassIcon}
                                size="lg"
                                color="secondary"
                            />
                        }
                        title="没有匹配的应用"
                        description="尝试调整筛选条件或清除搜索关键词。"
                        actions={
                            <Button
                                label="重置筛选"
                                variant="secondary"
                                onClick={() => {
                                    setFilter("all");
                                    setQuery("");
                                }}
                            />
                        }
                    />
                </Card>
            ) : (
                <VStack gap={3} width="100%">
                    {visibleApps.map((entry) => {
                        const status = appStatusMeta(entry.status);
                        const AppIcon = iconForApp(entry.id);
                        const rowRestarting = restartingAppId === entry.id;
                        const subtitleParts = [
                            entry.id,
                            `v${formatVersion(entry.version, entry.build)}`,
                        ];
                        if (entry.pid > 0)
                            subtitleParts.push(`PID ${entry.pid}`);
                        return (
                            <VStack
                                as="article"
                                key={entry.id}
                                aria-label={entry.name}
                                gap={0}
                                width="100%"
                            >
                                <Card padding={4} width="100%">
                                    <VStack gap={3}>
                                        <HStack
                                            hAlign="between"
                                            vAlign="center"
                                            gap={3}
                                            wrap="wrap"
                                        >
                                            <HStack
                                                gap={3}
                                                vAlign="center"
                                                style={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                }}
                                            >
                                                <Card
                                                    variant="muted"
                                                    padding={2}
                                                    aria-hidden="true"
                                                >
                                                    <Icon
                                                        icon={AppIcon}
                                                        size="md"
                                                    />
                                                </Card>
                                                <VStack
                                                    gap={0.5}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <HStack
                                                        gap={2}
                                                        vAlign="center"
                                                        wrap="wrap"
                                                    >
                                                        <Heading level={3}>
                                                            {entry.name}
                                                        </Heading>
                                                        <Badge
                                                            variant={
                                                                status.badgeVariant
                                                            }
                                                            label={status.label}
                                                        />
                                                        <Badge
                                                            variant="neutral"
                                                            label={
                                                                entry.builtin
                                                                    ? "内置"
                                                                    : "扩展"
                                                            }
                                                        />
                                                        {status.pulsing && (
                                                            <StatusDot
                                                                variant={
                                                                    status.dotVariant
                                                                }
                                                                isPulsing
                                                                label={
                                                                    status.label
                                                                }
                                                            />
                                                        )}
                                                    </HStack>
                                                    <Text
                                                        type="supporting"
                                                        size="sm"
                                                        color="secondary"
                                                        hasTabularNumbers
                                                        maxLines={1}
                                                    >
                                                        {subtitleParts.join(
                                                            " · ",
                                                        )}
                                                    </Text>
                                                </VStack>
                                            </HStack>

                                            <HStack
                                                gap={2}
                                                vAlign="center"
                                                wrap="wrap"
                                            >
                                                <Button
                                                    label="重启"
                                                    aria-label={`重启${entry.name}`}
                                                    variant="secondary"
                                                    size="sm"
                                                    isLoading={rowRestarting}
                                                    isDisabled={busy}
                                                    onClick={() =>
                                                        onRestart(entry)
                                                    }
                                                />
                                                {!entry.builtin && (
                                                    <Button
                                                        label="移除"
                                                        aria-label={`移除${entry.name}`}
                                                        variant="ghost"
                                                        size="sm"
                                                        isDisabled={busy}
                                                        onClick={() =>
                                                            onRequestRemove(
                                                                entry,
                                                            )
                                                        }
                                                    />
                                                )}
                                                <IconButton
                                                    label={`查看 ${entry.name} 详情`}
                                                    tooltip="查看详情"
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={
                                                        <Icon
                                                            icon={
                                                                ChevronRightIcon
                                                            }
                                                            size="sm"
                                                        />
                                                    }
                                                    onClick={() =>
                                                        setDetailAppId(entry.id)
                                                    }
                                                />
                                            </HStack>
                                        </HStack>

                                        {entry.error && (
                                            <Banner
                                                status="error"
                                                title="应用运行异常"
                                                description={entry.error}
                                            />
                                        )}

                                        {!entry.builtin && (
                                            <Text
                                                type="supporting"
                                                size="sm"
                                                color="secondary"
                                            >
                                                权限：
                                                {entry.permissions.length > 0
                                                    ? entry.permissions
                                                          .map(permissionLabel)
                                                          .join("、")
                                                    : "无"}
                                            </Text>
                                        )}
                                    </VStack>
                                </Card>
                            </VStack>
                        );
                    })}
                </VStack>
            )}

            <AppDetailDrawer
                entry={detailEntry}
                busy={busy}
                restarting={
                    Boolean(detailEntry) && restartingAppId === detailEntry?.id
                }
                onClose={() => setDetailAppId(null)}
                onRestart={onRestart}
                onRequestRemove={(target) => {
                    setDetailAppId(null);
                    onRequestRemove(target);
                }}
            />
        </VStack>
    );
}
