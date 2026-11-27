import {
    AspectRatio,
    Badge,
    Banner,
    Button,
    Card,
    Center,
    ClickableCard,
    Grid,
    Heading,
    HStack,
    Icon,
    IconButton,
    Section,
    Skeleton,
    StackItem,
    StatusDot,
    Text,
    Thumbnail,
    VStack,
} from "@astryxdesign/core";
import { ChevronRightIcon, CubeIcon } from "@heroicons/react/24/outline";
import {
    coverForApp,
    formatVersionBadge,
    localStatusLabel,
    serviceDisplayName,
    serviceStatusMeta,
    shortImageId,
    type DiscoverApp,
    type Service,
    type ServiceSummary,
} from "./presentation";

export function DiscoverSkeletonGrid() {
    return (
        <Grid
            columns={{ minWidth: 320, max: 2, repeat: "fill" }}
            gap={4}
            width="100%"
        >
            {[0, 1, 2, 3].map((index) => (
                <Card key={index} padding={0} elevation="low">
                    <AspectRatio ratio={3 / 2} aria-hidden="true">
                        <Skeleton
                            width="100%"
                            height="100%"
                            radius="none"
                            index={index}
                        />
                    </AspectRatio>
                    <VStack padding={4} gap={2}>
                        <Skeleton
                            width="45%"
                            height={20}
                            radius={1}
                            index={index}
                        />
                        <Skeleton
                            width="70%"
                            height={14}
                            radius={1}
                            index={index}
                        />
                    </VStack>
                </Card>
            ))}
        </Grid>
    );
}

export function AppGallery({
    items,
    onSelect,
}: {
    items: DiscoverApp[];
    onSelect: (item: DiscoverApp) => void;
}) {
    return (
        <Grid
            columns={{ minWidth: 320, max: 2, repeat: "fill" }}
            gap={4}
            width="100%"
        >
            {items.map((item) => {
                const versionLabel = formatVersionBadge(item.version);
                const subtitle = item.appId
                    ? item.localApp
                        ? `${item.appId} · ${localStatusLabel(item.localApp.status)}`
                        : item.appId
                    : item.localApp
                      ? localStatusLabel(item.localApp.status)
                      : "服务器已启用";
                return (
                    <VStack
                        as="article"
                        key={item.key}
                        gap={0}
                        data-discover-app={item.appId ?? item.name}
                    >
                        <ClickableCard
                            padding={0}
                            elevation="low"
                            label={`查看 ${item.name} 详情`}
                            onClick={() => onSelect(item)}
                        >
                            <AspectRatio ratio={3 / 2} aria-hidden="true">
                                {item.cover ? (
                                    <Thumbnail
                                        src={item.cover}
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
                                        <Center axis="both" height="100%">
                                            <Icon
                                                icon={CubeIcon}
                                                size="lg"
                                                color="secondary"
                                            />
                                        </Center>
                                    </Section>
                                )}
                            </AspectRatio>
                            <VStack padding={4} gap={2}>
                                <HStack
                                    hAlign="between"
                                    vAlign="center"
                                    gap={2}
                                >
                                    <StackItem size="fill">
                                        <Heading level={3} maxLines={1}>
                                            {item.name}
                                        </Heading>
                                    </StackItem>
                                    <HStack gap={1.5} vAlign="center">
                                        <StatusDot
                                            variant="success"
                                            label="已启用"
                                        />
                                        <Text
                                            type="supporting"
                                            size="xsm"
                                            color="secondary"
                                        >
                                            已启用
                                        </Text>
                                    </HStack>
                                </HStack>
                                <HStack
                                    hAlign="between"
                                    vAlign="center"
                                    gap={2}
                                >
                                    <StackItem size="fill">
                                        <Text
                                            type="supporting"
                                            color="secondary"
                                            maxLines={1}
                                            hasTruncateTooltip
                                        >
                                            {subtitle}
                                        </Text>
                                    </StackItem>
                                    {versionLabel && (
                                        <Badge
                                            variant="neutral"
                                            label={versionLabel}
                                        />
                                    )}
                                </HStack>
                            </VStack>
                        </ClickableCard>
                    </VStack>
                );
            })}
        </Grid>
    );
}

export function ServiceSummaryStrip({ summary }: { summary: ServiceSummary }) {
    const metrics: {
        key: string;
        label: string;
        value: number;
        dot: "neutral" | "success" | "warning" | "error";
    }[] = [
        {
            key: "total",
            label: "全部服务",
            value: summary.total,
            dot: "neutral",
        },
        {
            key: "running",
            label: "运行中",
            value: summary.running,
            dot: summary.running > 0 ? "success" : "neutral",
        },
        {
            key: "pending",
            label: "待审批",
            value: summary.pending,
            dot: summary.pending > 0 ? "warning" : "neutral",
        },
        {
            key: "attention",
            label: "需关注",
            value: summary.attention,
            dot: summary.attention > 0 ? "error" : "neutral",
        },
    ];
    return (
        <Grid
            columns={{ minWidth: 120, max: 4, repeat: "fit" }}
            gap={3}
            width="100%"
        >
            {metrics.map((metric) => (
                <Card key={metric.key} padding={3}>
                    <VStack gap={1}>
                        <HStack gap={1.5} vAlign="center">
                            <StatusDot
                                variant={metric.dot}
                                label={metric.label}
                            />
                            <Text
                                type="supporting"
                                size="xsm"
                                color="secondary"
                            >
                                {metric.label}
                            </Text>
                        </HStack>
                        <Text size="lg" weight="semibold" hasTabularNumbers>
                            {metric.value}
                        </Text>
                    </VStack>
                </Card>
            ))}
        </Grid>
    );
}

export function ServiceSkeletonList() {
    return (
        <VStack gap={3} width="100%">
            {[0, 1, 2].map((index) => (
                <Card key={index} padding={4} elevation="none">
                    <HStack gap={3} vAlign="center">
                        <Skeleton
                            width={48}
                            height={48}
                            radius={2}
                            index={index}
                        />
                        <StackItem size="fill">
                            <VStack gap={2}>
                                <Skeleton
                                    width="35%"
                                    height={18}
                                    radius={1}
                                    index={index}
                                />
                                <Skeleton
                                    width="65%"
                                    height={14}
                                    radius={1}
                                    index={index}
                                />
                            </VStack>
                        </StackItem>
                    </HStack>
                </Card>
            ))}
        </VStack>
    );
}

export function ServiceCard({
    service,
    busy,
    rowBusy,
    onChange,
    onReview,
    onRemove,
    onInspect,
}: {
    service: Service;
    busy: boolean;
    rowBusy: boolean;
    onChange: (enabled: boolean) => void;
    onReview: (approve: boolean) => void;
    onRemove: () => void;
    onInspect: () => void;
}) {
    const status = serviceStatusMeta(service);
    const displayName = serviceDisplayName(service);
    const cover = coverForApp(displayName, service.app_id);
    const subtitleParts = [
        service.app_id,
        `${service.instances} 个实例`,
        service.approved?.image,
    ].filter(Boolean);

    return (
        <VStack
            as="article"
            gap={0}
            width="100%"
            data-service-id={service.app_id}
        >
            <Card padding={4} elevation="none">
                <VStack gap={3}>
                    <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
                        <StackItem size="fill">
                            <HStack gap={3} vAlign="center">
                                {cover ? (
                                    <Thumbnail src={cover} alt="" />
                                ) : (
                                    <Card
                                        variant="muted"
                                        padding={3}
                                        elevation="none"
                                    >
                                        <Icon
                                            icon={CubeIcon}
                                            size="md"
                                            color="secondary"
                                        />
                                    </Card>
                                )}
                                <StackItem size="fill">
                                    <VStack gap={1}>
                                        <HStack
                                            gap={2}
                                            vAlign="center"
                                            wrap="wrap"
                                        >
                                            <Heading level={3} maxLines={1}>
                                                {displayName}
                                            </Heading>
                                            {status.pulsing && (
                                                <StatusDot
                                                    variant={status.dotVariant}
                                                    isPulsing
                                                    label={status.label}
                                                />
                                            )}
                                            <Badge
                                                variant={status.badgeVariant}
                                                label={status.label}
                                            />
                                            {service.pending && (
                                                <Badge
                                                    variant="warning"
                                                    label={
                                                        service.approved
                                                            ? "更新待审"
                                                            : "首次上架待审"
                                                    }
                                                />
                                            )}
                                            {service.app_id ===
                                                "app-center" && (
                                                <Badge
                                                    variant="neutral"
                                                    label="平台核心"
                                                />
                                            )}
                                        </HStack>
                                        <Text
                                            type="supporting"
                                            color="secondary"
                                            maxLines={1}
                                            hasTruncateTooltip
                                        >
                                            {subtitleParts.join(" · ")}
                                        </Text>
                                    </VStack>
                                </StackItem>
                            </HStack>
                        </StackItem>

                        <HStack gap={2} vAlign="center" wrap="wrap">
                            {service.pending && (
                                <>
                                    <Button
                                        label="批准"
                                        variant="primary"
                                        size="sm"
                                        isLoading={rowBusy}
                                        isDisabled={busy}
                                        onClick={() => onReview(true)}
                                    />
                                    <Button
                                        label="拒绝"
                                        size="sm"
                                        variant="secondary"
                                        isDisabled={busy}
                                        onClick={() => onReview(false)}
                                    />
                                </>
                            )}
                            {service.can_set_enabled && (
                                <Button
                                    label={status.toggleLabel}
                                    size="sm"
                                    variant="secondary"
                                    isLoading={rowBusy && !service.pending}
                                    isDisabled={busy || status.changing}
                                    onClick={() => onChange(status.nextEnabled)}
                                />
                            )}
                            {service.approved && (
                                <Button
                                    label="下架"
                                    size="sm"
                                    variant="ghost"
                                    isDisabled={busy || status.changing}
                                    onClick={onRemove}
                                />
                            )}
                            <IconButton
                                label={`查看 ${displayName} 详情`}
                                tooltip="服务详情"
                                size="sm"
                                variant="ghost"
                                icon={<Icon icon={ChevronRightIcon} />}
                                onClick={onInspect}
                            />
                        </HStack>
                    </HStack>

                    {service.pending && (
                        <Section variant="muted" padding={3}>
                            <VStack gap={1}>
                                <Text type="label" size="sm" weight="semibold">
                                    {service.approved
                                        ? "待审更新版本"
                                        : "首次上架申请"}
                                    {service.pending.name
                                        ? ` · ${service.pending.name}`
                                        : ""}
                                </Text>
                                <Text
                                    type="supporting"
                                    color="secondary"
                                    maxLines={1}
                                    hasTruncateTooltip
                                >
                                    镜像：{service.pending.image || "—"} ·
                                    摘要：
                                    {shortImageId(service.pending.image_id)}
                                </Text>
                            </VStack>
                        </Section>
                    )}

                    {(status.failed ||
                        service.transition === "unavailable") && (
                        <Banner
                            status="error"
                            container="card"
                            title={status.label}
                            description={status.description}
                        />
                    )}

                    {service.last && (
                        <Text
                            type="supporting"
                            size="xsm"
                            color="secondary"
                            maxLines={1}
                            hasTruncateTooltip
                        >
                            最近审批 · {service.last.reviewer || "管理员"} 已
                            {service.last.accepted ? "批准" : "拒绝"}{" "}
                            {service.last.image ||
                                service.last.name ||
                                service.app_id}
                        </Text>
                    )}
                </VStack>
            </Card>
        </VStack>
    );
}
