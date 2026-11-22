import { Fragment, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AlertDialog,
    Banner,
    Button,
    Dialog,
    DialogHeader,
    Divider,
    EmptyState,
    Heading,
    HStack,
    Icon,
    IconButton,
    Spinner,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { request } from "@skynet/app-sdk";
import { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";
import { AppGallery, ServiceRow, type Service } from "./AppCenterViews";

interface Directory {
    names: string[];
    services: Service[];
    administrator: boolean;
}

function UnlockDialog({
    close,
    unlocked,
}: {
    close: () => void;
    unlocked: () => void;
}) {
    const [token, setToken] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    function dismiss() {
        if (!busy) close();
    }
    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open) dismiss();
            }}
        >
            <DialogHeader title="管理员解锁" onOpenChange={dismiss} />
            <VStack
                as="form"
                padding={5}
                gap={4}
                onSubmit={async (event) => {
                    event.preventDefault();
                    if (busy || !token) return;
                    setBusy(true);
                    setError("");
                    try {
                        await request("app-center.unlock", { token });
                        unlocked();
                    } catch (failure) {
                        setError(String(failure));
                        setBusy(false);
                    }
                }}
            >
                <TextInput
                    label="管理令牌"
                    type="password"
                    value={token}
                    hasAutoFocus
                    isRequired
                    description="解锁后可查看服务详情并启停应用。"
                    status={
                        error ? { type: "error", message: error } : undefined
                    }
                    onChange={setToken}
                />
                <HStack hAlign="end" gap={2}>
                    <Button
                        label="取消"
                        variant="secondary"
                        onClick={dismiss}
                        isDisabled={busy}
                    />
                    <Button label="解锁" type="submit" isLoading={busy} />
                </HStack>
            </VStack>
        </Dialog>
    );
}

function AppCenter() {
    const snapshot = useAppSnapshot<{ revision: number }>();
    const [refresh, setRefresh] = useState(0);
    const [directory, setDirectory] = useState<Directory>();
    const [page, setPage] = useState<"discover" | "manage">("discover");
    const [unlock, setUnlock] = useState(false);
    const [pendingId, setPendingId] = useState("");
    const [removeId, setRemoveId] = useState("");
    const [query, setQuery] = useState("");
    const [changing, setChanging] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [changeError, setChangeError] = useState("");
    useEffect(() => {
        let active = true;
        if (snapshot?.user) {
            setLoading(true);
            setLoadError("");
            void request("app-center.list").then(
                (value) => {
                    if (!active) return;
                    setDirectory(value as unknown as Directory);
                    setLoading(false);
                },
                (failure) => {
                    if (!active) return;
                    setDirectory(undefined);
                    setLoadError(String(failure));
                    setLoading(false);
                },
            );
        }
        return () => {
            active = false;
        };
    }, [snapshot?.user?.userId, snapshot?.state?.revision, refresh]);

    const reload = () => setRefresh((value) => value + 1);
    const managing = page === "manage";
    useEffect(() => {
        if (!managing || !directory?.administrator) return;
        const timer = window.setInterval(() => {
            if (!document.hidden) setRefresh((value) => value + 1);
        }, 3000);
        return () => window.clearInterval(timer);
    }, [managing, directory?.administrator]);
    const search = query.trim().toLocaleLowerCase();
    const matches = (name: string) => name.toLocaleLowerCase().includes(search);
    const names = directory?.names.filter(matches) ?? [];
    const services = directory?.administrator
        ? directory.services.filter((service) => matches(service.name))
        : [];
    const pending =
        directory?.administrator &&
        directory.services.find(
            (service) =>
                service.app_id === pendingId &&
                (service.enabled || service.transition === "disable_failed"),
        );
    function navigate(destination: typeof page) {
        setPage(destination);
        setQuery("");
        setPendingId("");
        setRemoveId("");
        setChangeError("");
    }
    async function change(
        action: string,
        args: Record<string, string | boolean>,
    ) {
        if (changing) return;
        setChanging(true);
        setChangeError("");
        try {
            await request(action, args);
        } catch (failure) {
            setChangeError(String(failure));
        } finally {
            setPendingId("");
            setRemoveId("");
            setChanging(false);
            reload();
        }
    }
    const empty = (
        <EmptyState
            title={search ? "没有找到匹配的应用" : "暂无应用"}
            icon={<Icon icon={MagnifyingGlassIcon} />}
            actions={
                search && (
                    <Button
                        label="清除搜索"
                        variant="secondary"
                        onClick={() => setQuery("")}
                    />
                )
            }
        />
    );
    function results() {
        if (!directory)
            return loadError ? null : <Spinner label="正在加载应用" />;
        if (!managing)
            return names.length ? <AppGallery names={names} /> : empty;
        if (!directory.administrator) {
            return loading ? (
                <Spinner label="正在获取服务详情" />
            ) : (
                <Button label="管理员解锁" onClick={() => setUnlock(true)} />
            );
        }
        if (!services.length) return empty;
        return (
            <VStack gap={0}>
                {services.map((service) => (
                    <Fragment key={service.app_id}>
                        <ServiceRow
                            service={service}
                            busy={changing}
                            onChange={(enable) => {
                                if (enable)
                                    void change("app-center.set", {
                                        app_id: service.app_id,
                                        enabled: true,
                                    });
                                else setPendingId(service.app_id);
                            }}
                            onReview={(approve) =>
                                void change("app-center.review", {
                                    app_id: service.app_id,
                                    request_id: service.pending!.request_id,
                                    approve,
                                })
                            }
                            onRemove={() => setRemoveId(service.app_id)}
                        />
                        <Divider />
                    </Fragment>
                ))}
            </VStack>
        );
    }
    return (
        <VStack as="main" hAlign="center" minHeight="100dvh">
            <VStack width="100%" maxWidth="64rem" padding={6} gap={6}>
                <HStack
                    as="header"
                    hAlign="between"
                    vAlign="center"
                    wrap="wrap"
                    gap={3}
                >
                    <Heading level={1} type="display-2" weight="bold">
                        {managing ? "服务管理" : "发现"}
                    </Heading>
                    <HStack gap={2} vAlign="center">
                        <IconButton
                            label="刷新目录"
                            tooltip="刷新目录"
                            variant="ghost"
                            icon={<Icon icon={ArrowPathIcon} />}
                            isLoading={loading}
                            onClick={reload}
                        />
                        <Button
                            label={managing ? "返回发现" : "服务管理"}
                            variant="secondary"
                            icon={
                                <Icon
                                    icon={
                                        managing
                                            ? ArrowLeftIcon
                                            : AdjustmentsHorizontalIcon
                                    }
                                />
                            }
                            onClick={() => {
                                if (managing) navigate("discover");
                                else if (directory?.administrator)
                                    navigate("manage");
                                else setUnlock(true);
                            }}
                        />
                    </HStack>
                </HStack>
                <Divider />
                <VStack gap={4}>
                    <HStack
                        hAlign="between"
                        vAlign="center"
                        wrap="wrap"
                        gap={3}
                    >
                        <Heading level={2}>
                            {search
                                ? "搜索结果"
                                : managing
                                  ? "应用服务"
                                  : "全部应用"}
                        </Heading>
                        <TextInput
                            label="搜索应用"
                            isLabelHidden
                            placeholder="搜索应用"
                            startIcon={MagnifyingGlassIcon}
                            hasClear
                            value={query}
                            onChange={setQuery}
                        />
                    </HStack>
                    {loadError && (
                        <Banner
                            status="error"
                            title="目录加载失败"
                            description={loadError}
                            endContent={
                                <Button label="重试" onClick={reload} />
                            }
                        />
                    )}
                    {changeError && (
                        <Banner
                            status="error"
                            title="服务变更失败"
                            description={changeError}
                        />
                    )}
                    {results()}
                </VStack>
            </VStack>
            {unlock && (
                <UnlockDialog
                    close={() => setUnlock(false)}
                    unlocked={() => {
                        setUnlock(false);
                        navigate("manage");
                        reload();
                    }}
                />
            )}
            {pending && (
                <AlertDialog
                    isOpen
                    title={`停用${pending.name}？`}
                    description="应用将结束所有用户的在途任务并停止容器。内存中的会话会清空，工作目录里的文件会保留。"
                    actionLabel="停用"
                    cancelLabel="取消"
                    actionVariant="destructive"
                    isActionLoading={changing}
                    onOpenChange={(open) => {
                        if (!open && !changing) setPendingId("");
                    }}
                    onAction={() =>
                        void change("app-center.set", {
                            app_id: pending.app_id,
                            enabled: false,
                        })
                    }
                />
            )}
            {removeId && (
                <AlertDialog
                    isOpen
                    title={`下架 ${removeId}？`}
                    description="应用将结束在途任务并移除容器。工作卷会保留，再次上架需要提交申请。"
                    actionLabel="下架应用"
                    cancelLabel="取消"
                    isActionLoading={changing}
                    onOpenChange={(open) => {
                        if (!open && !changing) setRemoveId("");
                    }}
                    onAction={() =>
                        void change("app-center.remove", { app_id: removeId })
                    }
                />
            )}
        </VStack>
    );
}

createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <AppCenter />
    </AppBoundary>,
);
