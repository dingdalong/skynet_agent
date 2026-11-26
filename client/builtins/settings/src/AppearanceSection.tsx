import {
    Badge,
    Button,
    Card,
    Divider,
    Heading,
    HStack,
    Icon,
    MetadataList,
    MetadataListItem,
    SegmentedControl,
    SegmentedControlItem,
    StatusDot,
    Text,
    VStack,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
    ComputerDesktopIcon,
    MoonIcon,
    PhotoIcon,
    SunIcon,
} from "@heroicons/react/24/outline";
import type { Appearance, Preferences } from "@skynet/contracts";
import {
    APPEARANCE_OPTIONS,
    appearanceMeta,
    wallpaperMeta,
} from "./presentation";

const MODE_ICONS: Record<Appearance, typeof SunIcon> = {
    light: SunIcon,
    dark: MoonIcon,
    system: ComputerDesktopIcon,
};

export function AppearanceSection({
    preferences,
    busy,
    compact,
    onChangeAppearance,
    onOpenWallpaper,
}: {
    preferences: Preferences;
    busy: boolean;
    compact: boolean;
    onChangeAppearance: (appearance: Appearance) => void;
    onOpenWallpaper: () => void;
}) {
    const systemPrefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const activeAppearance = appearanceMeta(preferences.appearance);
    const activeWallpaper = wallpaperMeta(preferences.wallpaper);
    const effectiveDark =
        preferences.appearance === "dark" ||
        (preferences.appearance === "system" && systemPrefersDark);
    const effectiveLabel = effectiveDark ? "深色" : "浅色";

    return (
        <VStack gap={4} width="100%">
            <Card padding={0} elevation="low" width="100%">
                <VStack
                    padding={compact ? 3 : 5}
                    gap={3}
                    width="100%"
                    aria-hidden="true"
                    style={{
                        background: `var(--wallpaper-${preferences.wallpaper})`,
                    }}
                >
                    <Card padding={3} elevation="med" width="100%">
                        <VStack gap={2}>
                            <HStack hAlign="between" vAlign="center" gap={2}>
                                <HStack gap={1.5} vAlign="center">
                                    <StatusDot
                                        variant="accent"
                                        label="预览状态"
                                    />
                                    <Text type="label" weight="semibold">
                                        工作区实时预览
                                    </Text>
                                </HStack>
                                <Badge label={`${effectiveLabel}主题`} />
                            </HStack>
                            <Text type="supporting" size="sm" color="secondary">
                                当前组合：{activeAppearance.label}外观 ·{" "}
                                {activeWallpaper.label}壁纸
                            </Text>
                        </VStack>
                    </Card>
                </VStack>
                <HStack
                    padding={3}
                    hAlign="between"
                    vAlign="center"
                    gap={2}
                    wrap="wrap"
                >
                    <HStack gap={2} vAlign="center">
                        <Icon icon={PhotoIcon} size="sm" color="secondary" />
                        <Text type="supporting" size="sm" color="secondary">
                            当前壁纸：{activeWallpaper.label}（
                            {activeWallpaper.description}）
                        </Text>
                    </HStack>
                    <Button
                        label="更换壁纸"
                        variant="ghost"
                        size="sm"
                        onClick={onOpenWallpaper}
                    />
                </HStack>
            </Card>

            <Card padding={4} width="100%">
                <VStack gap={4}>
                    <VStack gap={1}>
                        <Heading level={2}>外观模式</Heading>
                        <Text type="supporting" size="sm" color="secondary">
                            {activeAppearance.summary}
                        </Text>
                    </VStack>

                    <SegmentedControl
                        label="外观模式"
                        size={compact ? "sm" : "md"}
                        value={preferences.appearance}
                        isDisabled={busy}
                        onChange={(value) =>
                            onChangeAppearance(value as Appearance)
                        }
                    >
                        {APPEARANCE_OPTIONS.map((option) => (
                            <SegmentedControlItem
                                key={option.value}
                                value={option.value}
                                label={option.label}
                                icon={
                                    <Icon
                                        icon={MODE_ICONS[option.value]}
                                        size="sm"
                                    />
                                }
                            />
                        ))}
                    </SegmentedControl>

                    <Divider />

                    <MetadataList>
                        <MetadataListItem label="当前生效">
                            <HStack gap={1.5} vAlign="center">
                                <StatusDot
                                    variant={
                                        effectiveDark ? "accent" : "success"
                                    }
                                    label={`当前生效${effectiveLabel}主题`}
                                />
                                <Text type="body" size="sm">
                                    {preferences.appearance === "system"
                                        ? `跟随系统（当前为${effectiveLabel}）`
                                        : `${effectiveLabel}模式`}
                                </Text>
                            </HStack>
                        </MetadataListItem>
                        <MetadataListItem label="同步范围">
                            宿主工作区、顶部工具栏及全部运行中的子应用
                        </MetadataListItem>
                    </MetadataList>
                </VStack>
            </Card>
        </VStack>
    );
}
