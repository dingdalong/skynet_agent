import { useEffect, useState } from "react";
import {
    AspectRatio,
    Badge,
    Banner,
    Button,
    Card,
    Center,
    Drawer,
    DrawerHeader,
    Heading,
    HStack,
    Icon,
    IconButton,
    Layout,
    LayoutContent,
    LayoutFooter,
    MetadataList,
    MetadataListItem,
    Section,
    StatusDot,
    Text,
    Thumbnail,
    VStack,
    useToast,
} from "@astryxdesign/core";
import { useClipboard } from "@astryxdesign/core/hooks";
import {
    AdjustmentsHorizontalIcon,
    CheckIcon,
    ClipboardDocumentIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import {
    coverForApp,
    formatVersionBadge,
    localStatusLabel,
    serviceDisplayName,
    serviceStatusMeta,
    type DiscoverApp,
    type Service,
} from "./presentation";

function CopyableValue({
    value,
    copyLabel,
    toastLabel,
}: {
    value?: string;
    copyLabel: string;
    toastLabel: string;
}) {
    const showToast = useToast();
    const { copy, isCopied } = useClipboard({
        announce: `已复制${toastLabel}`,
    });
    const display = value?.trim();
    if (!display) {
        return (
            <Text type="supporting" color="secondary">
                —
            </Text>
        );
    }

    async function handleCopy() {
        const copied = await copy(display!);
        if (copied) {
            showToast({
                uniqueID: `copy-${toastLabel}`,
                body: `已复制${toastLabel}`,
                type: "info",
                autoHideDuration: 2200,
            });
        } else {
            showToast({
                uniqueID: `copy-error-${toastLabel}`,
                body: "无法写入剪贴板，请手动复制",
                type: "error",
            });
        }
    }

    return (
        <HStack gap={1.5} vAlign="center" hAlign="between" width="100%">
            <Text
                type="supporting"
                maxLines={2}
                wordBreak="break-all"
                hasTruncateTooltip
            >
                {display}
            </Text>
            <IconButton
                label={isCopied ? `已复制${copyLabel}` : `复制${copyLabel}`}
                tooltip={isCopied ? "已复制" : `复制${copyLabel}`}
                size="sm"
                variant="ghost"
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

export function DiscoverDetailDrawer({
    item,
    administrator,
    onClose,
    onOpenManage,
}: {
    item: DiscoverApp | null;
    administrator: boolean;
    onClose: () => void;
    onOpenManage: (query: string) => void;
}) {
    const [cached, setCached] = useState<DiscoverApp | null>(item);
    useEffect(() => {
        if (item) setCached(item);
    }, [item]);

    const active = item ?? cached;
    const versionLabel = formatVersionBadge(active?.version);

    return (
        <Drawer
            isOpen={Boolean(item)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            side="end"
            width={420}
            label={active ? `${active.name} 应用详情` : "应用详情"}
        >
            {active && (
                <Layout
                    height="fill"
                    header={
                        <DrawerHeader
                            title={active.name}
                            subtitle={active.appId ?? "已启用应用"}
                            endContent={
                                versionLabel ? (
                                    <Badge
                                        variant="neutral"
                                        label={versionLabel}
                                    />
                                ) : undefined
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
                                <Card padding={0} elevation="none">
                                    <AspectRatio
                                        ratio={3 / 2}
                                        aria-hidden="true"
                                    >
                                        {active.cover ? (
                                            <Thumbnail
                                                src={active.cover}
                                                alt=""
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    borderRadius: 0,
                                                }}
                                            />
                                        ) : (
                                            <Section
                                                variant="muted"
                                                width="100%"
                                                height="100%"
                                                padding={0}
                                            >
                                                <Center
                                                    axis="both"
                                                    height="100%"
                                                >
                                                    <Icon
                                                        icon={CubeIcon}
                                                        size="lg"
                                                        color="secondary"
                                                    />
                                                </Center>
                                            </Section>
                                        )}
                                    </AspectRatio>
                                </Card>

                                <MetadataList title="目录信息">
                                    <MetadataListItem label="应用名称">
                                        {active.name}
                                    </MetadataListItem>
                                    <MetadataListItem label="运行状态">
                                        <HStack gap={1.5} vAlign="center">
                                            <StatusDot
                                                variant="success"
                                                label="已启用"
                                            />
                                            <Text type="supporting">
                                                已在服务器启用
                                            </Text>
                                        </HStack>
                                    </MetadataListItem>
                                    {active.appId && (
                                        <MetadataListItem label="应用标识">
                                            <CopyableValue
                                                value={active.appId}
                                                copyLabel="应用标识"
                                                toastLabel="应用标识"
                                            />
                                        </MetadataListItem>
                                    )}
                                    {versionLabel && (
                                        <MetadataListItem label="线上版本">
                                            <Text hasTabularNumbers>
                                                {versionLabel}
                                            </Text>
                                        </MetadataListItem>
                                    )}
                                    <MetadataListItem label="当前设备">
                                        {localStatusLabel(
                                            active.localApp?.status,
                                        )}
                                    </MetadataListItem>
                                    {active.isPlatformCore && (
                                        <MetadataListItem label="服务类别">
                                            平台核心内置服务
                                        </MetadataListItem>
                                    )}
                                </MetadataList>
                            </VStack>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter hasDivider>
                            <HStack hAlign="between" vAlign="center" gap={2}>
                                {administrator ? (
                                    <Button
                                        label="在服务管理中查看"
                                        variant="primary"
                                        icon={
                                            <Icon
                                                icon={AdjustmentsHorizontalIcon}
                                            />
                                        }
                                        onClick={() => {
                                            onClose();
                                            onOpenManage(
                                                active.appId ?? active.name,
                                            );
                                        }}
                                    />
                                ) : (
                                    <Text
                                        type="supporting"
                                        size="xsm"
                                        color="secondary"
                                    >
                                        完整容器详情需管理员解锁查看
                                    </Text>
                                )}
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

export function ServiceDetailDrawer({
    service,
    busy,
    onClose,
    onToggleEnabled,
    onReview,
    onRequestRemove,
}: {
    service: Service | null;
    busy: boolean;
    onClose: () => void;
    onToggleEnabled: (service: Service, enable: boolean) => void;
    onReview: (service: Service, approve: boolean) => void;
    onRequestRemove: (service: Service) => void;
}) {
    const [cached, setCached] = useState<Service | null>(service);
    useEffect(() => {
        if (service) setCached(service);
    }, [service]);

    const active = service ?? cached;
    const status = active ? serviceStatusMeta(active) : null;
    const displayName = active ? serviceDisplayName(active) : "服务详情";
    const cover = active ? coverForApp(displayName, active.app_id) : undefined;

    return (
        <Drawer
            isOpen={Boolean(service)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            side="end"
            width={460}
            label={`${displayName} 服务详情`}
        >
            {active && status && (
                <Layout
                    height="fill"
                    header={
                        <DrawerHeader
                            title={displayName}
                            subtitle={active.app_id}
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
                                {cover && (
                                    <Card padding={0} elevation="none">
                                        <AspectRatio
                                            ratio={3 / 2}
                                            aria-hidden="true"
                                        >
                                            <Thumbnail
                                                src={cover}
                                                alt=""
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    borderRadius: 0,
                                                }}
                                            />
                                        </AspectRatio>
                                    </Card>
                                )}

                                {(status.failed ||
                                    active.transition === "unavailable") && (
                                    <Banner
                                        status="error"
                                        container="card"
                                        title={status.label}
                                        description={status.description}
                                    />
                                )}

                                {active.pending && (
                                    <Card variant="muted" padding={4}>
                                        <VStack gap={3}>
                                            <HStack
                                                hAlign="between"
                                                vAlign="center"
                                                gap={2}
                                                wrap="wrap"
                                            >
                                                <Heading level={3}>
                                                    {active.approved
                                                        ? "版本更新待审批"
                                                        : "首次上架待审批"}
                                                </Heading>
                                                <Badge
                                                    variant="warning"
                                                    label="待处理"
                                                />
                                            </HStack>
                                            <MetadataList>
                                                <MetadataListItem label="申请名称">
                                                    {active.pending.name || "—"}
                                                </MetadataListItem>
                                                {active.pending.request_id && (
                                                    <MetadataListItem label="请求编号">
                                                        <CopyableValue
                                                            value={
                                                                active.pending
                                                                    .request_id
                                                            }
                                                            copyLabel="请求编号"
                                                            toastLabel="请求编号"
                                                        />
                                                    </MetadataListItem>
                                                )}
                                                <MetadataListItem label="待审镜像">
                                                    <CopyableValue
                                                        value={
                                                            active.pending.image
                                                        }
                                                        copyLabel="待审镜像"
                                                        toastLabel="镜像地址"
                                                    />
                                                </MetadataListItem>
                                                <MetadataListItem label="镜像摘要">
                                                    <CopyableValue
                                                        value={
                                                            active.pending
                                                                .image_id
                                                        }
                                                        copyLabel="镜像摘要"
                                                        toastLabel="镜像摘要"
                                                    />
                                                </MetadataListItem>
                                            </MetadataList>
                                            <HStack gap={2} hAlign="end">
                                                <Button
                                                    label="拒绝"
                                                    variant="secondary"
                                                    isDisabled={busy}
                                                    onClick={() =>
                                                        onReview(active, false)
                                                    }
                                                />
                                                <Button
                                                    label="批准"
                                                    variant="primary"
                                                    isLoading={busy}
                                                    isDisabled={busy}
                                                    onClick={() =>
                                                        onReview(active, true)
                                                    }
                                                />
                                            </HStack>
                                        </VStack>
                                    </Card>
                                )}

                                <MetadataList title="运行状态">
                                    <MetadataListItem label="服务状态">
                                        <HStack gap={1.5} vAlign="center">
                                            <StatusDot
                                                variant={status.dotVariant}
                                                isPulsing={status.pulsing}
                                                label={status.label}
                                            />
                                            <Text type="supporting">
                                                {status.label} ·{" "}
                                                {status.description}
                                            </Text>
                                        </HStack>
                                    </MetadataListItem>
                                    <MetadataListItem label="应用标识">
                                        <CopyableValue
                                            value={active.app_id}
                                            copyLabel="应用标识"
                                            toastLabel="应用标识"
                                        />
                                    </MetadataListItem>
                                    <MetadataListItem label="运行实例">
                                        <Text hasTabularNumbers>
                                            {active.instances} 个
                                        </Text>
                                    </MetadataListItem>
                                    <MetadataListItem label="期望状态">
                                        {active.desired ? "已启用" : "已停用"}
                                    </MetadataListItem>
                                    <MetadataListItem label="启停控制">
                                        {active.can_set_enabled
                                            ? "允许管理员启停"
                                            : active.app_id === "app-center"
                                              ? "平台核心受控"
                                              : "当前状态不可切换"}
                                    </MetadataListItem>
                                </MetadataList>

                                {active.approved && (
                                    <MetadataList title="已批准版本">
                                        <MetadataListItem label="批准名称">
                                            {active.approved.name ||
                                                displayName}
                                        </MetadataListItem>
                                        <MetadataListItem label="镜像地址">
                                            <CopyableValue
                                                value={active.approved.image}
                                                copyLabel="镜像地址"
                                                toastLabel="镜像地址"
                                            />
                                        </MetadataListItem>
                                        <MetadataListItem label="镜像摘要">
                                            <CopyableValue
                                                value={active.approved.image_id}
                                                copyLabel="镜像摘要"
                                                toastLabel="镜像摘要"
                                            />
                                        </MetadataListItem>
                                    </MetadataList>
                                )}

                                {active.last && (
                                    <MetadataList title="最近审批记录">
                                        <MetadataListItem label="审批结果">
                                            <Badge
                                                variant={
                                                    active.last.accepted
                                                        ? "success"
                                                        : "error"
                                                }
                                                label={
                                                    active.last.accepted
                                                        ? "已批准"
                                                        : "已拒绝"
                                                }
                                            />
                                        </MetadataListItem>
                                        <MetadataListItem label="审批人">
                                            {active.last.reviewer || "—"}
                                        </MetadataListItem>
                                        <MetadataListItem label="审批镜像">
                                            <CopyableValue
                                                value={active.last.image}
                                                copyLabel="审批镜像"
                                                toastLabel="镜像地址"
                                            />
                                        </MetadataListItem>
                                        {active.last.image_id && (
                                            <MetadataListItem label="镜像摘要">
                                                <CopyableValue
                                                    value={active.last.image_id}
                                                    copyLabel="镜像摘要"
                                                    toastLabel="镜像摘要"
                                                />
                                            </MetadataListItem>
                                        )}
                                    </MetadataList>
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
                                    {active.can_set_enabled && (
                                        <Button
                                            label={status.toggleLabel}
                                            variant="secondary"
                                            isLoading={busy}
                                            isDisabled={busy || status.changing}
                                            onClick={() =>
                                                onToggleEnabled(
                                                    active,
                                                    status.nextEnabled,
                                                )
                                            }
                                        />
                                    )}
                                    {active.approved && (
                                        <Button
                                            label="下架"
                                            variant="destructive"
                                            isDisabled={busy || status.changing}
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
