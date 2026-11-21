import {
    AspectRatio,
    Badge,
    Button,
    Card,
    Grid,
    Heading,
    HStack,
    Icon,
    Section,
    StackItem,
    Text,
    Thumbnail,
    VStack,
} from "@astryxdesign/core";
import { Squares2X2Icon } from "@heroicons/react/24/outline";

export interface Service {
    app_id: string;
    name: string;
    instances: number;
    enabled: boolean;
    transition: string;
    approved?: Version;
    pending?: Version;
    last?: Version;
    desired: boolean;
    can_set_enabled: boolean;
}

interface Version {
    name: string;
    request_id: string;
    image: string;
    image_id: string;
    accepted: boolean;
    reviewer: string;
}

const covers = new Map([
    ["Agent", "./covers/agent.webp"],
    ["应用中心", "./covers/app-center.webp"],
]);

export function AppGallery({ names }: { names: string[] }) {
    return (
        <Grid
            columns={{ minWidth: 320, max: 2, repeat: "fill" }}
            gap={4}
            width="100%"
        >
            {names.map((name, index) => {
                const cover = covers.get(name);
                return (
                    <VStack as="article" key={`${name}-${index}`} gap={0}>
                        <Card padding={0} elevation="low">
                            <AspectRatio ratio={3 / 2} aria-hidden="true">
                                {cover ? (
                                    <Thumbnail
                                        src={cover}
                                        alt=""
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            borderRadius: 0,
                                        }}
                                    />
                                ) : (
                                    <VStack
                                        hAlign="center"
                                        vAlign="center"
                                        height="100%"
                                    >
                                        <Icon icon={Squares2X2Icon} size="lg" />
                                    </VStack>
                                )}
                            </AspectRatio>
                            <Section variant="transparent" padding={4}>
                                <Heading level={3} maxLines={2}>
                                    {name}
                                </Heading>
                            </Section>
                        </Card>
                    </VStack>
                );
            })}
        </Grid>
    );
}

const transitions: Record<string, string> = {
    enabling: "正在启动",
    disabling: "正在停用",
    enable_failed: "启动失败",
    disable_failed: "停用未完成",
    unavailable: "连接中断",
};

export function ServiceRow({
    service,
    busy,
    onChange,
    onReview,
    onRemove,
}: {
    service: Service;
    busy: boolean;
    onChange: (enabled: boolean) => void;
    onReview: (approve: boolean) => void;
    onRemove: () => void;
}) {
    const failed = service.transition.endsWith("_failed");
    const changing =
        service.transition === "enabling" || service.transition === "disabling";
    const enable = !service.enabled && service.transition !== "disable_failed";
    return (
        <HStack
            as="article"
            vAlign="center"
            wrap="wrap"
            gap={3}
            paddingBlock={4}
        >
            <Thumbnail src={covers.get(service.name)} />
            <StackItem size="fill">
                <VStack gap={1}>
                    <Heading level={3} maxLines={2}>
                        {service.name}
                    </Heading>
                    <Text type="supporting" color="secondary" maxLines={2}>
                        {service.app_id} · {service.instances} 个实例
                    </Text>
                    {service.approved && (
                        <Text type="supporting">
                            已批准 · {service.approved.image} ·{" "}
                            {service.approved.image_id}
                        </Text>
                    )}
                    {service.pending && (
                        <Text type="supporting">
                            {service.approved ? "更新待审" : "首次上架待审"} ·{" "}
                            {service.pending.name} · {service.pending.image} ·{" "}
                            {service.pending.image_id}
                        </Text>
                    )}
                    {service.last && (
                        <Text type="supporting" color="secondary">
                            最近审批 · {service.last.reviewer}已
                            {service.last.accepted ? "批准" : "拒绝"}{" "}
                            {service.last.image}
                        </Text>
                    )}
                </VStack>
            </StackItem>
            <HStack gap={2} vAlign="center" wrap="wrap">
                {service.pending && (
                    <>
                        <Button
                            label="批准"
                            isDisabled={busy}
                            onClick={() => onReview(true)}
                        />
                        <Button
                            label="拒绝"
                            isDisabled={busy}
                            onClick={() => onReview(false)}
                        />
                    </>
                )}
                <Badge
                    variant={
                        failed
                            ? "error"
                            : changing
                              ? "warning"
                              : service.enabled
                                ? "success"
                                : "neutral"
                    }
                    label={
                        transitions[service.transition] ??
                        (service.enabled
                            ? "运行中"
                            : service.desired
                              ? "等待启动"
                              : "未运行")
                    }
                />
                {service.can_set_enabled && (
                    <Button
                        label={failed ? "重试变更" : enable ? "启用" : "停用"}
                        variant="secondary"
                        isDisabled={busy || changing}
                        onClick={() => onChange(enable)}
                    />
                )}
                {service.approved && (
                    <Button
                        label="下架"
                        variant="ghost"
                        isDisabled={busy || changing}
                        onClick={onRemove}
                    />
                )}
            </HStack>
        </HStack>
    );
}
