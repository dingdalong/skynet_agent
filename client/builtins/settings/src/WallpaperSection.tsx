import {
    AspectRatio,
    Badge,
    Button,
    Card,
    Grid,
    Heading,
    HStack,
    Icon,
    StatusDot,
    Text,
    VStack,
} from "@astryxdesign/core";
import { CheckIcon } from "@heroicons/react/24/outline";
import type { Preferences, Wallpaper } from "@skynet/contracts";
import { WALLPAPER_OPTIONS, wallpaperMeta } from "./presentation";

export function WallpaperSection({
    preferences,
    busy,
    compact,
    onChangeWallpaper,
}: {
    preferences: Preferences;
    busy: boolean;
    compact: boolean;
    onChangeWallpaper: (wallpaper: Wallpaper) => void;
}) {
    const active = wallpaperMeta(preferences.wallpaper);

    return (
        <VStack gap={4} width="100%">
            <Card padding={0} elevation="low" width="100%">
                <VStack
                    padding={compact ? 4 : 6}
                    gap={4}
                    vAlign="end"
                    hAlign="center"
                    width="100%"
                    aria-hidden="true"
                    style={{
                        minHeight: compact ? 120 : 156,
                        background: `var(--wallpaper-${preferences.wallpaper})`,
                    }}
                >
                    <Card padding={1.5} elevation="med">
                        <HStack gap={2} vAlign="center">
                            <StatusDot variant="accent" label="Agent" />
                            <StatusDot variant="success" label="应用中心" />
                            <StatusDot variant="neutral" label="设置" />
                        </HStack>
                    </Card>
                </VStack>
                <HStack
                    padding={3}
                    hAlign="between"
                    vAlign="center"
                    gap={2}
                    wrap="wrap"
                >
                    <VStack gap={0.5}>
                        <Text type="label" weight="semibold">
                            {active.label}
                        </Text>
                        <Text type="supporting" size="sm" color="secondary">
                            {active.description}
                        </Text>
                    </VStack>
                    <Badge variant="info" label="当前壁纸" />
                </HStack>
            </Card>

            <Card padding={4} width="100%">
                <VStack gap={3}>
                    <VStack gap={0.5}>
                        <Heading level={2}>选择壁纸</Heading>
                        <Text type="supporting" size="sm" color="secondary">
                            壁纸色调会随当前浅色或深色外观自动切换明暗层次。
                        </Text>
                    </VStack>

                    <Grid
                        data-wallpaper-choices
                        columns={{ minWidth: 160, max: 3 }}
                        gap={3}
                        width="100%"
                    >
                        {WALLPAPER_OPTIONS.map((option) => {
                            const selected =
                                preferences.wallpaper === option.value;
                            return (
                                <Card
                                    key={option.value}
                                    padding={0}
                                    elevation={selected ? "low" : "none"}
                                >
                                    <AspectRatio
                                        ratio={2}
                                        children={null}
                                        data-wallpaper-preview
                                        aria-hidden="true"
                                        style={{
                                            background: `var(--wallpaper-${option.value})`,
                                        }}
                                    />
                                    <VStack padding={3} gap={2}>
                                        <VStack gap={0.5}>
                                            <HStack
                                                hAlign="between"
                                                vAlign="center"
                                                gap={1}
                                            >
                                                <Text
                                                    type="label"
                                                    weight="semibold"
                                                >
                                                    {option.label}
                                                </Text>
                                                {selected && (
                                                    <StatusDot
                                                        variant="accent"
                                                        label="已选中"
                                                    />
                                                )}
                                            </HStack>
                                            <Text
                                                type="supporting"
                                                size="xsm"
                                                color="secondary"
                                                maxLines={2}
                                            >
                                                {option.description}
                                            </Text>
                                        </VStack>
                                        <Button
                                            label={option.label}
                                            aria-pressed={selected}
                                            size="sm"
                                            width="100%"
                                            variant={
                                                selected
                                                    ? "primary"
                                                    : "secondary"
                                            }
                                            icon={
                                                selected ? (
                                                    <Icon
                                                        icon={CheckIcon}
                                                        size="sm"
                                                    />
                                                ) : undefined
                                            }
                                            isDisabled={busy}
                                            onClick={() =>
                                                onChangeWallpaper(option.value)
                                            }
                                        />
                                    </VStack>
                                </Card>
                            );
                        })}
                    </Grid>
                </VStack>
            </Card>
        </VStack>
    );
}
