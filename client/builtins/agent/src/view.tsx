import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AppShell,
    Banner,
    Button,
    Center,
    ChatLayout,
    ChatMessageList,
    ChatSystemMessage,
    EmptyState,
    HStack,
    Icon,
    LayerProvider,
    Layout,
    LayoutHeader,
    Spinner,
    useToast,
    VStack,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
    AppBoundary,
    useAppSnapshot,
    usePaneToolbar,
} from "@skynet/app-sdk/react";
import { app, request } from "@skynet/app-sdk";
import {
    creatingProject,
    isLocalDirectoryUnavailable,
    isSending,
    latestAssistant,
} from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import { Composer, type ComposerHandle, type Send } from "./Composer";
import { Connection } from "./Connection";
import { ConversationHeader } from "./ConversationHeader";
import { MessageRow } from "./Messages";
import {
    SessionDrawer,
    SessionSideNav,
    type ProjectTarget,
} from "./SessionSidebar";
import { WelcomeView } from "./WelcomeView";
import {
    connectionStatusMeta,
    messageDateLabel,
    shouldShowDateDivider,
} from "./format";
import "./styles.css";

function Agent() {
    const snapshot = useAppSnapshot<AgentState>();
    const [connectionOpen, setConnectionOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [bridgeError, setBridgeError] = useState("");
    const [authorizingDirectory, setAuthorizingDirectory] = useState(false);
    const wide = useMediaQuery("(min-width: 720px)");
    const composerHandle = useRef<ComposerHandle>(null);
    const showToast = useToast();
    const send: Send = async (name, payload = {}) => {
        try {
            await app.command(name, payload);
        } catch (error) {
            setBridgeError(
                error instanceof Error ? error.message : String(error),
            );
        }
    };
    const state = snapshot?.state;
    const sessions = Object.values(state?.sessions ?? {});
    const session = state?.sessions?.[state.selectedId];
    const scroll = useRef<HTMLDivElement>(null);
    const anchor = useRef<{
        element: HTMLElement;
        offset: number;
        start: number;
    } | null>(null);
    const previousTop = useRef(0);
    const historyRequestedForStart = useRef<number | null>(null);
    const wasLoadingHistory = useRef(false);
    const start = session?.session.message_start ?? 0;
    const loading = Object.values(state?.connection.pending ?? {}).some(
        (request) =>
            request.name === "AgentSessionHistoryReq" &&
            request.target === state?.selectedId,
    );
    const loadHistory = () => {
        if (
            !session ||
            loading ||
            historyRequestedForStart.current === start ||
            state?.connection.status !== "online"
        )
            return;
        historyRequestedForStart.current = start;
        const element = scroll.current?.querySelector<HTMLElement>(
            "[data-history-message]",
        );
        if (element && scroll.current)
            anchor.current = {
                element,
                offset:
                    element.getBoundingClientRect().top +
                    scroll.current.scrollTop,
                start,
            };
        void send("history.load", { target: session.session.id });
    };
    useLayoutEffect(() => {
        const saved = anchor.current;
        if (
            saved &&
            saved.start > start &&
            saved.element.isConnected &&
            scroll.current
        ) {
            scroll.current.scrollTop +=
                saved.element.getBoundingClientRect().top +
                scroll.current.scrollTop -
                saved.offset;
        }
        anchor.current = null;
        historyRequestedForStart.current = null;
        previousTop.current = scroll.current?.scrollTop ?? 0;
    }, [state?.selectedId, start]);
    useLayoutEffect(() => {
        if (wasLoadingHistory.current && !loading) {
            historyRequestedForStart.current = null;
        }
        wasLoadingHistory.current = loading;
    }, [loading]);
    const connection = state
        ? connectionStatusMeta(state.connection.status, state.syncing)
        : null;
    const toggleSidebar = () => {
        if (wide) setSidebarCollapsed((collapsed) => !collapsed);
        else setDrawerOpen((open) => !open);
    };
    const createSession = () => {
        setDrawerOpen(false);
        void send("session.new");
    };
    const createSessionInProject = (project: ProjectTarget) => {
        setDrawerOpen(false);
        void send("session.new", {
            location: project.location,
            id: project.id,
        });
        requestAnimationFrame(() => composerHandle.current?.focus());
    };
    const selectSession = (sessionId: string) => {
        void send("session.select", { id: sessionId });
    };
    usePaneToolbar(
        state?.version === 1 && connection
            ? [
                  {
                      id: "sidebar",
                      label: "会话列表",
                      selected: wide ? !sidebarCollapsed : drawerOpen,
                  },
                  { id: "new", label: "新建会话" },
                  {
                      id: "connection",
                      label: `连接与设备 · ${connection.label}`,
                  },
              ]
            : [],
        (id) => {
            if (id === "connection") setConnectionOpen(true);
            else if (id === "new") createSession();
            else if (id === "sidebar") toggleSidebar();
        },
    );
    if (state?.version !== 1)
        return (
            <VStack as="main" aria-label="Agent" height="100dvh" width="100%">
                <Center axis="both" height="100%" padding={6}>
                    {snapshot?.error ? (
                        <EmptyState
                            icon={
                                <Icon
                                    icon={ExclamationTriangleIcon}
                                    size="lg"
                                />
                            }
                            title="应用运行时已停止"
                            description={snapshot.error}
                            actions={
                                <Button
                                    label="重新载入界面"
                                    variant="primary"
                                    onClick={() => location.reload()}
                                />
                            }
                        />
                    ) : (
                        <Spinner label="正在载入对话…" />
                    )}
                </Center>
            </VStack>
        );
    const messages = session?.session.messages ?? [];
    const last = latestAssistant(session);
    const error = bridgeError || state.error;
    const online = state.connection.status === "online";
    const localDirectoryMissing = isLocalDirectoryUnavailable(state, session);
    const restoringProject = creatingProject(state);
    const reauthorizeLocalDirectory = async () => {
        if (authorizingDirectory) return;
        setAuthorizingDirectory(true);
        try {
            const result = await request("agent.directory.choose");
            if (!result.cancelled) {
                const chosen = result.target as
                    { directory?: string } | undefined;
                const matched =
                    chosen?.directory === session?.execution_target?.directory;
                showToast({
                    uniqueID: "agent-directory-reauthorized",
                    body: matched
                        ? "已恢复原项目目录授权"
                        : "已授权新目录，如需继续当前会话请授权原目录或新建会话",
                    type: "info",
                    autoHideDuration: 2800,
                });
            }
        } catch (failure) {
            setBridgeError(
                failure instanceof Error ? failure.message : String(failure),
            );
        } finally {
            setAuthorizingDirectory(false);
        }
    };
    const canRetryLast =
        !!last &&
        last.status === 4 &&
        !!last.error?.retryable &&
        !session?.session.run_id &&
        online &&
        !isSending(state, state.selectedId);
    const retryLast = () => {
        if (!last) return;
        void send("chat.retry", {
            target: state.selectedId,
            runId: last.run_id,
        });
    };
    const reduceMotion = snapshot?.preferences.reduceMotion ?? false;
    const showConversationHeader = !!session || !wide;
    return (
        <Fragment>
            <AppShell
                variant="section"
                height="fill"
                mobileNav={{ breakpoint: "none" }}
                sideNav={
                    wide ? (
                        <SessionSideNav
                            state={state}
                            sessions={sessions}
                            isCollapsed={sidebarCollapsed}
                            onCollapsedChange={setSidebarCollapsed}
                            onSelectSession={selectSession}
                            onCreateSession={createSession}
                            onCreateSessionInProject={createSessionInProject}
                            onOpenConnection={() => setConnectionOpen(true)}
                        />
                    ) : undefined
                }
            >
                <Layout
                    padding={0}
                    header={
                        <LayoutHeader padding={0}>
                            {showConversationHeader && (
                                <ConversationHeader
                                    state={state}
                                    session={session}
                                    showSidebarToggle={!wide}
                                    onToggleSidebar={toggleSidebar}
                                    onReconnect={() =>
                                        void send("connection.reconnect")
                                    }
                                />
                            )}
                            {session?.recovery_notice && (
                                <Banner
                                    status="warning"
                                    title={session.recovery_notice}
                                    description={
                                        session.read_only
                                            ? "可阅读已恢复的消息，请另开会话继续。"
                                            : undefined
                                    }
                                    endContent={
                                        session.read_only ||
                                        session.needs_workspace ? (
                                            <HStack gap={1.5}>
                                                {session.needs_workspace &&
                                                    !session.read_only &&
                                                    session.cloud_project && (
                                                        <Button
                                                            label="重建项目目录"
                                                            variant="primary"
                                                            size="sm"
                                                            isLoading={
                                                                restoringProject
                                                            }
                                                            isDisabled={
                                                                !online ||
                                                                state.syncing
                                                            }
                                                            onClick={() =>
                                                                void send(
                                                                    "project.restore",
                                                                )
                                                            }
                                                        />
                                                    )}
                                                <Button
                                                    label="新建会话"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={createSession}
                                                />
                                            </HStack>
                                        ) : undefined
                                    }
                                />
                            )}
                            {!session?.read_only && localDirectoryMissing && (
                                <Banner
                                    status="warning"
                                    title="原项目目录未授权"
                                    description="重新授权原本地目录后可继续对话，或新建会话。"
                                    endContent={
                                        <HStack gap={1.5}>
                                            <Button
                                                label="重新授权目录"
                                                variant="primary"
                                                size="sm"
                                                isLoading={authorizingDirectory}
                                                onClick={() =>
                                                    void reauthorizeLocalDirectory()
                                                }
                                            />
                                            <Button
                                                label="新建会话"
                                                variant="secondary"
                                                size="sm"
                                                onClick={createSession}
                                            />
                                        </HStack>
                                    }
                                />
                            )}
                            {(error || state.notice) && (
                                <Banner
                                    status={error ? "error" : "warning"}
                                    title={
                                        error ? "需要处理" : "发送结果未确认"
                                    }
                                    description={error || state.notice}
                                    isDismissable
                                    dismissLabel="关闭提示"
                                    onDismiss={() => {
                                        setBridgeError("");
                                        void send("error.dismiss");
                                    }}
                                    endContent={
                                        ["retrying", "error"].includes(
                                            state.connection.status,
                                        ) && (
                                            <Button
                                                label="重新连接"
                                                variant="secondary"
                                                onClick={() =>
                                                    void send(
                                                        "connection.reconnect",
                                                    )
                                                }
                                            />
                                        )
                                    }
                                />
                            )}
                        </LayoutHeader>
                    }
                >
                    <ChatLayout
                        key={state.selectedId}
                        ref={scroll}
                        onWheel={(event) => {
                            const top = event.currentTarget.scrollTop;
                            previousTop.current = top;
                            if (event.deltaY < 0 && top <= 64 && start > 0)
                                loadHistory();
                        }}
                        onScroll={(event) => {
                            const top = event.currentTarget.scrollTop;
                            if (
                                top < previousTop.current &&
                                top <= 64 &&
                                start > 0
                            )
                                loadHistory();
                            previousTop.current = top;
                        }}
                        className="agent-chat"
                        aria-label="消息记录"
                        density={wide ? "spacious" : "compact"}
                        composer={
                            <Composer
                                state={state}
                                send={send}
                                wide={wide}
                                handleRef={composerHandle}
                            />
                        }
                        emptyState={
                            <WelcomeView
                                state={state}
                                wide={wide}
                                onPickPrompt={(prompt) =>
                                    composerHandle.current?.applyDraft(prompt)
                                }
                                onReconnect={() =>
                                    void send("connection.reconnect")
                                }
                            />
                        }
                    >
                        {session ? (
                            <ChatMessageList isStreaming={last?.status === 1}>
                                {loading && !messages.length ? (
                                    <Spinner label="正在加载历史消息…" />
                                ) : (
                                    (start > 0 ||
                                        (!messages.length && error)) && (
                                        <Button
                                            label={
                                                loading
                                                    ? "正在加载…"
                                                    : messages.length
                                                      ? "加载更早消息"
                                                      : "重新加载历史"
                                            }
                                            variant="secondary"
                                            isDisabled={!online || loading}
                                            onClick={loadHistory}
                                        />
                                    )
                                )}
                                {messages.map((message, index) => {
                                    const previous =
                                        index > 0
                                            ? messages[index - 1]
                                            : undefined;
                                    const dateLabel = shouldShowDateDivider(
                                        previous,
                                        message,
                                    )
                                        ? messageDateLabel(message.created_at)
                                        : null;
                                    const isRetryableLast =
                                        canRetryLast && message.id === last?.id;
                                    return (
                                        <Fragment key={message.id}>
                                            {dateLabel && (
                                                <ChatSystemMessage variant="divider">
                                                    {dateLabel}
                                                </ChatSystemMessage>
                                            )}
                                            <MessageRow
                                                message={message}
                                                reduceMotion={reduceMotion}
                                                canRetry={isRetryableLast}
                                                onRetry={
                                                    isRetryableLast
                                                        ? retryLast
                                                        : undefined
                                                }
                                            />
                                        </Fragment>
                                    );
                                })}
                            </ChatMessageList>
                        ) : null}
                    </ChatLayout>
                </Layout>
            </AppShell>
            {!wide && (
                <SessionDrawer
                    state={state}
                    sessions={sessions}
                    isOpen={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    onSelectSession={selectSession}
                    onCreateSession={createSession}
                    onCreateSessionInProject={createSessionInProject}
                    onOpenConnection={() => setConnectionOpen(true)}
                />
            )}
            {connectionOpen && (
                <Connection
                    state={state}
                    send={send}
                    close={() => setConnectionOpen(false)}
                />
            )}
        </Fragment>
    );
}
createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <LayerProvider toast={{ position: "bottomEnd", maxVisible: 3 }}>
            <Agent />
        </LayerProvider>
    </AppBoundary>,
);
