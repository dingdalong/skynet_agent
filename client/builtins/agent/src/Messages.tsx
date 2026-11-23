import { useState } from "react";
import {
    Avatar,
    Banner,
    ChatMessage,
    ChatMessageBubble,
    ChatMessageMetadata,
    ChatTokenizedText,
    ChatToolCalls,
    CodeBlock,
    Collapsible,
    Markdown,
    MetadataList,
    MetadataListItem,
    Text,
    Timestamp,
    VStack,
    type MarkdownComponents,
} from "@astryxdesign/core";
import type {
    ChatMessage as Message,
    ReasoningBlock,
    ToolCall,
} from "@skynet/agent-client/types";

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
    return (
        <Collapsible
            isOpen={open ?? streaming}
            onOpenChange={setOpen}
            chevronPosition="start"
            trigger={toolName ? `${toolName} · ${label}` : label}
        >
            <Markdown components={safeContent}>{block.text}</Markdown>
        </Collapsible>
    );
}
const toolStatus: Record<string, string> = {
    interrupted: "执行中断",
    pending: "等待执行",
    judging: "检查权限",
    running: "执行中",
    completed: "已完成",
    failed: "执行失败",
    denied: "权限拒绝",
    cancelled: "已取消",
};
function ToolDetails({ tool }: { tool: ToolCall }) {
    return (
        <VStack gap={2}>
            <MetadataList label={{ position: "top" }}>
                <MetadataListItem label="执行状态">
                    {toolStatus[tool.status] ?? tool.status}
                </MetadataListItem>
                {tool.working_directory && (
                    <MetadataListItem label="工作目录">
                        {tool.working_directory}
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
            {tool.arguments && (
                <CodeBlock
                    title="调用参数"
                    language="json"
                    code={tool.arguments}
                    width="100%"
                    isWrapped
                />
            )}
            {tool.output && (
                <CodeBlock
                    title="输出"
                    code={tool.output}
                    width="100%"
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
function toolTarget(tool: ToolCall) {
    if (tool.arguments) {
        try {
            const args = JSON.parse(tool.arguments);
            if (typeof args?.cmd === "string") return args.cmd;
        } catch {
            return tool.working_directory || undefined;
        }
    }
    return tool.working_directory || undefined;
}
export function MessageRow({ message }: { message: Message }) {
    const user = message.role === 1;
    const status =
        message.status === 1
            ? "正在生成"
            : message.status === 3
              ? "已取消"
              : undefined;
    const metadata = (message.created_at > 0 || status) && (
        <ChatMessageMetadata
            timestamp={
                message.created_at > 0 && (
                    <Timestamp
                        value={message.created_at / 1000}
                        format="time"
                    />
                )
            }
            footer={status}
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
                    calls={message.tool_calls.map((tool) => ({
                        key: tool.id,
                        name: tool.name,
                        target: toolTarget(tool),
                        errorMessage:
                            tool.error ||
                            (tool.status === "cancelled"
                                ? "已取消"
                                : undefined),
                        status:
                            tool.error ||
                            ["failed", "denied", "cancelled"].includes(
                                tool.status,
                            )
                                ? "error"
                                : tool.status === "pending"
                                  ? "pending"
                                  : ["running", "judging"].includes(tool.status)
                                    ? "running"
                                    : "complete",
                        resultDetail: <ToolDetails tool={tool} />,
                    }))}
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
                            components={safeContent}
                            isStreaming={message.status === 1}
                        >
                            {message.content}
                        </Markdown>
                    )}
                </ChatMessageBubble>
            )}
            {message.status === 4 && (
                <Banner
                    status="error"
                    title="任务失败"
                    description={message.error?.message || "服务器任务执行失败"}
                />
            )}
        </ChatMessage>
    );
}
