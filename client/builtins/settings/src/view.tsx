import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AlertDialog,
    Badge,
    Banner,
    Button,
    Card,
    Heading,
    HStack,
    Grid,
    AspectRatio,
    SegmentedControl,
    SegmentedControlItem,
    Switch,
    Text,
    VStack,
} from "@astryxdesign/core";
import { app } from "@skynet/app-sdk";
import {
    AppBoundary,
    useAppSnapshot,
    usePaneToolbar,
} from "@skynet/app-sdk/react";
import type { AppSummary } from "@skynet/contracts";
import type { State } from "./runtime";
import "../../../packages/tokens/theme.css";

const sections = [
    ["appearance", "外观"],
    ["wallpaper", "壁纸"],
    ["motion", "动态效果"],
    ["apps", "应用管理"],
] as const;
const modes = [
    ["light", "浅色"],
    ["dark", "深色"],
    ["system", "跟随系统"],
] as const;
const wallpapers = [
    ["coast", "海岸"],
    ["dusk", "暮色"],
    ["forest", "森林"],
] as const;
const statuses = {
    failed: "运行异常",
    running: "运行中",
    starting: "正在启动",
    stopped: "未运行",
};

function Settings() {
    const snapshot = useAppSnapshot<State>();
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [removing, setRemoving] = useState<AppSummary>();
    const section = snapshot?.state?.section ?? "appearance";
    const preferences = snapshot?.preferences;
    const run = async (operation: () => Promise<unknown>) => {
        setError("");
        setBusy(true);
        try {
            await operation();
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };
    usePaneToolbar(
        snapshot?.state
            ? sections.map(([id, label]) => ({
                  id,
                  label,
                  selected: section === id,
              }))
            : [],
        (id) => void run(() => app.command("navigate", { section: id })),
    );
    return (
        <VStack as="main" gap={0} minHeight="100dvh">
            <VStack
                as="section"
                data-settings-content
                width="100%"
                maxWidth="56rem"
                padding={4}
                gap={4}
            >
                <Heading level={1}>
                    {sections.find(([id]) => id === section)?.[1]}
                </Heading>
                {error && (
                    <Banner
                        status="error"
                        title="操作未完成"
                        description={error}
                    />
                )}
                {snapshot?.error && (
                    <Banner
                        status="error"
                        title="应用运行时已停止"
                        description={snapshot.error}
                    />
                )}
                {!preferences ? (
                    <Text role="status">正在载入设置…</Text>
                ) : (
                    <Card padding={4}>
                        {section === "appearance" && (
                            <VStack gap={3}>
                                <Heading level={2}>外观模式</Heading>
                                <SegmentedControl
                                    label="外观模式"
                                    value={preferences.appearance}
                                    isDisabled={busy}
                                    onChange={(appearance) =>
                                        void run(() =>
                                            app.setPreferences({ appearance }),
                                        )
                                    }
                                >
                                    {modes.map(([value, label]) => (
                                        <SegmentedControlItem
                                            key={value}
                                            value={value}
                                            label={label}
                                        />
                                    ))}
                                </SegmentedControl>
                            </VStack>
                        )}
                        {section === "wallpaper" && (
                            <VStack gap={3}>
                                <Heading level={2}>选择壁纸</Heading>
                                <Grid
                                    data-wallpaper-choices
                                    columns={{ minWidth: 144, max: 3 }}
                                    gap={3}
                                >
                                    {wallpapers.map(([value, label]) => (
                                        <VStack gap={2} key={value}>
                                            <AspectRatio
                                                ratio={2}
                                                children={null}
                                                data-wallpaper-preview
                                                aria-hidden="true"
                                                style={{
                                                    background: `var(--wallpaper-${value})`,
                                                }}
                                            />
                                            <Button
                                                label={label}
                                                aria-pressed={
                                                    preferences.wallpaper ===
                                                    value
                                                }
                                                variant={
                                                    preferences.wallpaper ===
                                                    value
                                                        ? "primary"
                                                        : "secondary"
                                                }
                                                isDisabled={busy}
                                                onClick={() =>
                                                    void run(() =>
                                                        app.setPreferences({
                                                            wallpaper: value,
                                                        }),
                                                    )
                                                }
                                            />
                                        </VStack>
                                    ))}
                                </Grid>
                            </VStack>
                        )}
                        {section === "motion" && (
                            <Switch
                                label="减少动态效果"
                                description="关闭缩放和位移动画。系统辅助功能设置始终优先。"
                                labelPosition="start"
                                labelSpacing="spread"
                                value={preferences.reduceMotion}
                                isDisabled={busy}
                                onChange={(reduceMotion) =>
                                    void run(() =>
                                        app.setPreferences({ reduceMotion }),
                                    )
                                }
                            />
                        )}
                        {section === "apps" && (
                            <VStack gap={4}>
                                <HStack
                                    wrap="wrap"
                                    gap={3}
                                    justify="between"
                                    align="center"
                                >
                                    <Heading level={2}>已安装应用</Heading>
                                    {snapshot.capabilities
                                        ?.installApplications !== false && (
                                        <Button
                                            label="安装应用"
                                            isDisabled={busy}
                                            onClick={() =>
                                                void run(app.install)
                                            }
                                        />
                                    )}
                                </HStack>
                                {snapshot.apps.map((entry) => (
                                    <VStack key={entry.id} gap={2}>
                                        <HStack
                                            wrap="wrap"
                                            gap={2}
                                            align="center"
                                        >
                                            <Text weight="bold">
                                                {entry.name}
                                            </Text>
                                            <Badge
                                                label={
                                                    entry.builtin
                                                        ? "内置"
                                                        : entry.version
                                                }
                                            />
                                            <Text color="secondary">
                                                {statuses[entry.status]}
                                            </Text>
                                        </HStack>
                                        {entry.error && (
                                            <Banner
                                                status="error"
                                                title="应用运行异常"
                                                description={entry.error}
                                            />
                                        )}
                                        {!entry.builtin && (
                                            <Text>
                                                权限：
                                                {entry.permissions.join("、") ||
                                                    "无"}
                                            </Text>
                                        )}
                                        <HStack gap={2}>
                                            <Button
                                                label="重启"
                                                aria-label={`重启${entry.name}`}
                                                variant="secondary"
                                                isDisabled={busy}
                                                onClick={() =>
                                                    void run(() =>
                                                        app.restart(entry.id),
                                                    )
                                                }
                                            />
                                            {!entry.builtin && (
                                                <Button
                                                    label="移除"
                                                    aria-label={`移除${entry.name}`}
                                                    variant="ghost"
                                                    isDisabled={busy}
                                                    onClick={() =>
                                                        setRemoving(entry)
                                                    }
                                                />
                                            )}
                                        </HStack>
                                    </VStack>
                                ))}
                            </VStack>
                        )}
                    </Card>
                )}
                {removing && (
                    <AlertDialog
                        isOpen
                        title={`移除${removing.name}？`}
                        description="将关闭应用并移除应用包。应用数据会保留，重新安装后可继续使用。"
                        cancelLabel="取消"
                        actionLabel="移除应用"
                        actionVariant="destructive"
                        isActionLoading={busy}
                        onOpenChange={(open) => {
                            if (!open) setRemoving(undefined);
                        }}
                        onAction={() =>
                            void run(async () => {
                                await app.remove(removing.id);
                                setRemoving(undefined);
                            })
                        }
                    />
                )}
            </VStack>
        </VStack>
    );
}

createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <Settings />
    </AppBoundary>,
);
