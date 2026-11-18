import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
    AppShell,
    Badge,
    Banner,
    Button,
    ChatLayout,
    ChatMessageList,
    EmptyState,
    Heading,
    Icon,
    Layout,
    LayoutHeader,
    Selector,
    SideNav,
    SideNavItem,
    SideNavSection,
    Spinner,
    Toolbar,
    VStack,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";
import { app } from "@skynet/app-sdk";
import { isSending, latestAssistant } from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import { Composer, type Send } from "./Composer";
import { Connection } from "./Connection";
import { MessageRow } from "./Messages";
import "./styles.css";

const statusLabels = {
    offline: "未连接",
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
    const sessions = Object.values(state.sessions).sort(
        (left, right) =>
            right.session.updated_at - left.session.updated_at ||
            right.session.id.localeCompare(left.session.id),
    );
    const options = sessions.map(({ session }) => ({
        value: session.id,
        label: session.title || "新会话",
    }));
    const session = state.sessions[state.selectedId];
    const messages = session?.session.messages ?? [];
    const last = latestAssistant(session);
    const error = bridgeError || state.error;
    const online = state.connection.status === "online";
    const canConnect =
        state.connection.status === "offline" ||
        state.connection.status === "error";
    const openConnection = () => setConnectionOpen(true);
    const newSession = (
        <Button
            label="新会话"
            variant={wide ? "secondary" : "ghost"}
            onClick={() => void send("session.new")}
        />
    );
    return (
        <AppShell
            variant="wash"
            mobileNav={{ breakpoint: "none" }}
            sideNav={
                wide && (
                    <SideNav aria-label="会话列表" topContent={newSession}>
                        <SideNavSection title="历史会话">
                            {options.map(({ value, label }) => (
                                <SideNavItem
                                    key={value}
                                    label={label}
                                    isSelected={value === state.selectedId}
                                    onClick={() =>
                                        void send("session.select", {
                                            id: value,
                                        })
                                    }
                                />
                            ))}
                        </SideNavSection>
                    </SideNav>
                )
            }
        >
            <Layout
                padding={0}
                header={
                    <LayoutHeader padding={0}>
                        <Toolbar
                            className="session-toolbar"
                            label="会话操作"
                            size="sm"
                            dividers={["bottom"]}
                            startContent={
                                wide ? (
                                    <Heading level={2} maxLines={1}>
                                        {session?.session.title || "新会话"}
                                    </Heading>
                                ) : (
                                    <Selector
                                        id="agent-session"
                                        label="切换会话"
                                        isLabelHidden
                                        variant="ghost"
                                        value={state.selectedId}
                                        options={[
                                            { value: "", label: "新会话" },
                                            ...options,
                                        ]}
                                        onChange={(id) =>
                                            void send(
                                                id
                                                    ? "session.select"
                                                    : "session.new",
                                                id ? { id } : {},
                                            )
                                        }
                                    />
                                )
                            }
                            endContent={
                                <>
                                    <Badge
                                        role="status"
                                        variant={
                                            online && !state.syncing
                                                ? "success"
                                                : state.connection.status ===
                                                    "error"
                                                  ? "error"
                                                  : "neutral"
                                        }
                                        label={
                                            state.syncing
                                                ? "同步会话"
                                                : statusLabels[
                                                      state.connection.status
                                                  ]
                                        }
                                    />
                                    {!wide && newSession}
                                    <Button
                                        label="连接设置"
                                        icon={<Icon icon="wrench" />}
                                        isIconOnly
                                        tooltip="连接设置"
                                        variant="ghost"
                                        onClick={openConnection}
                                    />
                                </>
                            }
                        />
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
                            title={online ? "开始一个新任务" : "连接你的 Agent"}
                            actions={
                                canConnect && (
                                    <Button
                                        label="连接服务器"
                                        onClick={openConnection}
                                    />
                                )
                            }
                        />
                    }
                >
                    {messages.length ? (
                        <ChatMessageList isStreaming={last?.status === 1}>
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
