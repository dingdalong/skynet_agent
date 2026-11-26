import { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AlertDialog,
    AppShell,
    Banner,
    Button,
    Card,
    Heading,
    HStack,
    Icon,
    LayerProvider,
    Layout,
    LayoutContent,
    LayoutHeader,
    Skeleton,
    Text,
    VStack,
    useToast,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { app } from "@skynet/app-sdk";
import {
    AppBoundary,
    useAppSnapshot,
    usePaneToolbar,
} from "@skynet/app-sdk/react";
import type { AppSummary, PaneToolbarItem } from "@skynet/contracts";
import { About } from "./About";
import { AppearanceSection } from "./AppearanceSection";
import { AppsSection } from "./AppsSection";
import { MotionSection } from "./MotionSection";
import { SettingsSideNav, SettingsTabBar } from "./SettingsNav";
import { WallpaperSection } from "./WallpaperSection";
import { sectionMeta, summarizeInstalledApps } from "./presentation";
import type { Section, State } from "./runtime";
import "../../../packages/tokens/theme.css";

function LoadingSkeleton() {
    return (
        <VStack gap={4} role="status" aria-label="正在载入设置…" width="100%">
            {[0, 1].map((index) => (
                <Card key={index} padding={4} width="100%">
                    <VStack gap={3}>
                        <Skeleton
                            width="32%"
                            height={22}
                            radius={1}
                            index={index}
                        />
                        <Skeleton
                            width="78%"
                            height={16}
                            radius={1}
                            index={index}
                        />
                        <Skeleton
                            width="56%"
                            height={32}
                            radius={1}
                            index={index}
                        />
                    </VStack>
                </Card>
            ))}
        </VStack>
    );
}

function Settings() {
    const snapshot = useAppSnapshot<State>();
    const showToast = useToast();
    const wide = useMediaQuery("(min-width: 720px)");
    const compact = useMediaQuery("(max-width: 480px)");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [busyAction, setBusyAction] = useState("");
    const [restartingAppId, setRestartingAppId] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [removing, setRemoving] = useState<AppSummary>();
    const [aboutRefreshToken, setAboutRefreshToken] = useState(0);
    const [aboutLoading, setAboutLoading] = useState(false);

    const section = snapshot?.state?.section ?? "appearance";
    const preferences = snapshot?.preferences;
    const currentSection = sectionMeta(section);
    const canInstall = snapshot?.capabilities?.installApplications !== false;
    const appMetrics = useMemo(
        () => summarizeInstalledApps(snapshot?.apps ?? []),
        [snapshot?.apps],
    );

    const run = useCallback(
        async (
            operation: () => Promise<unknown>,
            options?: {
                actionKey?: string;
                toastMessage?: string;
                restartingId?: string;
            },
        ) => {
            setError("");
            setBusy(true);
            if (options?.actionKey) setBusyAction(options.actionKey);
            if (options?.restartingId) setRestartingAppId(options.restartingId);
            try {
                await operation();
                if (options?.toastMessage) {
                    showToast({
                        uniqueID: `settings-${options.actionKey ?? "done"}`,
                        body: options.toastMessage,
                        type: "info",
                        autoHideDuration: 2200,
                    });
                }
            } catch (failure) {
                setError(
                    failure instanceof Error
                        ? failure.message
                        : String(failure),
                );
            } finally {
                setBusy(false);
                setBusyAction("");
                setRestartingAppId("");
            }
        },
        [showToast],
    );

    const navigate = useCallback(
        (next: Section) => {
            if (next === section) return;
            void run(() => app.command("navigate", { section: next }));
        },
        [run, section],
    );

    const handleInstall = useCallback(() => {
        void run(app.install, {
            actionKey: "install",
            toastMessage: "应用安装已完成",
        });
    }, [run]);

    const handleRestart = useCallback(
        (entry: AppSummary) => {
            void run(() => app.restart(entry.id), {
                actionKey: `restart-${entry.id}`,
                restartingId: entry.id,
                toastMessage: `已重启「${entry.name}」`,
            });
        },
        [run],
    );

    const handleRefreshVersions = useCallback(() => {
        setAboutRefreshToken((value) => value + 1);
    }, []);

    const toolbarItems: PaneToolbarItem[] = useMemo(() => {
        if (!snapshot?.state) return [];
        const items: PaneToolbarItem[] = [];
        if (wide) {
            items.push({
                id: "sidebar",
                label: "设置导航",
                selected: !sidebarCollapsed,
            });
        }
        if (section === "apps" && canInstall) {
            items.push({ id: "install", label: "安装应用" });
        }
        if (section === "about") {
            items.push({ id: "refresh", label: "刷新版本" });
        }
        return items;
    }, [snapshot?.state, wide, sidebarCollapsed, section, canInstall]);

    usePaneToolbar(toolbarItems, (id) => {
        if (id === "sidebar") {
            setSidebarCollapsed((collapsed) => !collapsed);
        } else if (id === "install") {
            handleInstall();
        } else if (id === "refresh") {
            handleRefreshVersions();
        }
    });

    const renderHeaderAction = () => {
        if (section === "apps" && canInstall) {
            return (
                <Button
                    label="安装应用"
                    variant="primary"
                    size="sm"
                    icon={<Icon icon={PlusIcon} size="sm" />}
                    isLoading={busyAction === "install"}
                    isDisabled={busy}
                    onClick={handleInstall}
                />
            );
        }
        if (section === "about") {
            return (
                <Button
                    label="刷新版本"
                    variant="secondary"
                    size="sm"
                    icon={<Icon icon={ArrowPathIcon} size="sm" />}
                    isLoading={aboutLoading}
                    onClick={handleRefreshVersions}
                />
            );
        }
        return null;
    };

    return (
        <AppShell
            variant="section"
            height="fill"
            mobileNav={{ breakpoint: "none" }}
            sideNav={
                wide ? (
                    <SettingsSideNav
                        section={section}
                        isCollapsed={sidebarCollapsed}
                        onCollapsedChange={setSidebarCollapsed}
                        onSelectSection={navigate}
                        failedAppCount={appMetrics.failed}
                        installedAppCount={appMetrics.total}
                        snapshot={snapshot}
                    />
                ) : undefined
            }
        >
            <Layout
                height="fill"
                contentWidth="48rem"
                header={
                    <LayoutHeader
                        hasDivider
                        padding={wide ? 6 : 4}
                        paddingBlockEnd={wide ? 4 : 0}
                    >
                        <VStack gap={wide ? 0 : 3} width="100%">
                            <HStack
                                hAlign="between"
                                vAlign="center"
                                gap={3}
                                wrap="wrap"
                                width="100%"
                            >
                                <VStack gap={0.5} style={{ minWidth: 0 }}>
                                    <Heading level={1}>
                                        {currentSection.label}
                                    </Heading>
                                    <Text
                                        type="supporting"
                                        size="sm"
                                        color="secondary"
                                    >
                                        {currentSection.description}
                                    </Text>
                                </VStack>
                                {renderHeaderAction()}
                            </HStack>
                            {!wide && (
                                <SettingsTabBar
                                    section={section}
                                    failedAppCount={appMetrics.failed}
                                    onSelectSection={navigate}
                                />
                            )}
                        </VStack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent isScrollable padding={wide ? 6 : 4}>
                        <VStack
                            as="section"
                            data-settings-content
                            gap={4}
                            width="100%"
                        >
                            {error && (
                                <Banner
                                    status="error"
                                    title="操作未完成"
                                    description={error}
                                    onDismiss={() => setError("")}
                                />
                            )}
                            {snapshot?.error && (
                                <Banner
                                    status="error"
                                    title="应用运行时已停止"
                                    description={snapshot.error}
                                />
                            )}

                            {!preferences || !snapshot ? (
                                <LoadingSkeleton />
                            ) : (
                                <>
                                    {section === "appearance" && (
                                        <AppearanceSection
                                            preferences={preferences}
                                            busy={busy}
                                            compact={compact}
                                            onChangeAppearance={(appearance) =>
                                                void run(() =>
                                                    app.setPreferences({
                                                        appearance,
                                                    }),
                                                )
                                            }
                                            onOpenWallpaper={() =>
                                                navigate("wallpaper")
                                            }
                                        />
                                    )}
                                    {section === "wallpaper" && (
                                        <WallpaperSection
                                            preferences={preferences}
                                            busy={busy}
                                            compact={compact}
                                            onChangeWallpaper={(wallpaper) =>
                                                void run(() =>
                                                    app.setPreferences({
                                                        wallpaper,
                                                    }),
                                                )
                                            }
                                        />
                                    )}
                                    {section === "motion" && (
                                        <MotionSection
                                            preferences={preferences}
                                            busy={busy}
                                            onChangeReduceMotion={(
                                                reduceMotion,
                                            ) =>
                                                void run(() =>
                                                    app.setPreferences({
                                                        reduceMotion,
                                                    }),
                                                )
                                            }
                                        />
                                    )}
                                    {section === "apps" && (
                                        <AppsSection
                                            apps={snapshot.apps}
                                            capabilities={snapshot.capabilities}
                                            busy={busy}
                                            restartingAppId={restartingAppId}
                                            onRestart={handleRestart}
                                            onRequestRemove={setRemoving}
                                        />
                                    )}
                                    {section === "about" && (
                                        <About
                                            snapshot={snapshot}
                                            refreshToken={aboutRefreshToken}
                                            onLoadingChange={setAboutLoading}
                                        />
                                    )}
                                </>
                            )}
                        </VStack>
                    </LayoutContent>
                }
            />

            {removing && (
                <AlertDialog
                    isOpen
                    title={`移除「${removing.name}」？`}
                    description="将关闭应用并移除应用包。应用数据会保留，重新安装后可继续使用。"
                    cancelLabel="取消"
                    actionLabel="移除应用"
                    actionVariant="destructive"
                    isActionLoading={busyAction === "remove"}
                    onOpenChange={(open) => {
                        if (!open && busyAction !== "remove") {
                            setRemoving(undefined);
                        }
                    }}
                    onAction={() => {
                        const target = removing;
                        void run(
                            async () => {
                                await app.remove(target.id);
                                setRemoving(undefined);
                            },
                            {
                                actionKey: "remove",
                                toastMessage: `已移除「${target.name}」`,
                            },
                        );
                    }}
                />
            )}
        </AppShell>
    );
}

createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <LayerProvider toast={{ position: "bottomEnd", maxVisible: 3 }}>
            <Settings />
        </LayerProvider>
    </AppBoundary>,
);
