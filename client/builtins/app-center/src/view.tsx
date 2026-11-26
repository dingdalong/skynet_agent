import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AlertDialog,
    Badge,
    Banner,
    Button,
    DropdownMenu,
    EmptyState,
    Heading,
    HStack,
    Icon,
    IconButton,
    LayerProvider,
    Layout,
    LayoutContent,
    LayoutHeader,
    OverflowList,
    StackItem,
    Tab,
    TabList,
    Text,
    TextInput,
    ToggleButton,
    ToggleButtonGroup,
    VStack,
    useToast,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
    ArrowPathIcon,
    ArrowsUpDownIcon,
    LockClosedIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { request } from "@skynet/app-sdk";
import {
    AppBoundary,
    useAppSnapshot,
    usePaneToolbar,
} from "@skynet/app-sdk/react";
import {
    AppGallery,
    DiscoverSkeletonGrid,
    ServiceCard,
    ServiceSkeletonList,
    ServiceSummaryStrip,
} from "./AppCenterViews";
import { DiscoverDetailDrawer, ServiceDetailDrawer } from "./DetailDrawers";
import {
    DISCOVER_SORT_LABELS,
    buildDiscoverCatalog,
    filterAndSortDiscoverApps,
    filterServices,
    serviceDisplayName,
    summarizeServices,
    type Directory,
    type DiscoverApp,
    type DiscoverSort,
    type Service,
    type ServiceFilter,
} from "./presentation";
import { UnlockDialog } from "./UnlockDialog";

const SERVICE_FILTER_ORDER: ServiceFilter[] = [
    "all",
    "pending",
    "running",
    "stopped",
    "attention",
];

function AppCenter() {
    const snapshot = useAppSnapshot<{ revision: number }>();
    const wide = useMediaQuery("(min-width: 560px)");
    const showToast = useToast();

    const [directory, setDirectory] = useState<Directory>();
    const [page, setPage] = useState<"discover" | "manage">("discover");
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [disableTargetId, setDisableTargetId] = useState("");
    const [removeTargetId, setRemoveTargetId] = useState("");
    const [detailDiscoverApp, setDetailDiscoverApp] =
        useState<DiscoverApp | null>(null);
    const [detailServiceId, setDetailServiceId] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [discoverSort, setDiscoverSort] = useState<DiscoverSort>("default");
    const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
    const [changing, setChanging] = useState(false);
    const [busyAppId, setBusyAppId] = useState("");
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [changeError, setChangeError] = useState("");
    const [refreshState, setRefreshState] = useState({
        tick: 0,
        manual: false,
    });

    const reload = useCallback((manual = false) => {
        setRefreshState((previous) => ({
            tick: previous.tick + 1,
            manual,
        }));
    }, []);

    useEffect(() => {
        let active = true;
        if (snapshot?.user) {
            if (refreshState.manual) setRefreshing(true);
            void request("app-center.list").then(
                (value) => {
                    if (!active) return;
                    setDirectory(value as unknown as Directory);
                    setLoadError("");
                    setInitialLoading(false);
                    setRefreshing(false);
                },
                (failure) => {
                    if (!active) return;
                    setLoadError(
                        failure instanceof Error
                            ? failure.message
                            : String(failure),
                    );
                    setInitialLoading(false);
                    setRefreshing(false);
                },
            );
        }
        return () => {
            active = false;
        };
    }, [
        snapshot?.user?.userId,
        snapshot?.state?.revision,
        refreshState.tick,
        refreshState.manual,
    ]);

    const managing = page === "manage";
    useEffect(() => {
        if (!managing || !directory?.administrator) return;
        const timer = window.setInterval(() => {
            if (!document.hidden) reload(false);
        }, 3000);
        return () => window.clearInterval(timer);
    }, [managing, directory?.administrator, reload]);

    const discoverCatalog = useMemo(
        () => buildDiscoverCatalog(directory, snapshot?.apps ?? []),
        [directory, snapshot?.apps],
    );
    const visibleDiscoverApps = useMemo(
        () => filterAndSortDiscoverApps(discoverCatalog, query, discoverSort),
        [discoverCatalog, query, discoverSort],
    );

    const allServices = directory?.administrator ? directory.services : [];
    const summary = useMemo(
        () => summarizeServices(allServices),
        [allServices],
    );
    const visibleServices = useMemo(
        () => filterServices(allServices, query, serviceFilter),
        [allServices, query, serviceFilter],
    );

    const disableTarget = directory?.administrator
        ? directory.services.find(
              (service) =>
                  service.app_id === disableTargetId &&
                  (service.enabled || service.transition === "disable_failed"),
          )
        : undefined;
    const removeTarget = directory?.administrator
        ? directory.services.find(
              (service) => service.app_id === removeTargetId,
          )
        : undefined;
    const detailService =
        directory?.administrator && detailServiceId
            ? (directory.services.find(
                  (service) => service.app_id === detailServiceId,
              ) ?? null)
            : null;

    const navigate = useCallback(
        (
            destination: "discover" | "manage",
            options?: { query?: string; filter?: ServiceFilter },
        ) => {
            setPage(destination);
            setQuery(options?.query ?? "");
            setServiceFilter(options?.filter ?? "all");
            setDisableTargetId("");
            setRemoveTargetId("");
            setDetailDiscoverApp(null);
            setDetailServiceId(null);
            setChangeError("");
        },
        [],
    );

    const handleTabChange = useCallback(
        (nextValue: string) => {
            if (nextValue === "discover") {
                navigate("discover");
                return;
            }
            if (nextValue === "manage") {
                if (directory?.administrator) navigate("manage");
                else setUnlockOpen(true);
            }
        },
        [directory?.administrator, navigate],
    );

    usePaneToolbar(
        [
            { id: "refresh", label: "刷新" },
            directory?.administrator
                ? {
                      id: "admin",
                      label:
                          summary.pending > 0
                              ? `待审 · ${summary.pending}`
                              : "服务管理",
                      selected: managing,
                  }
                : { id: "admin", label: "管理员解锁" },
        ],
        (id) => {
            if (id === "refresh") {
                reload(true);
                return;
            }
            if (id === "admin") {
                if (!directory?.administrator) {
                    setUnlockOpen(true);
                } else if (summary.pending > 0) {
                    navigate("manage", { filter: "pending" });
                } else {
                    navigate("manage");
                }
            }
        },
    );

    async function performServiceChange(
        action: string,
        args: Record<string, string | boolean>,
        appId: string,
        successToast: string,
    ) {
        if (changing) return;
        setChanging(true);
        setBusyAppId(appId);
        setChangeError("");
        try {
            await request(action, args);
            showToast({
                uniqueID: `app-center-${action}-${appId}`,
                body: successToast,
                type: "info",
                autoHideDuration: 2800,
            });
        } catch (failure) {
            setChangeError(
                failure instanceof Error ? failure.message : String(failure),
            );
        } finally {
            setDisableTargetId("");
            setRemoveTargetId("");
            setChanging(false);
            setBusyAppId("");
            reload(false);
        }
    }

    function handleServiceToggle(service: Service, enable: boolean) {
        if (enable) {
            void performServiceChange(
                "app-center.set",
                { app_id: service.app_id, enabled: true },
                service.app_id,
                `已提交启用「${serviceDisplayName(service)}」`,
            );
        } else {
            setDisableTargetId(service.app_id);
        }
    }

    function handleServiceReview(service: Service, approve: boolean) {
        if (!service.pending) return;
        const name = serviceDisplayName(service);
        void performServiceChange(
            "app-center.review",
            {
                app_id: service.app_id,
                request_id: service.pending.request_id,
                approve,
            },
            service.app_id,
            approve
                ? `已批准「${name}」的发布申请`
                : `已拒绝「${name}」的发布申请`,
        );
    }

    const filterLabels: Record<ServiceFilter, string> = {
        all: `全部 (${summary.total})`,
        pending: `待审批 (${summary.pending})`,
        running: `运行中 (${summary.running})`,
        stopped: `未运行 (${summary.stopped})`,
        attention: `需关注 (${summary.attention})`,
    };

    const hasQuery = query.trim().length > 0;

    function renderDiscoverContent() {
        if (!directory) {
            return loadError ? null : <DiscoverSkeletonGrid />;
        }
        if (!visibleDiscoverApps.length) {
            return (
                <EmptyState
                    title={hasQuery ? "没有找到匹配的应用" : "暂无已启用应用"}
                    description={
                        hasQuery
                            ? "试试更换关键词，或清除搜索查看全部应用。"
                            : "当前服务端没有启用的应用，可刷新目录或进入服务管理启用。"
                    }
                    icon={
                        <Icon
                            icon={
                                hasQuery ? MagnifyingGlassIcon : Squares2X2Icon
                            }
                        />
                    }
                    actions={
                        hasQuery ? (
                            <Button
                                label="清除搜索"
                                variant="secondary"
                                onClick={() => setQuery("")}
                            />
                        ) : (
                            <HStack gap={2}>
                                <Button
                                    label="刷新目录"
                                    variant="secondary"
                                    onClick={() => reload(true)}
                                />
                                <Button
                                    label="服务管理"
                                    variant="primary"
                                    onClick={() => handleTabChange("manage")}
                                />
                            </HStack>
                        )
                    }
                />
            );
        }
        return (
            <AppGallery
                items={visibleDiscoverApps}
                onSelect={setDetailDiscoverApp}
            />
        );
    }

    function renderManageContent() {
        if (!directory) {
            return loadError ? null : <ServiceSkeletonList />;
        }
        if (!directory.administrator) {
            return (
                <EmptyState
                    title="需要管理员权限"
                    description="输入管理令牌解锁后，即可查看容器实例状态、审批上架/更新申请并控制应用启停。"
                    icon={<Icon icon={LockClosedIcon} />}
                    actions={
                        <Button
                            label="管理员解锁"
                            variant="primary"
                            onClick={() => setUnlockOpen(true)}
                        />
                    }
                />
            );
        }
        if (!visibleServices.length) {
            const filtered = hasQuery || serviceFilter !== "all";
            return (
                <EmptyState
                    title={filtered ? "没有找到匹配的服务" : "暂无服务记录"}
                    description={
                        filtered
                            ? "调整筛选分类或清除搜索词即可查看全部应用服务。"
                            : "服务端尚未登记任何应用服务。"
                    }
                    icon={<Icon icon={MagnifyingGlassIcon} />}
                    actions={
                        filtered && (
                            <Button
                                label="重置筛选"
                                variant="secondary"
                                onClick={() => {
                                    setQuery("");
                                    setServiceFilter("all");
                                }}
                            />
                        )
                    }
                />
            );
        }
        return (
            <VStack gap={3} width="100%">
                {visibleServices.map((service) => (
                    <ServiceCard
                        key={service.app_id}
                        service={service}
                        busy={changing}
                        rowBusy={changing && busyAppId === service.app_id}
                        onChange={(enable) =>
                            handleServiceToggle(service, enable)
                        }
                        onReview={(approve) =>
                            handleServiceReview(service, approve)
                        }
                        onRemove={() => setRemoveTargetId(service.app_id)}
                        onInspect={() => setDetailServiceId(service.app_id)}
                    />
                ))}
            </VStack>
        );
    }

    return (
        <VStack width="100%" height="100dvh" gap={0}>
            <Layout
                height="fill"
                contentWidth="64rem"
                header={
                    <LayoutHeader
                        hasDivider
                        padding={wide ? 6 : 4}
                        paddingBlockEnd={0}
                    >
                        <VStack gap={3}>
                            <HStack
                                hAlign="between"
                                vAlign="center"
                                wrap="wrap"
                                gap={3}
                            >
                                <VStack gap={0.5}>
                                    <Heading level={1} weight="bold">
                                        应用中心
                                    </Heading>
                                    <Text type="supporting" color="secondary">
                                        {managing
                                            ? "查看容器状态、审批上架申请并管理服务启停"
                                            : "发现并浏览当前服务端已启用的应用"}
                                    </Text>
                                </VStack>
                                <HStack gap={2} vAlign="center">
                                    {directory?.administrator && (
                                        <Badge
                                            variant="success"
                                            label="管理员"
                                        />
                                    )}
                                    <IconButton
                                        label="刷新目录"
                                        tooltip="刷新目录"
                                        variant="ghost"
                                        icon={<Icon icon={ArrowPathIcon} />}
                                        isLoading={refreshing}
                                        isDisabled={initialLoading}
                                        onClick={() => reload(true)}
                                    />
                                </HStack>
                            </HStack>

                            <TabList
                                value={page}
                                onChange={handleTabChange}
                                role="tablist"
                                aria-label="应用中心视图"
                            >
                                <Tab
                                    value="discover"
                                    label="发现"
                                    aria-label="发现"
                                    icon={<Icon icon={Squares2X2Icon} />}
                                    endContent={
                                        directory ? (
                                            <Badge
                                                variant="neutral"
                                                label={directory.names.length}
                                            />
                                        ) : undefined
                                    }
                                />
                                <Tab
                                    value="manage"
                                    label="服务管理"
                                    aria-label="服务管理"
                                    icon={
                                        <Icon
                                            icon={
                                                directory?.administrator
                                                    ? ShieldCheckIcon
                                                    : LockClosedIcon
                                            }
                                        />
                                    }
                                    endContent={
                                        directory?.administrator ? (
                                            summary.pending > 0 ? (
                                                <Badge
                                                    variant="warning"
                                                    label={`${summary.pending} 待审`}
                                                />
                                            ) : (
                                                <Badge
                                                    variant="neutral"
                                                    label={summary.total}
                                                />
                                            )
                                        ) : undefined
                                    }
                                />
                            </TabList>
                        </VStack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent
                        isScrollable
                        role="main"
                        padding={wide ? 6 : 4}
                    >
                        <VStack gap={5}>
                            {loadError && (
                                <Banner
                                    status="error"
                                    title="目录加载失败"
                                    description={loadError}
                                    endContent={
                                        <Button
                                            label="重试"
                                            size="sm"
                                            onClick={() => reload(true)}
                                        />
                                    }
                                />
                            )}
                            {changeError && (
                                <Banner
                                    status="error"
                                    title="服务变更失败"
                                    description={changeError}
                                    endContent={
                                        <Button
                                            label="关闭"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setChangeError("")}
                                        />
                                    }
                                />
                            )}

                            {!managing ? (
                                <VStack gap={4}>
                                    <HStack gap={3} vAlign="center" wrap="wrap">
                                        <StackItem size="fill">
                                            <TextInput
                                                label="搜索应用"
                                                isLabelHidden
                                                placeholder="按应用名称、标识或版本搜索…"
                                                startIcon={MagnifyingGlassIcon}
                                                hasClear
                                                size="lg"
                                                value={query}
                                                onChange={setQuery}
                                            />
                                        </StackItem>
                                        <DropdownMenu
                                            button={{
                                                label: DISCOVER_SORT_LABELS[
                                                    discoverSort
                                                ],
                                                size: "lg",
                                                variant: "secondary",
                                                icon: (
                                                    <Icon
                                                        icon={ArrowsUpDownIcon}
                                                    />
                                                ),
                                            }}
                                            items={(
                                                [
                                                    "default",
                                                    "name-asc",
                                                    "name-desc",
                                                ] as DiscoverSort[]
                                            ).map((option) => ({
                                                id: option,
                                                label: DISCOVER_SORT_LABELS[
                                                    option
                                                ],
                                                onClick: () =>
                                                    setDiscoverSort(option),
                                            }))}
                                        />
                                    </HStack>

                                    <HStack
                                        hAlign="between"
                                        vAlign="center"
                                        gap={2}
                                    >
                                        <Heading level={2}>
                                            {hasQuery
                                                ? "搜索结果"
                                                : "已启用应用"}
                                        </Heading>
                                        {directory && (
                                            <Text
                                                type="supporting"
                                                color="secondary"
                                                hasTabularNumbers
                                            >
                                                {hasQuery
                                                    ? `找到 ${visibleDiscoverApps.length} / ${discoverCatalog.length} 个`
                                                    : `共 ${discoverCatalog.length} 个`}
                                            </Text>
                                        )}
                                    </HStack>

                                    {renderDiscoverContent()}
                                </VStack>
                            ) : (
                                <VStack gap={4}>
                                    {directory?.administrator && (
                                        <>
                                            {summary.pending > 0 &&
                                                serviceFilter !== "pending" && (
                                                    <Banner
                                                        status="warning"
                                                        title={`有 ${summary.pending} 项上架或更新申请待审批`}
                                                        description="核对镜像地址与摘要后，可在列表或详情抽屉中直接批准或拒绝。"
                                                        endContent={
                                                            <Button
                                                                label="仅看待审批"
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    setServiceFilter(
                                                                        "pending",
                                                                    )
                                                                }
                                                            />
                                                        }
                                                    />
                                                )}

                                            <ServiceSummaryStrip
                                                summary={summary}
                                            />

                                            <VStack gap={3}>
                                                <TextInput
                                                    label="搜索服务"
                                                    isLabelHidden
                                                    placeholder="按服务名称、应用标识、镜像或审批人搜索…"
                                                    startIcon={
                                                        MagnifyingGlassIcon
                                                    }
                                                    hasClear
                                                    value={query}
                                                    onChange={setQuery}
                                                />
                                                <HStack
                                                    hAlign="between"
                                                    vAlign="center"
                                                    gap={3}
                                                >
                                                    <StackItem size="fill">
                                                        <VStack>
                                                            <ToggleButtonGroup
                                                                label="按状态筛选服务"
                                                                value={
                                                                    serviceFilter
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) =>
                                                                    setServiceFilter(
                                                                        (value as ServiceFilter) ??
                                                                            "all",
                                                                    )
                                                                }
                                                            >
                                                                <OverflowList
                                                                    gap={1.5}
                                                                    behavior="observeParent"
                                                                    overflowRenderer={(
                                                                        overflowItems,
                                                                    ) => (
                                                                        <DropdownMenu
                                                                            button={{
                                                                                label: `+${overflowItems.length}`,
                                                                                variant:
                                                                                    "ghost",
                                                                                size: "sm",
                                                                            }}
                                                                            items={overflowItems.map(
                                                                                ({
                                                                                    index,
                                                                                }) => {
                                                                                    const key =
                                                                                        SERVICE_FILTER_ORDER[
                                                                                            index
                                                                                        ];
                                                                                    return {
                                                                                        id: key,
                                                                                        label: filterLabels[
                                                                                            key
                                                                                        ],
                                                                                        onClick:
                                                                                            () =>
                                                                                                setServiceFilter(
                                                                                                    key,
                                                                                                ),
                                                                                    };
                                                                                },
                                                                            )}
                                                                        />
                                                                    )}
                                                                >
                                                                    {SERVICE_FILTER_ORDER.map(
                                                                        (
                                                                            key,
                                                                        ) => (
                                                                            <ToggleButton
                                                                                key={
                                                                                    key
                                                                                }
                                                                                value={
                                                                                    key
                                                                                }
                                                                                size="sm"
                                                                                label={
                                                                                    filterLabels[
                                                                                        key
                                                                                    ]
                                                                                }
                                                                            />
                                                                        ),
                                                                    )}
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
                                                        显示{" "}
                                                        {visibleServices.length}{" "}
                                                        / {allServices.length}
                                                    </Text>
                                                </HStack>
                                            </VStack>
                                        </>
                                    )}

                                    {renderManageContent()}
                                </VStack>
                            )}
                        </VStack>
                    </LayoutContent>
                }
            />

            <UnlockDialog
                isOpen={unlockOpen}
                onClose={() => setUnlockOpen(false)}
                onUnlocked={() => {
                    setUnlockOpen(false);
                    showToast({
                        uniqueID: "app-center-unlocked",
                        body: "管理员权限已解锁",
                        type: "info",
                        autoHideDuration: 2400,
                    });
                    navigate("manage");
                    reload(false);
                }}
            />

            <DiscoverDetailDrawer
                item={detailDiscoverApp}
                administrator={Boolean(directory?.administrator)}
                onClose={() => setDetailDiscoverApp(null)}
                onOpenManage={(searchKey) =>
                    navigate("manage", { query: searchKey })
                }
            />

            <ServiceDetailDrawer
                service={detailService}
                busy={changing}
                onClose={() => setDetailServiceId(null)}
                onToggleEnabled={handleServiceToggle}
                onReview={handleServiceReview}
                onRequestRemove={(service) => setRemoveTargetId(service.app_id)}
            />

            {disableTarget && (
                <AlertDialog
                    isOpen
                    title={`停用「${serviceDisplayName(disableTarget)}」？`}
                    description="应用将结束所有用户的在途任务并停止容器。已写入应用数据库的数据和工作目录里的文件会保留。"
                    actionLabel="停用"
                    cancelLabel="取消"
                    actionVariant="destructive"
                    isActionLoading={changing}
                    onOpenChange={(open) => {
                        if (!open && !changing) setDisableTargetId("");
                    }}
                    onAction={() =>
                        void performServiceChange(
                            "app-center.set",
                            {
                                app_id: disableTarget.app_id,
                                enabled: false,
                            },
                            disableTarget.app_id,
                            `已提交停用「${serviceDisplayName(disableTarget)}」`,
                        )
                    }
                />
            )}

            {removeTarget && (
                <AlertDialog
                    isOpen
                    title={`下架「${serviceDisplayName(removeTarget)}」？`}
                    description={`应用标识：${removeTarget.app_id}。应用将结束在途任务并移除容器，工作卷会保留，再次上架需要重新提交申请。`}
                    actionLabel="下架应用"
                    cancelLabel="取消"
                    actionVariant="destructive"
                    isActionLoading={changing}
                    onOpenChange={(open) => {
                        if (!open && !changing) setRemoveTargetId("");
                    }}
                    onAction={() =>
                        void performServiceChange(
                            "app-center.remove",
                            { app_id: removeTarget.app_id },
                            removeTarget.app_id,
                            `已下架「${serviceDisplayName(removeTarget)}」`,
                        )
                    }
                />
            )}
        </VStack>
    );
}

createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <LayerProvider toast={{ position: "bottomEnd", maxVisible: 3 }}>
            <AppCenter />
        </LayerProvider>
    </AppBoundary>,
);
