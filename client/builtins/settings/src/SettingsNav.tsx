import { useMemo, useState } from "react";
import {
    Badge,
    Button,
    ClickableCard,
    EmptyState,
    HStack,
    Icon,
    IconButton,
    SideNav,
    SideNavHeading,
    SideNavItem,
    SideNavSection,
    StatusDot,
    Tab,
    TabList,
    Text,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import {
    Cog6ToothIcon,
    ComputerDesktopIcon,
    DevicePhoneMobileIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    PhotoIcon,
    SparklesIcon,
    Squares2X2Icon,
    SwatchIcon,
} from "@heroicons/react/24/outline";
import {
    InformationCircleIcon as InformationCircleSolidIcon,
    PhotoIcon as PhotoSolidIcon,
    SparklesIcon as SparklesSolidIcon,
    Squares2X2Icon as Squares2X2SolidIcon,
    SwatchIcon as SwatchSolidIcon,
} from "@heroicons/react/24/solid";
import type { AppSnapshot } from "@skynet/contracts";
import type { Section } from "./runtime";
import {
    SETTINGS_GROUPS,
    SETTINGS_SECTIONS,
    formatVersion,
    isolationLabel,
    platformLabel,
    searchSettings,
} from "./presentation";

const SECTION_ICONS: Record<
    Section,
    { outline: typeof SwatchIcon; solid: typeof SwatchSolidIcon }
> = {
    appearance: { outline: SwatchIcon, solid: SwatchSolidIcon },
    wallpaper: { outline: PhotoIcon, solid: PhotoSolidIcon },
    motion: { outline: SparklesIcon, solid: SparklesSolidIcon },
    apps: { outline: Squares2X2Icon, solid: Squares2X2SolidIcon },
    about: {
        outline: InformationCircleIcon,
        solid: InformationCircleSolidIcon,
    },
};

export function SettingsSideNav({
    section,
    isCollapsed,
    onCollapsedChange,
    onSelectSection,
    failedAppCount,
    installedAppCount,
    snapshot,
}: {
    section: Section;
    isCollapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    onSelectSection: (section: Section) => void;
    failedAppCount: number;
    installedAppCount: number;
    snapshot?: Pick<AppSnapshot, "about" | "capabilities">;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const trimmedQuery = searchQuery.trim();
    const matches = useMemo(
        () => (trimmedQuery ? searchSettings(trimmedQuery) : []),
        [trimmedQuery],
    );
    const platform = platformLabel(snapshot?.capabilities?.platform);
    const isolation = isolationLabel(snapshot?.capabilities?.runtimeIsolation);
    const clientVersion = formatVersion(snapshot?.about?.clientVersion);
    const PlatformIcon =
        snapshot?.capabilities?.platform === "ios"
            ? DevicePhoneMobileIcon
            : ComputerDesktopIcon;

    return (
        <SideNav
            aria-label="设置导航"
            header={
                <SideNavHeading
                    heading="设置"
                    subheading="偏好与系统"
                    icon={<Icon icon={Cog6ToothIcon} size="md" />}
                />
            }
            topContent={
                !isCollapsed ? (
                    <TextInput
                        type="search"
                        label="搜索设置"
                        isLabelHidden
                        size="sm"
                        placeholder="搜索设置项…"
                        startIcon="search"
                        hasClear
                        width="100%"
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                ) : undefined
            }
            footer={
                !isCollapsed ? (
                    <ClickableCard
                        label={`${platform} · ${clientVersion}，查看关于`}
                        variant="muted"
                        padding={2}
                        width="100%"
                        onClick={() => onSelectSection("about")}
                    >
                        <HStack gap={2} vAlign="center" width="100%">
                            <Icon
                                icon={PlatformIcon}
                                size="sm"
                                color="secondary"
                            />
                            <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                    type="label"
                                    weight="semibold"
                                    maxLines={1}
                                >
                                    {platform} · {clientVersion}
                                </Text>
                                <Text
                                    type="supporting"
                                    size="xsm"
                                    color="secondary"
                                    maxLines={1}
                                >
                                    {isolation}
                                </Text>
                            </VStack>
                        </HStack>
                    </ClickableCard>
                ) : undefined
            }
            footerIcons={
                isCollapsed ? (
                    <IconButton
                        label={`关于本机（${platform} · ${clientVersion}）`}
                        tooltip={`${platform} · ${clientVersion}`}
                        variant="ghost"
                        size="sm"
                        icon={<Icon icon={PlatformIcon} size="sm" />}
                        onClick={() => onSelectSection("about")}
                    />
                ) : undefined
            }
            collapsible={{
                hasButton: true,
                buttonLabel: isCollapsed ? "展开设置导航" : "收起设置导航",
            }}
            resizable={{
                defaultWidth: 240,
                minWidth: 210,
                maxWidth: 320,
                autoSaveId: "skynet.settings.sidebar",
                isCollapsed,
                onCollapseChange: onCollapsedChange,
            }}
        >
            {trimmedQuery && !isCollapsed ? (
                matches.length > 0 ? (
                    <SideNavSection title={`搜索结果 (${matches.length})`}>
                        {matches.map((entry) => {
                            const icons = SECTION_ICONS[entry.section];
                            return (
                                <SideNavItem
                                    key={entry.id}
                                    label={entry.label}
                                    icon={icons.outline}
                                    selectedIcon={icons.solid}
                                    isSelected={section === entry.section}
                                    endContent={
                                        <Text
                                            type="supporting"
                                            size="xsm"
                                            color="secondary"
                                        >
                                            {entry.sectionLabel}
                                        </Text>
                                    }
                                    onClick={() => {
                                        onSelectSection(entry.section);
                                        setSearchQuery("");
                                    }}
                                />
                            );
                        })}
                    </SideNavSection>
                ) : (
                    <EmptyState
                        icon={
                            <Icon
                                icon={MagnifyingGlassIcon}
                                size="md"
                                color="secondary"
                            />
                        }
                        title="没有匹配的设置项"
                        description="试试搜索外观、壁纸、动态效果、应用或版本"
                        actions={
                            <Button
                                label="清除搜索"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSearchQuery("")}
                            />
                        }
                    />
                )
            ) : (
                SETTINGS_GROUPS.map((group) => (
                    <SideNavSection key={group.id} title={group.title}>
                        {SETTINGS_SECTIONS.filter(
                            (item) => item.group === group.id,
                        ).map((item) => {
                            const icons = SECTION_ICONS[item.id];
                            const endContent =
                                item.id === "apps" ? (
                                    failedAppCount > 0 ? (
                                        <StatusDot
                                            variant="error"
                                            label={`${failedAppCount} 个应用运行异常`}
                                        />
                                    ) : installedAppCount > 0 ? (
                                        <Badge
                                            label={String(installedAppCount)}
                                        />
                                    ) : undefined
                                ) : undefined;
                            return (
                                <SideNavItem
                                    key={item.id}
                                    label={item.label}
                                    aria-label={item.label}
                                    icon={icons.outline}
                                    selectedIcon={icons.solid}
                                    isSelected={section === item.id}
                                    endContent={endContent}
                                    onClick={() => onSelectSection(item.id)}
                                />
                            );
                        })}
                    </SideNavSection>
                ))
            )}
        </SideNav>
    );
}

export function SettingsTabBar({
    section,
    failedAppCount,
    onSelectSection,
}: {
    section: Section;
    failedAppCount: number;
    onSelectSection: (section: Section) => void;
}) {
    return (
        <TabList
            aria-label="设置分类"
            size="sm"
            value={section}
            onChange={(value) => onSelectSection(value as Section)}
        >
            {SETTINGS_SECTIONS.map((item) => {
                const icons = SECTION_ICONS[item.id];
                return (
                    <Tab
                        key={item.id}
                        value={item.id}
                        label={item.label}
                        aria-label={item.label}
                        icon={<Icon icon={icons.outline} size="sm" />}
                        selectedIcon={<Icon icon={icons.solid} size="sm" />}
                        endContent={
                            item.id === "apps" && failedAppCount > 0 ? (
                                <StatusDot
                                    variant="error"
                                    label={`${failedAppCount} 个应用运行异常`}
                                />
                            ) : undefined
                        }
                    />
                );
            })}
        </TabList>
    );
}
