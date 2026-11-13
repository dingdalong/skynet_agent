import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";
import { app, request } from "@skynet/app-sdk";
import { isSending, latestAssistant } from "@skynet/agent-client/selectors";
import type {
    AgentState,
    ChatMessage,
    ReasoningBlock,
    ToolCall,
} from "@skynet/agent-client/types";
import type { Json } from "@skynet/contracts";
import {
    AlertCircle,
    ArrowUp,
    Brain,
    Cable,
    Check,
    CircleStop,
    LoaderCircle,
    MessageSquare,
    Plus,
    RotateCcw,
    Server,
    Terminal,
    FolderOpen,
    X,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@skynet/ui/components/ui/alert";
import { Badge } from "@skynet/ui/components/ui/badge";
import { Bubble, BubbleContent } from "@skynet/ui/components/ui/bubble";
import { Button } from "@skynet/ui/components/ui/button";
import {
    CodeBlock,
    CodeBlockContent,
} from "@skynet/ui/components/ui/code-block";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@skynet/ui/components/ui/dialog";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@skynet/ui/components/ui/empty";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@skynet/ui/components/ui/field";
import { Input } from "@skynet/ui/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
    InputGroupText,
} from "@skynet/ui/components/ui/input-group";
import {
    Message,
    MessageContent,
    MessageFooter,
    MessageHeader,
} from "@skynet/ui/components/ui/message";
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@skynet/ui/components/ui/message-scroller";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@skynet/ui/components/ui/select";
import { Separator } from "@skynet/ui/components/ui/separator";
import { Skeleton } from "@skynet/ui/components/ui/skeleton";
import { Switch } from "@skynet/ui/components/ui/switch";
import manifest from "../manifest.json";
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from "@skynet/ui/components/ui/trace";
import "@skynet/ui/styles.css";
import "./styles.css";

type Send = (name: string, payload?: Json) => Promise<void>;
const statusLabels: Record<AgentState["connection"]["status"], string> = {
    offline: "未连接",
    connecting: "连接中",
    restoring: "恢复会话",
    online: "已连接",
    retrying: "重新连接中",
    error: "连接失败",
};

function RichText({ children }: { children: string }) {
    return (
        <div className="agent-markdown">
            <Markdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                    img: ({ alt }) => <span>{alt || "图片"}</span>,
                    a: ({ children, href }) => (
                        <span title={href}>
                            {children} {href && <code>({href})</code>}
                        </span>
                    ),
                    pre: ({ children }) => (
                        <CodeBlock>
                            <CodeBlockContent>{children}</CodeBlockContent>
                        </CodeBlock>
                    ),
                    code: ({ children }) => (
                        <span className="font-mono">{children}</span>
                    ),
                }}
            >
                {children}
            </Markdown>
        </div>
    );
}

function Reasoning({ block }: { block: ReasoningBlock }) {
    return (
        <TraceCollapsible>
            <TraceCollapsibleTrigger>
                <TraceLine
                    status={
                        block.status === "streaming" ? "running" : undefined
                    }
                >
                    <TraceIcon>
                        <Brain />
                    </TraceIcon>
                    <TraceTitle>
                        {block.status === "streaming" ? "正在思考" : "思考记录"}
                    </TraceTitle>
                </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
                <RichText>{block.text || "正在准备…"}</RichText>
            </TraceCollapsibleContent>
        </TraceCollapsible>
    );
}

function Tool({ tool }: { tool: ToolCall }) {
    const active = ["pending", "running", "judging"].includes(tool.status);
    const failed = !!tool.error || ["failed", "denied"].includes(tool.status);
    const labels: Record<string, string> = {
        pending: "等待执行",
        judging: "检查权限",
        running: "执行中",
        completed: "已完成",
        failed: "执行失败",
        denied: "权限拒绝",
        cancelled: "已取消",
    };
    return (
        <TraceCollapsible>
            <TraceCollapsibleTrigger>
                <TraceLine
                    status={failed ? "error" : active ? "running" : undefined}
                >
                    <TraceIcon>
                        {failed ? (
                            <AlertCircle />
                        ) : active ? (
                            <Terminal />
                        ) : (
                            <Check />
                        )}
                    </TraceIcon>
                    <TraceTitle>
                        {tool.name} · {labels[tool.status] || tool.status}
                    </TraceTitle>
                </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
                <div className="flex min-w-0 flex-col gap-3">
                    {tool.working_directory && (
                        <p>工作目录：{tool.working_directory}</p>
                    )}
                    {tool.arguments && (
                        <CodeBlock size="sm">
                            <CodeBlockContent wrap>
                                {tool.arguments}
                            </CodeBlockContent>
                        </CodeBlock>
                    )}
                    {tool.reasoning.map((block) => (
                        <Reasoning key={block.id} block={block} />
                    ))}
                    {tool.permission_reason && (
                        <p>权限判定：{tool.permission_reason}</p>
                    )}
                    {tool.output && (
                        <CodeBlock size="sm">
                            <CodeBlockContent wrap>
                                {tool.output}
                            </CodeBlockContent>
                        </CodeBlock>
                    )}
                    {tool.truncated && <p>输出已截断</p>}
                    {tool.changed_files.length > 0 && (
                        <p>修改文件：{tool.changed_files.join("、")}</p>
                    )}
                    {tool.error && <p role="alert">{tool.error}</p>}
                    {tool.exit_code !== undefined && (
                        <p>退出码：{tool.exit_code}</p>
                    )}
                </div>
            </TraceCollapsibleContent>
        </TraceCollapsible>
    );
}

function MessageRow({ message }: { message: ChatMessage }) {
    const user = message.role === 1;
    return (
        <Message align={user ? "end" : "start"}>
            <MessageContent>
                <MessageHeader>{user ? "你" : "Agent"}</MessageHeader>
                {(message.reasoning.length > 0 ||
                    message.tool_calls.length > 0) && (
                    <Trace>
                        {message.reasoning.map((block) => (
                            <Reasoning key={block.id} block={block} />
                        ))}
                        {message.tool_calls.map((tool) => (
                            <Tool key={tool.id} tool={tool} />
                        ))}
                    </Trace>
                )}
                {message.content && (
                    <Bubble variant={user ? "secondary" : "ghost"}>
                        <BubbleContent>
                            {user ? (
                                <p className="whitespace-pre-wrap">
                                    {message.content}
                                </p>
                            ) : (
                                <RichText>{message.content}</RichText>
                            )}
                        </BubbleContent>
                    </Bubble>
                )}
                {message.status === 1 && (
                    <MessageFooter>
                        <LoaderCircle className="mr-2 size-3 motion-safe:animate-spin" />
                        正在生成
                    </MessageFooter>
                )}
                {message.status === 3 && <MessageFooter>已取消</MessageFooter>}
                {message.status === 4 && (
                    <Alert variant="destructive">
                        <AlertCircle />
                        <AlertTitle>任务失败</AlertTitle>
                        <AlertDescription>
                            {message.error?.message || "服务器任务执行失败"}
                        </AlertDescription>
                    </Alert>
                )}
            </MessageContent>
        </Message>
    );
}

function ConnectionDialog({
    state,
    open,
    onOpenChange,
    send,
}: {
    state: AgentState;
    open: boolean;
    onOpenChange(value: boolean): void;
    send: Send;
}) {
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setError("");
        setBusy(true);
        try {
            const url = new URL(String(values.get("url"))).toString();
            if (
                state.supportsLocal &&
                ![
                    ...manifest.networkOrigins,
                    ...(state.local?.origins ?? []),
                ].some(
                    (origin) => url === origin || url.startsWith(`${origin}/`),
                )
            ) {
                await request("agent.server.authorize", { url });
            }
            await send("connection.configure", {
                url,
                username: String(values.get("username")),
            });
            onOpenChange(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>连接 Agent 服务器</DialogTitle>
                    <DialogDescription>
                        模型通过服务器运行，工具可以选择服务器或本机工作目录。用户名用于恢复同一用户的会话。
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        void submit(event);
                    }}
                    className="flex flex-col gap-5"
                >
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="agent-url">
                                服务器地址
                            </FieldLabel>
                            <Input
                                id="agent-url"
                                name="url"
                                required
                                defaultValue={state.configuration.url}
                                spellCheck={false}
                                autoComplete="off"
                            />
                            <FieldDescription>
                                新服务器首次连接时由系统窗口确认授权，无需重新构建客户端。远程地址使用
                                wss。
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="agent-username">
                                用户名
                            </FieldLabel>
                            <Input
                                id="agent-username"
                                name="username"
                                required
                                maxLength={64}
                                defaultValue={state.configuration.username}
                                autoComplete="username"
                            />
                            <FieldDescription>
                                当前服务器按用户名识别用户；请使用自己的唯一用户名。
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                    {state.local && (
                        <Field orientation="horizontal">
                            <div className="flex flex-1 flex-col gap-1">
                                <FieldLabel htmlFor="agent-remote">
                                    允许其他设备使用本机工作目录
                                </FieldLabel>
                                <FieldDescription>
                                    仅在本机 Agent
                                    在线时可用；关闭会停止远程执行。模型与工具结果仍经过服务器。
                                </FieldDescription>
                            </div>
                            <Switch
                                id="agent-remote"
                                checked={state.local.remoteEnabled}
                                onCheckedChange={(enabled) => {
                                    void request("agent.remote.set", {
                                        enabled,
                                    }).catch((error: Error) =>
                                        setError(error.message),
                                    );
                                }}
                            />
                        </Field>
                    )}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>连接未完成</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={busy}>
                            <Cable data-icon="inline-start" />
                            连接
                        </Button>
                    </DialogFooter>
                </form>
                {state.configuration.enabled && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            void send("connection.disconnect");
                            onOpenChange(false);
                        }}
                    >
                        断开连接
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}

function WorkspaceSelector({
    state,
    send,
    disabled,
}: {
    state: AgentState;
    send: Send;
    disabled: boolean;
}) {
    const [error, setError] = useState("");
    const session = state.sessions[state.selectedId];
    const target = session ? session.execution_target : state.draftTarget;
    const workspaces = state.local?.workspaces ?? [];
    const local = workspaces.some(
        (item) =>
            item.workspace_id === target?.workspace_id &&
            item.device_id === target?.device_id,
    );
    const changing = Object.values(state.connection.pending).some(
        (request) =>
            request.name === "SessionExecutionSetReq" &&
            request.target === state.selectedId,
    );
    if (!state.supportsLocal)
        return (
            <InputGroupText className="hidden @min-[600px]/agent:flex">
                <Server />
                服务器工作目录
            </InputGroupText>
        );
    const select = async (id: string) => {
        setError("");
        try {
            if (id === "choose") {
                const value = await request("agent.directory.choose");
                if (value.cancelled) return;
                await send("execution.select", {
                    workspaceId: (value.target as Record<string, Json>)
                        .workspace_id,
                });
            } else
                await send("execution.select", {
                    workspaceId: id === "server" ? "" : id,
                });
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
        }
    };
    return (
        <div className="min-w-0">
            <Select
                items={[
                    { value: "server", label: "服务器工作目录" },
                    ...workspaces.map((item) => ({
                        value: item.workspace_id,
                        label: item.directory.split("/").at(-1),
                    })),
                    ...(target?.device_id && !local
                        ? [
                              {
                                  value: "remote",
                                  label: `远程桌面 · ${target.directory.split("/").at(-1)}`,
                              },
                          ]
                        : []),
                    { value: "choose", label: "选择本地目录…" },
                ]}
                value={
                    target?.device_id
                        ? local
                            ? target.workspace_id
                            : "remote"
                        : "server"
                }
                disabled={disabled || changing}
                onValueChange={(value) => {
                    if (value) void select(value);
                }}
            >
                <SelectTrigger
                    size="sm"
                    aria-label="选择工作目录"
                    className="max-w-52"
                    title={target?.directory || "服务器工作目录"}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem value="server">服务器工作目录</SelectItem>
                        {workspaces.map((item) => (
                            <SelectItem
                                key={item.workspace_id}
                                value={item.workspace_id}
                            >
                                <FolderOpen data-icon="inline-start" />
                                {item.directory.split("/").at(-1)}
                            </SelectItem>
                        ))}
                        {target?.device_id && !local && (
                            <SelectItem value="remote" disabled>
                                远程桌面 · {target.directory.split("/").at(-1)}
                            </SelectItem>
                        )}
                        <SelectItem value="choose">
                            <Plus data-icon="inline-start" />
                            选择本地目录…
                        </SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            {error && (
                <p className="max-w-52 text-xs text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

function Transcript({ messages }: { messages: ChatMessage[] }) {
    return (
        <MessageScrollerProvider autoScroll>
            <MessageScroller>
                <MessageScrollerViewport aria-label="消息记录">
                    <MessageScrollerContent className="mx-auto max-w-3xl p-6">
                        {messages.map((message) => (
                            <MessageScrollerItem
                                key={message.id}
                                messageId={message.id}
                                scrollAnchor={message.role === 1}
                            >
                                <MessageRow message={message} />
                            </MessageScrollerItem>
                        ))}
                    </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton aria-label="跳到最新消息" />
            </MessageScroller>
        </MessageScrollerProvider>
    );
}

function Composer({ state, send }: { state: AgentState; send: Send }) {
    const input = useRef<HTMLTextAreaElement>(null);
    const saved = state.drafts[state.selectedId] ?? "";
    const lastSaved = useRef(saved);
    const [hasText, setHasText] = useState(!!saved.trim());
    useLayoutEffect(() => {
        const editor = input.current;
        if (editor && editor.value === lastSaved.current) editor.value = saved;
        lastSaved.current = saved;
        setHasText(!!editor?.value.trim());
    }, [saved]);
    const session = state.sessions[state.selectedId];
    const sending = isSending(state, state.selectedId);
    const active = !!session?.session.run_id;
    const cancelling =
        !!session?.session.cancelling ||
        Object.values(state.connection.pending).some(
            (request) =>
                request.name === "MessageCancelReq" &&
                request.target === state.selectedId,
        );
    const canSend =
        state.connection.status === "online" &&
        !state.syncing &&
        !sending &&
        !active;
    const submit = () => {
        if (canSend && input.current?.value.trim())
            void send("chat.send", {
                target: state.selectedId,
                text: input.current.value,
            });
    };
    const changingModel = Object.values(state.connection.pending).find(
        (request) =>
            request.name === "SessionModelSetReq" &&
            request.target === state.selectedId,
    );
    const model =
        changingModel?.text ||
        session?.model_id ||
        state.draftModelId ||
        state.defaultModelId;
    return (
        <form
            className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4 pt-2"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <Field>
                <FieldLabel htmlFor="agent-message" className="sr-only">
                    发送给 Agent
                </FieldLabel>
                <InputGroup>
                    <InputGroupTextarea
                        ref={input}
                        id="agent-message"
                        defaultValue={saved}
                        maxLength={32_000}
                        placeholder={
                            active
                                ? "任务在后台继续运行，你可以准备下一条消息…"
                                : "描述你的任务…"
                        }
                        className="max-h-48 min-h-24"
                        onChange={(event) => {
                            setHasText(!!event.target.value.trim());
                            void send("draft.set", {
                                target: state.selectedId,
                                text: event.target.value,
                            });
                        }}
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter" &&
                                !event.shiftKey &&
                                !event.nativeEvent.isComposing &&
                                event.keyCode !== 229
                            ) {
                                event.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <InputGroupAddon align="block-end" className="flex-wrap">
                        <Select
                            items={state.models.map((model) => ({
                                value: model.id,
                                label: model.name,
                            }))}
                            value={model || null}
                            disabled={
                                !!changingModel ||
                                !state.models.length ||
                                state.connection.status !== "online"
                            }
                            onValueChange={(id) => {
                                if (id) void send("model.select", { id });
                            }}
                        >
                            <SelectTrigger
                                size="sm"
                                aria-label="选择模型"
                                className="max-w-56"
                            >
                                <SelectValue placeholder="等待模型" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {state.models.map((model) => (
                                        <SelectItem
                                            key={model.id}
                                            value={model.id}
                                        >
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <WorkspaceSelector
                            state={state}
                            send={send}
                            disabled={active || sending}
                        />
                        {active ? (
                            <InputGroupButton
                                className="ml-auto"
                                aria-label="停止生成"
                                variant="outline"
                                disabled={
                                    cancelling ||
                                    state.connection.status !== "online"
                                }
                                onClick={() => {
                                    void send("chat.cancel", {
                                        target: state.selectedId,
                                        runId: session!.session.run_id,
                                    });
                                }}
                            >
                                <CircleStop data-icon="inline-start" />
                                {cancelling ? "正在停止" : "停止"}
                            </InputGroupButton>
                        ) : (
                            <InputGroupButton
                                className="ml-auto"
                                size="icon-sm"
                                type="submit"
                                variant="default"
                                aria-label="发送消息"
                                disabled={!canSend || !hasText}
                            >
                                {sending ? (
                                    <LoaderCircle className="motion-safe:animate-spin" />
                                ) : (
                                    <ArrowUp />
                                )}
                            </InputGroupButton>
                        )}
                    </InputGroupAddon>
                </InputGroup>
            </Field>
            <p className="text-center text-xs text-muted-foreground">
                Enter 发送 · Shift + Enter 换行
            </p>
        </form>
    );
}

function Agent() {
    const snapshot = useAppSnapshot<AgentState>();
    const [connectionOpen, setConnectionOpen] = useState(false);
    const [bridgeError, setBridgeError] = useState("");
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
            <main
                aria-label="Agent"
                className="flex h-dvh flex-col gap-4 bg-background p-8"
            >
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-40 w-full" />
            </main>
        );
    const sessions = Object.values(state.sessions).sort(
        (left, right) =>
            right.session.updated_at - left.session.updated_at ||
            right.session.id.localeCompare(left.session.id),
    );
    const session = state.sessions[state.selectedId];
    const messages = session?.session.messages ?? [];
    const last = latestAssistant(session);
    const error = bridgeError || state.error;
    const retrying = state.connection.status === "retrying";
    return (
        <main
            aria-label="Agent"
            className="@container/agent flex h-dvh min-w-0 bg-background text-foreground"
        >
            <aside
                aria-label="会话列表"
                className="hidden w-56 shrink-0 flex-col border-r bg-sidebar p-3 @min-[760px]/agent:flex"
            >
                <Button
                    variant="outline"
                    onClick={() => {
                        void send("session.new");
                    }}
                >
                    <Plus data-icon="inline-start" />
                    新会话
                </Button>
                <p className="px-2 pb-2 pt-6 text-xs font-medium text-muted-foreground">
                    会话
                </p>
                <nav
                    className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
                    aria-label="历史会话"
                >
                    {sessions.map(({ session: value }) => (
                        <Button
                            key={value.id}
                            variant={
                                value.id === state.selectedId
                                    ? "secondary"
                                    : "ghost"
                            }
                            className="justify-start"
                            aria-current={
                                value.id === state.selectedId
                                    ? "page"
                                    : undefined
                            }
                            onClick={() => {
                                void send("session.select", { id: value.id });
                            }}
                        >
                            {value.run_id ? (
                                <LoaderCircle
                                    data-icon="inline-start"
                                    className="motion-safe:animate-spin"
                                />
                            ) : (
                                <MessageSquare data-icon="inline-start" />
                            )}
                            <span className="truncate">
                                {value.title || "新会话"}
                            </span>
                        </Button>
                    ))}
                    {!sessions.length && (
                        <p className="px-2 text-xs text-muted-foreground">
                            开始对话后，会话将显示在这里
                        </p>
                    )}
                </nav>
                <Separator className="my-3" />
                <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setConnectionOpen(true)}
                >
                    <Cable data-icon="inline-start" />
                    {state.configuration.username || "连接服务器"}
                </Button>
            </aside>
            <section className="flex min-w-0 flex-1 flex-col">
                <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-semibold">
                            {session?.session.title || "Agent"}
                        </h1>
                        <p className="truncate text-xs text-muted-foreground">
                            {session?.execution_target?.directory ||
                                (!session
                                    ? state.draftTarget?.directory
                                    : "") ||
                                "服务器工作目录"}
                        </p>
                    </div>
                    <Badge
                        variant={
                            state.connection.status === "error"
                                ? "destructive"
                                : "secondary"
                        }
                        role="status"
                    >
                        {state.syncing
                            ? "同步会话"
                            : statusLabels[state.connection.status]}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="新会话"
                        onClick={() => {
                            void send("session.new");
                        }}
                    >
                        <Plus />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="连接设置"
                        onClick={() => setConnectionOpen(true)}
                    >
                        <Cable />
                    </Button>
                    <div className="w-full @min-[760px]/agent:hidden">
                        <Select
                            items={[
                                { value: "", label: "新会话" },
                                ...sessions.map(({ session }) => ({
                                    value: session.id,
                                    label: session.title || "新会话",
                                })),
                            ]}
                            value={state.selectedId}
                            onValueChange={(id) => {
                                void send(
                                    id ? "session.select" : "session.new",
                                    id ? { id } : {},
                                );
                            }}
                        >
                            <SelectTrigger
                                aria-label="切换会话"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="">新会话</SelectItem>
                                    {sessions.map(({ session }) => (
                                        <SelectItem
                                            key={session.id}
                                            value={session.id}
                                        >
                                            {session.title || "新会话"}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </header>
                {(error || state.notice) && (
                    <div className="shrink-0 px-4 pt-3">
                        <Alert variant={error ? "destructive" : "default"}>
                            <AlertCircle />
                            <AlertTitle>
                                {error ? "需要处理" : "发送结果未确认"}
                            </AlertTitle>
                            <AlertDescription>
                                <p>{error || state.notice}</p>
                                <div className="flex gap-2">
                                    {(retrying ||
                                        state.connection.status ===
                                            "error") && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                void send(
                                                    "connection.reconnect",
                                                );
                                            }}
                                        >
                                            重新连接
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setBridgeError("");
                                            void send("error.dismiss");
                                        }}
                                    >
                                        <X data-icon="inline-start" />
                                        关闭提示
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                <div className="min-h-0 min-w-0 flex-1">
                    {messages.length ? (
                        <Transcript
                            key={state.selectedId}
                            messages={messages}
                        />
                    ) : (
                        <Empty className="h-full">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <MessageSquare />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {state.connection.status === "online"
                                        ? "开始一个新任务"
                                        : "连接你的 Agent"}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {state.connection.status === "online"
                                        ? "告诉 Agent 你想完成什么。选择服务器或本地工作目录，返回桌面后任务也会继续运行。"
                                        : "连接后即可发送任务、接收实时进度，并恢复服务器中的历史会话。"}
                                </EmptyDescription>
                            </EmptyHeader>
                            {state.connection.status === "offline" ||
                            state.connection.status === "error" ? (
                                <EmptyContent>
                                    <Button
                                        onClick={() => setConnectionOpen(true)}
                                    >
                                        <Cable data-icon="inline-start" />
                                        连接服务器
                                    </Button>
                                </EmptyContent>
                            ) : null}
                        </Empty>
                    )}
                </div>
                {last?.status === 4 &&
                    last.error?.retryable &&
                    !session?.session.run_id && (
                        <div className="flex justify-center px-4 pb-2">
                            <Button
                                variant="outline"
                                disabled={
                                    state.connection.status !== "online" ||
                                    isSending(state, state.selectedId)
                                }
                                onClick={() => {
                                    void send("chat.retry", {
                                        target: state.selectedId,
                                        runId: last.run_id,
                                    });
                                }}
                            >
                                <RotateCcw data-icon="inline-start" />
                                重试本轮任务
                            </Button>
                        </div>
                    )}
                <Composer key={state.selectedId} state={state} send={send} />
            </section>
            <ConnectionDialog
                state={state}
                open={connectionOpen}
                onOpenChange={setConnectionOpen}
                send={send}
            />
        </main>
    );
}
createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <Agent />
    </AppBoundary>,
);
