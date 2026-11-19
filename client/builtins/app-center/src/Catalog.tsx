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
    service: string;
    instances: number;
    enabled: boolean;
    transition: string;
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
    enabling: "正在注册",
    disabling: "正在下线",
    enable_failed: "注册未完成",
    disable_failed: "下线未完成",
};

export function ServiceRow({
    service,
    busy,
    onChange,
}: {
    service: Service;
    busy: boolean;
    onChange: (enabled: boolean) => void;
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
                        {service.service} · {service.instances} 个实例
                    </Text>
                </VStack>
            </StackItem>
            <HStack gap={2} vAlign="center">
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
                        (service.enabled ? "已注册" : "已下线")
                    }
                />
                {service.app_id !== "app-center" && (
                    <Button
                        label={
                            failed ? "重试变更" : enable ? "注册" : "撤销注册"
                        }
                        variant="secondary"
                        isDisabled={busy || changing}
                        onClick={() => onChange(enable)}
                    />
                )}
            </HStack>
        </HStack>
    );
}
