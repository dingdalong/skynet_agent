import { useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AppShell,
    Banner,
    Button,
    ChatLayout,
    ChatMessageList,
    EmptyState,
    Layout,
    LayoutHeader,
    Spinner,
    VStack,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
    AppBoundary,
    useAppSnapshot,
    usePaneToolbar,
} from "@skynet/app-sdk/react";
import { app } from "@skynet/app-sdk";
import { isSending, latestAssistant } from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import { Composer, type Send } from "./Composer";
import { Connection } from "./Connection";
import { MessageRow } from "./Messages";
import "./styles.css";

const statusLabels = {
    offline: "未连接",
    unavailable: "服务已下线",
    connecting: "连接中",
    restoring: "恢复会话",
    online: "已连接",
    retrying: "重新连接中",
    error: "连接失败",
};

function Agent() {
    const snapshot = useAppSnapshot<AgentState>();
    const [connectionOpen, setConnectionOpen] = useState(false);
    const [bridgeError, setBridgeError] = useState("");
    const wide = useMediaQuery("(min-width: 760px)");
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
    const sessions = Object.values(state?.sessions ?? {}).sort(
        (left, right) =>
            right.session.updated_at - left.session.updated_at ||
            right.session.id.localeCompare(left.session.id),
    );
    const session = state?.sessions?.[state.selectedId];
    const scroll = useRef<HTMLDivElement>(null);
    const anchor = useRef<{
        element: HTMLElement;
        offset: number;
        start: number;
    } | null>(null);
    const previousTop = useRef(0);
    const start = session?.session.message_start ?? 0;
    const loading = Object.values(state?.connection.pending ?? {}).some(
        (request) =>
            request.name === "AgentSessionHistoryReq" &&
            request.target === state?.selectedId,
    );
    const loadHistory = () => {
        if (!session || loading || state?.connection.status !== "online")
            return;
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
        previousTop.current = scroll.current?.scrollTop ?? 0;
    }, [state?.selectedId, start]);
    usePaneToolbar(
        state?.version === 1
            ? [
                  {
                      id: "sessions",
                      label: session?.session.title || "切换会话",
                      choices: sessions.map(({ session }) => ({
                          id: `session:${session.id}`,
                          label: session.title || "新会话",
                          selected: session.id === state.selectedId,
                      })),
                  },
                  { id: "new", label: "新建会话" },
                  {
                      id: "connection",
                      label: `连接设置 · ${state.syncing ? "同步会话" : statusLabels[state.connection.status]}`,
                  },
              ]
            : [],
        (id) => {
            if (id === "connection") setConnectionOpen(true);
            else if (id === "new") void send("session.new");
            else if (id.startsWith("session:"))
                void send("session.select", {
                    id: id.slice("session:".length),
                });
        },
    );
    if (state?.version !== 1)
        return (
            <VStack as="main" aria-label="Agent" padding={4}>
                {snapshot?.error ? (
                    <Banner
                        status="error"
                        title="应用运行时已停止"
                        description={snapshot.error}
                    />
                ) : (
                    <Spinner label="正在载入对话…" />
                )}
            </VStack>
        );
    const messages = session?.session.messages ?? [];
    const last = latestAssistant(session);
    const error = bridgeError || state.error;
    const online = state.connection.status === "online";
    const canConnect =
        state.connection.status === "offline" ||
        state.connection.status === "error";
    return (
        <AppShell variant="wash" mobileNav={{ breakpoint: "none" }}>
            <Layout
                padding={0}
                header={
                    <LayoutHeader padding={0}>
                        {session?.recovery_notice && (
                            <Banner
                                status="warning"
                                title={session.recovery_notice}
                                description={
                                    session.read_only
                                        ? "可阅读已恢复的消息，请另开会话继续。"
                                        : undefined
                                }
                            />
                        )}
                        {(error || state.notice) && (
                            <Banner
                                status={error ? "error" : "warning"}
                                title={error ? "需要处理" : "发送结果未确认"}
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
                    onScroll={(event) => {
                        const top = event.currentTarget.scrollTop;
                        if (top < previousTop.current && top <= 64 && start > 0)
                            loadHistory();
                        previousTop.current = top;
                    }}
                    className="agent-chat"
                    aria-label="消息记录"
                    density={wide ? "spacious" : "compact"}
                    composer={
                        <VStack gap={1}>
                            {last?.status === 4 &&
                                last.error?.retryable &&
                                !session?.session.run_id && (
                                    <Button
                                        label="重试本轮任务"
                                        variant="secondary"
                                        isDisabled={
                                            !online ||
                                            isSending(state, state.selectedId)
                                        }
                                        onClick={() =>
                                            void send("chat.retry", {
                                                target: state.selectedId,
                                                runId: last.run_id,
                                            })
                                        }
                                    />
                                )}
                            <Composer state={state} send={send} />
                        </VStack>
                    }
                    emptyState={
                        <EmptyState
                            isCompact={!wide}
                            role="status"
                            title={
                                state.connection.status === "unavailable"
                                    ? "Agent 服务已下线"
                                    : online
                                      ? "开始一个新任务"
                                      : "正在连接 Agent"
                            }
                            description={
                                state.connection.status === "unavailable"
                                    ? "服务上线后，此窗口会自动恢复。"
                                    : undefined
                            }
                            actions={
                                canConnect && (
                                    <Button
                                        label="重新连接"
                                        onClick={() =>
                                            void send("connection.reconnect")
                                        }
                                    />
                                )
                            }
                        />
                    }
                >
                    {session ? (
                        <ChatMessageList isStreaming={last?.status === 1}>
                            {loading && !messages.length ? (
                                <Spinner label="正在加载历史消息…" />
                            ) : (
                                (start > 0 || (!messages.length && error)) && (
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
                            {messages.map((message) => (
                                <MessageRow
                                    key={message.id}
                                    message={message}
                                />
                            ))}
                        </ChatMessageList>
                    ) : null}
                </ChatLayout>
            </Layout>
            {connectionOpen && (
                <Connection
                    state={state}
                    close={() => setConnectionOpen(false)}
                />
            )}
        </AppShell>
    );
}
createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <Agent />
    </AppBoundary>,
);
