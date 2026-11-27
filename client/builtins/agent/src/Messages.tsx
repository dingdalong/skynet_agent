import { useState } from "react";
import {
    Avatar,
    Banner,
    Button,
    Card,
    ChatMessage,
    ChatMessageBubble,
    ChatMessageMetadata,
    ChatTokenizedText,
    ChatToolCalls,
    CodeBlock,
    Collapsible,
    HStack,
    Icon,
    IconButton,
    Markdown,
    MetadataList,
    MetadataListItem,
    Spinner,
    Text,
    Timestamp,
    VStack,
    useClipboard,
    useToast,
    type MarkdownComponents,
} from "@astryxdesign/core";
import { useStreamingText } from "@astryxdesign/core/hooks";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type {
    ChatMessage as Message,
    ReasoningBlock,
    ToolCall,
} from "@skynet/agent-client/types";
import { presentToolCall, type ToolCallPresentation } from "./format";

const safeContent: Partial<MarkdownComponents> = {
    link: ({ href, children }) => (
        <Text>
            {children} ({href})
        </Text>
    ),
    image: ({ alt }) => <Text>{alt || "图片"}</Text>,
};

function Reasoning({
    block,
    toolName,
}: {
    block: ReasoningBlock;
    toolName?: string;
}) {
    const [open, setOpen] = useState<boolean>();
    const streaming = block.status === "streaming";
    const label =
        {
            streaming: "正在思考",
            completed: "思考记录",
            cancelled: "思考已取消",
            failed: "思考中断",
        }[block.status] ?? "思考记录";
    if (!block.text) return null;
    const triggerText = toolName ? `${toolName} · ${label}` : label;
    return (
        <Collapsible
            isOpen={open ?? streaming}
            onOpenChange={setOpen}
            chevronPosition="start"
            trigger={
                <HStack gap={1.5} vAlign="center">
                    {streaming && <Spinner size="sm" />}
                    <Text type="supporting" weight="medium">
                        {triggerText}
                    </Text>
                </HStack>
            }
        >
            <Card variant="muted" padding={3}>
                <Markdown
                    density="compact"
                    headingLevelStart={4}
                    components={safeContent}
                >
                    {block.text}
                </Markdown>
            </Card>
        </Collapsible>
    );
}

function ToolDetails({
    tool,
    presentation,
}: {
    tool: ToolCall;
    presentation: ToolCallPresentation;
}) {
    return (
        <VStack gap={2}>
            <MetadataList label={{ position: "top" }}>
                <MetadataListItem label="执行状态">
                    {presentation.statusLabel}
                </MetadataListItem>
                {tool.working_directory && (
                    <MetadataListItem label="工作目录">
                        {tool.working_directory}
                    </MetadataListItem>
                )}
                {presentation.terminalSessionId && (
                    <MetadataListItem label="终端会话">
                        {presentation.terminalSessionId}
                    </MetadataListItem>
                )}
                {presentation.justification && (
                    <MetadataListItem label="申请原因">
                        {presentation.justification}
                    </MetadataListItem>
                )}
                {tool.permission_reason && (
                    <MetadataListItem label="权限判定">
                        {tool.permission_reason}
                    </MetadataListItem>
                )}
                {tool.exit_code !== undefined && (
                    <MetadataListItem label="退出码">
                        {tool.exit_code}
                    </MetadataListItem>
                )}
                {tool.changed_files.length > 0 && (
                    <MetadataListItem label="修改文件">
                        <VStack gap={1}>
                            {tool.changed_files.map((file) => (
                                <Text type="code" key={file}>
                                    {file}
                                </Text>
                            ))}
                        </VStack>
                    </MetadataListItem>
                )}
            </MetadataList>
            {presentation.detailCode && (
                <CodeBlock
                    title={presentation.detailCode.title}
                    language={presentation.detailCode.language}
                    isDiff={presentation.detailCode.isDiff}
                    code={presentation.detailCode.code}
                    width="100%"
                    size="sm"
                    maxHeight={presentation.detailCode.isDiff ? 360 : 280}
                    isCollapsible
                    collapsibleThreshold={
                        presentation.detailCode.isDiff ? 20 : 16
                    }
                    isWrapped
                />
            )}
            {tool.output && (
                <CodeBlock
                    title="输出"
                    code={tool.output}
                    width="100%"
                    size="sm"
                    maxHeight={320}
                    isCollapsible
                    collapsibleThreshold={16}
                    isWrapped
                />
            )}
            {tool.truncated && <Banner status="warning" title="输出已截断" />}
            {tool.error && (
                <Banner
                    title="执行失败"
                    status="error"
                    description={tool.error}
                />
            )}
        </VStack>
    );
}

export function MessageRow({
    message,
    reduceMotion = false,
    canRetry,
    onRetry,
}: {
    message: Message;
    reduceMotion?: boolean;
    canRetry?: boolean;
    onRetry?: () => void;
}) {
    const showToast = useToast();
    const { copy, isCopied } = useClipboard({ announce: "已复制到剪贴板" });
    const user = message.role === 1;
    const streaming = message.status === 1;
    const displayedText = useStreamingText(
        user ? "" : message.content,
        !user && streaming,
        { speed: reduceMotion ? "instant" : "fast" },
    );
    const status = streaming
        ? "正在生成"
        : message.status === 3
          ? "已取消"
          : undefined;
    const canCopy = !!message.content && !streaming;
    const footer =
        status || canCopy ? (
            <HStack gap={1} vAlign="center">
                {status && (
                    <Text type="supporting" color="secondary">
                        {status}
                    </Text>
                )}
                {canCopy && (
                    <IconButton
                        label={isCopied ? "已复制" : "复制消息"}
                        tooltip={isCopied ? "已复制" : "复制"}
                        variant="ghost"
                        size="sm"
                        icon={
                            <Icon
                                icon={isCopied ? "check" : "copy"}
                                size="sm"
                            />
                        }
                        onClick={() => {
                            void copy(message.content).then((copied) => {
                                if (copied) {
                                    showToast({
                                        uniqueID: "agent-copy",
                                        body: "已复制到剪贴板",
                                        type: "info",
                                        autoHideDuration: 2200,
                                    });
                                } else {
                                    showToast({
                                        uniqueID: "agent-copy",
                                        body: "无法写入剪贴板，请手动复制",
                                        type: "error",
                                    });
                                }
                            });
                        }}
                    />
                )}
            </HStack>
        ) : undefined;
    const metadata = (message.created_at > 0 || footer) && (
        <ChatMessageMetadata
            timestamp={
                message.created_at > 0 && (
                    <Timestamp
                        value={message.created_at / 1000}
                        format="time"
                    />
                )
            }
            footer={footer}
        />
    );
    return (
        <ChatMessage
            data-history-message={message.id}
            sender={user ? "user" : "assistant"}
            avatar={user ? undefined : <Avatar name="Agent" size="md" />}
            metadata={!message.content && metadata}
        >
            {message.reasoning.map((block) => (
                <Reasoning key={block.id} block={block} />
            ))}
            {message.tool_calls.length > 0 && (
                <ChatToolCalls
                    calls={message.tool_calls.map((tool) => {
                        const presentation = presentToolCall(tool);
                        return {
                            key: tool.id,
                            name: tool.name,
                            target: presentation.target,
                            node: presentation.node,
                            additions: presentation.additions,
                            deletions: presentation.deletions,
                            errorMessage: presentation.errorMessage,
                            status: presentation.status,
                            resultDetail: (
                                <ToolDetails
                                    tool={tool}
                                    presentation={presentation}
                                />
                            ),
                        };
                    })}
                />
            )}
            {message.tool_calls.flatMap((tool) =>
                tool.reasoning.map((block) => (
                    <Reasoning
                        key={`${tool.id}/${block.id}`}
                        block={block}
                        toolName={tool.name}
                    />
                )),
            )}
            {message.content && (
                <ChatMessageBubble
                    variant={user ? "filled" : "ghost"}
                    metadata={metadata}
                >
                    {user ? (
                        <ChatTokenizedText className="user-message">
                            {message.content}
                        </ChatTokenizedText>
                    ) : (
                        <Markdown
                            headingLevelStart={3}
                            components={safeContent}
                            isStreaming={streaming}
                        >
                            {displayedText}
                        </Markdown>
                    )}
                </ChatMessageBubble>
            )}
            {message.status === 4 && (
                <Banner
                    status="error"
                    title="任务失败"
                    description={message.error?.message || "服务器任务执行失败"}
                    endContent={
                        canRetry && onRetry ? (
                            <Button
                                label="重试本轮任务"
                                variant="secondary"
                                size="sm"
                                icon={<Icon icon={ArrowPathIcon} size="sm" />}
                                onClick={onRetry}
                            />
                        ) : undefined
                    }
                />
            )}
        </ChatMessage>
    );
}
