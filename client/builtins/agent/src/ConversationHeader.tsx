import {
    Badge,
    Button,
    HStack,
    Icon,
    IconButton,
    StatusDot,
    Text,
    Toolbar,
    VStack,
} from "@astryxdesign/core";
import { Bars3BottomLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { AgentState, ChatSession } from "@skynet/agent-client/types";
import { connectionStatusMeta, formatWorkspaceLabel } from "./format";

export function ConversationHeader({
    state,
    session,
    wide,
    showSidebarToggle,
    onToggleSidebar,
    onCreateSession,
    onReconnect,
}: {
    state: AgentState;
    session?: ChatSession;
    wide: boolean;
    showSidebarToggle: boolean;
    onToggleSidebar: () => void;
    onCreateSession: () => void;
    onReconnect: () => void;
}) {
    const connection = connectionStatusMeta(
        state.connection.status,
        state.syncing,
    );
    const modelId = session?.model_id || state.defaultModelId;
    const modelName =
        state.models.find((model) => model.id === modelId)?.name || "";
    const target = session ? session.execution_target : state.draftTarget;
    const workspaceLabel = formatWorkspaceLabel(
        target,
        state.local?.workspaces ?? [],
        session?.needs_workspace,
    );
    const showWorkspace =
        state.supportsLocal ||
        !!target?.device_id ||
        !!session?.needs_workspace;
    const subtitleParts = [
        showWorkspace ? workspaceLabel : "",
        modelName,
    ].filter(Boolean);
    const showConnectionStatus =
        state.syncing || state.connection.status !== "online";
    const canReconnect = ["offline", "error"].includes(state.connection.status);

    return (
        <Toolbar
            className="agent-conversation-header"
            label="当前对话上下文"
            size="sm"
            dividers={["bottom"]}
            startContent={
                <HStack
                    gap={2}
                    vAlign="center"
                    wrap="nowrap"
                    style={{ minWidth: 0, overflow: "hidden" }}
                >
                    {showSidebarToggle && (
                        <IconButton
                            label="打开会话列表"
                            tooltip="会话列表"
                            variant="ghost"
                            size="sm"
                            icon={<Icon icon={Bars3BottomLeftIcon} size="sm" />}
                            onClick={onToggleSidebar}
                        />
                    )}
                    <VStack gap={0} style={{ minWidth: 0 }}>
                        <Text
                            type="label"
                            weight="semibold"
                            maxLines={1}
                            style={{ minWidth: 0 }}
                        >
                            {session?.session.title || "新会话"}
                        </Text>
                        {session && subtitleParts.length > 0 && (
                            <Text
                                type="supporting"
                                color="secondary"
                                maxLines={1}
                            >
                                {subtitleParts.join(" · ")}
                            </Text>
                        )}
                    </VStack>
                </HStack>
            }
            endContent={
                <HStack gap={1.5} vAlign="center" wrap="nowrap">
                    {session?.session.run_id && (
                        <Badge
                            variant="blue"
                            icon={
                                <StatusDot
                                    variant="accent"
                                    isPulsing
                                    label="生成中"
                                />
                            }
                            label="运行中"
                        />
                    )}
                    {session?.read_only && (
                        <Badge variant="neutral" label="只读" />
                    )}
                    {session?.needs_workspace && (
                        <Badge variant="warning" label="需选目录" />
                    )}
                    {showConnectionStatus && (
                        <Badge
                            variant={connection.badgeVariant}
                            icon={
                                <StatusDot
                                    variant={connection.dotVariant}
                                    isPulsing={connection.pulsing}
                                    label={connection.label}
                                />
                            }
                            label={connection.label}
                        />
                    )}
                    {canReconnect && (
                        <Button
                            label="重新连接"
                            variant="secondary"
                            size="sm"
                            onClick={onReconnect}
                        />
                    )}
                    {!wide && session && (
                        <IconButton
                            label="新建会话"
                            tooltip="新建会话"
                            variant="ghost"
                            size="sm"
                            icon={<Icon icon={PlusIcon} size="sm" />}
                            onClick={onCreateSession}
                        />
                    )}
                </HStack>
            }
        />
    );
}
