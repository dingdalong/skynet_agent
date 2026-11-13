import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
    AlertCircle,
    AppWindow,
    ArrowUpRight,
    Download,
    Monitor,
    Moon,
    Palette,
    Image,
    Sparkles,
    Sun,
    RotateCcw,
    Trash2,
    Settings2,
    Check,
} from "lucide-react";
import { app } from "@skynet/app-sdk";
import { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";
import { Button } from "@skynet/ui/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@skynet/ui/components/ui/card";
import {
    Field,
    FieldGroup,
    FieldContent,
    FieldLabel,
    FieldDescription,
} from "@skynet/ui/components/ui/field";
import { Switch } from "@skynet/ui/components/ui/switch";
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@skynet/ui/components/ui/toggle-group";
import {
    Alert,
    AlertTitle,
    AlertDescription,
} from "@skynet/ui/components/ui/alert";
import { Badge } from "@skynet/ui/components/ui/badge";
import { Skeleton } from "@skynet/ui/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@skynet/ui/components/ui/alert-dialog";
import { cn } from "@skynet/ui/lib/utils";
import type { AppSummary, Preferences } from "@skynet/contracts";
import type { State, Section } from "./runtime";
import "@skynet/ui/styles.css";
import "./view.css";

const navigation = [
    {
        id: "appearance",
        label: "外观",
        icon: Palette,
        description: "让工作空间更合你的心意。",
    },
    {
        id: "wallpaper",
        label: "壁纸",
        icon: Image,
        description: "为桌面选择一种氛围。",
    },
    {
        id: "motion",
        label: "动态效果",
        icon: Sparkles,
        description: "舒适、自然，保持专注。",
    },
    {
        id: "apps",
        label: "应用管理",
        icon: AppWindow,
        description: "管理工作空间中的独立应用。",
    },
] as const;

function Settings() {
    const snapshot = useAppSnapshot<State>();
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const section = snapshot?.state?.section ?? "appearance";
    const current = navigation.find((item) => item.id === section)!;
    async function run(operation: () => Promise<unknown>) {
        setError(undefined);
        setBusy(true);
        try {
            await operation();
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    }
    const preferences = snapshot?.preferences;
    return (
        <div className="settings-container">
            <div className="settings-layout">
                <aside className="settings-sidebar bg-card">
                    <div className="settings-brand">
                        <Settings2 size={22} />
                        <span>设置</span>
                    </div>
                    <nav aria-label="设置分类" className="settings-navigation">
                        {navigation.map(({ id, label, icon: Icon }) => (
                            <Button
                                key={id}
                                variant={section === id ? "secondary" : "ghost"}
                                aria-current={
                                    section === id ? "page" : undefined
                                }
                                onClick={() =>
                                    void run(() =>
                                        app.command("navigate", {
                                            section: id,
                                        }),
                                    )
                                }
                                className="justify-start"
                            >
                                <Icon data-icon="inline-start" />
                                <span>{label}</span>
                            </Button>
                        ))}
                    </nav>
                    <div className="settings-footnote text-muted-foreground">
                        Skynet Workspace <ArrowUpRight size={14} />
                    </div>
                </aside>
                <main className="settings-main">
                    <header className="settings-heading">
                        <p className="settings-eyebrow text-muted-foreground">
                            工作空间 / 设置
                        </p>
                        <h1>{current.label}</h1>
                        <p className="text-muted-foreground">
                            {current.description}
                        </p>
                    </header>
                    {error && (
                        <Alert variant="destructive" role="alert">
                            <AlertCircle />
                            <AlertTitle>操作未完成</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {snapshot?.error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>应用运行时已停止</AlertTitle>
                            <AlertDescription>
                                {snapshot.error}
                            </AlertDescription>
                        </Alert>
                    )}
                    {!preferences ? (
                        <div
                            className="flex flex-col gap-4"
                            aria-label="正在载入设置"
                        >
                            <Skeleton className="h-44 w-full" />
                            <Skeleton className="h-28 w-full" />
                        </div>
                    ) : (
                        <>
                            {section === "appearance" && (
                                <Appearance
                                    preferences={preferences}
                                    disabled={busy}
                                    run={run}
                                />
                            )}
                            {section === "wallpaper" && (
                                <Wallpaper
                                    preferences={preferences}
                                    disabled={busy}
                                    run={run}
                                />
                            )}
                            {section === "motion" && (
                                <Motion
                                    preferences={preferences}
                                    disabled={busy}
                                    run={run}
                                />
                            )}
                            {section === "apps" && (
                                <Apps
                                    apps={snapshot.apps}
                                    disabled={busy}
                                    run={run}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

type Run = (operation: () => Promise<unknown>) => Promise<void>;
type PreferenceProps = {
    preferences: Preferences;
    disabled: boolean;
    run: Run;
};

function SettingCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function Appearance({ preferences, disabled, run }: PreferenceProps) {
    return (
        <SettingCard
            title="颜色主题"
            description="应用与工作空间使用统一的颜色主题。"
        >
            <FieldGroup>
                <Field>
                    <FieldLabel>外观模式</FieldLabel>
                    <ToggleGroup
                        value={[preferences.appearance]}
                        disabled={disabled}
                        variant="outline"
                        className="theme-choices"
                        aria-label="外观模式"
                        onValueChange={(values) => {
                            if (values[0])
                                void run(() =>
                                    app.setPreferences({
                                        appearance: values[0],
                                    }),
                                );
                        }}
                    >
                        {[
                            { value: "light", name: "浅色", icon: Sun },
                            { value: "dark", name: "深色", icon: Moon },
                            {
                                value: "system",
                                name: "跟随系统",
                                icon: Monitor,
                            },
                        ].map(({ value, name, icon: Icon }) => (
                            <ToggleGroupItem
                                key={value}
                                value={value}
                                aria-label={name}
                            >
                                <div
                                    className={cn(
                                        "theme-preview",
                                        `theme-preview-${value}`,
                                    )}
                                >
                                    <div className="preview-sidebar" />
                                    <div className="preview-lines">
                                        <i />
                                        <i />
                                        <i />
                                    </div>
                                </div>
                                <span className="flex items-center gap-2">
                                    <Icon size={16} />
                                    {name}
                                </span>
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </Field>
            </FieldGroup>
        </SettingCard>
    );
}

function Wallpaper({ preferences, disabled, run }: PreferenceProps) {
    return (
        <SettingCard
            title="桌面壁纸"
            description="更换后立即应用，分屏中的桌面也会同步更新。"
        >
            <FieldGroup>
                <Field>
                    <FieldLabel>选择壁纸</FieldLabel>
                    <ToggleGroup
                        value={[preferences.wallpaper]}
                        disabled={disabled}
                        aria-label="选择壁纸"
                        variant="outline"
                        className="wallpaper-choices"
                        onValueChange={(values) => {
                            if (values[0])
                                void run(() =>
                                    app.setPreferences({
                                        wallpaper: values[0],
                                    }),
                                );
                        }}
                    >
                        {(
                            [
                                ["coast", "海岸"],
                                ["dusk", "暮色"],
                                ["forest", "森林"],
                            ] as const
                        ).map(([value, label]) => (
                            <ToggleGroupItem
                                key={value}
                                value={value}
                                aria-label={label}
                            >
                                <div
                                    className="wallpaper-preview"
                                    style={{
                                        background: `var(--wallpaper-${value})`,
                                    }}
                                >
                                    <span className="wallpaper-landscape" />
                                </div>
                                <span className="flex items-center gap-2">
                                    {label}
                                    {preferences.wallpaper === value && (
                                        <Check size={14} />
                                    )}
                                </span>
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </Field>
            </FieldGroup>
        </SettingCard>
    );
}

function Motion({ preferences, disabled, run }: PreferenceProps) {
    return (
        <SettingCard
            title="动画与过渡"
            description="应用切换、分屏与后台使用一致的动态节奏。"
        >
            <FieldGroup>
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldLabel htmlFor="reduce-motion">
                            减少动态效果
                        </FieldLabel>
                        <FieldDescription>
                            关闭缩放和位移动画，立即呈现最终状态。系统辅助功能设置始终优先。
                        </FieldDescription>
                    </FieldContent>
                    <Switch
                        id="reduce-motion"
                        checked={preferences.reduceMotion}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                            void run(() =>
                                app.setPreferences({ reduceMotion: checked }),
                            )
                        }
                    />
                </Field>
            </FieldGroup>
        </SettingCard>
    );
}

function Apps({
    apps,
    disabled,
    run,
}: {
    apps: AppSummary[];
    disabled: boolean;
    run: Run;
}) {
    const [removing, setRemoving] = useState<string>();
    return (
        <SettingCard
            title="已安装应用"
            description="每个应用独立运行。安装和更新无需重新构建宿主。"
        >
            <div className="flex flex-col gap-5">
                <div>
                    <Button
                        onClick={() => void run(() => app.install())}
                        disabled={disabled}
                    >
                        <Download data-icon="inline-start" />
                        安装应用
                    </Button>
                </div>
                {apps.map((entry) => (
                    <div key={entry.id} className="app-entry">
                        <div className="app-entry-icon bg-muted">
                            <AppWindow size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <strong>{entry.name}</strong>
                                <Badge variant="secondary">
                                    {entry.builtin ? "内置" : entry.version}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground">
                                {entry.status === "failed"
                                    ? "运行异常"
                                    : entry.status === "running"
                                      ? "运行中"
                                      : entry.status === "starting"
                                        ? "正在启动"
                                        : "未运行"}
                            </p>
                            {entry.error && (
                                <p className="text-destructive break-all">
                                    {entry.error}
                                </p>
                            )}
                            {!entry.builtin && (
                                <p className="text-muted-foreground">
                                    权限：{entry.permissions.join("、") || "无"}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`重启${entry.name}`}
                            disabled={disabled}
                            onClick={() =>
                                void run(() => app.restart(entry.id))
                            }
                        >
                            <RotateCcw />
                        </Button>
                        {!entry.builtin && (
                            <AlertDialog
                                open={removing === entry.id}
                                onOpenChange={(open) =>
                                    setRemoving(open ? entry.id : undefined)
                                }
                            >
                                <AlertDialogTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`移除${entry.name}`}
                                        />
                                    }
                                >
                                    <Trash2 />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            移除{entry.name}？
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            将关闭该应用并移除应用包。应用数据会保留，重新安装后可以继续使用。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            取消
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            variant="destructive"
                                            disabled={disabled}
                                            onClick={() =>
                                                void run(async () => {
                                                    await app.remove(entry.id);
                                                    setRemoving(undefined);
                                                })
                                            }
                                        >
                                            移除应用
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                ))}
            </div>
        </SettingCard>
    );
}

createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <Settings />
    </AppBoundary>,
);
