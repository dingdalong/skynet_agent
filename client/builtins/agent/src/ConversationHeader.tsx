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
import { Bars3BottomLeftIcon } from "@heroicons/react/24/outline";
import { isLocalDirectoryUnavailable } from "@skynet/agent-client/selectors";
import type { AgentState, ChatSession } from "@skynet/agent-client/types";
import { connectionStatusMeta, formatWorkspaceLabel } from "./format";

export function ConversationHeader({
    state,
    session,
    showSidebarToggle,
    onToggleSidebar,
    onReconnect,
}: {
    state: AgentState;
    session?: ChatSession;
    showSidebarToggle: boolean;
    onToggleSidebar: () => void;
    onReconnect: () => void;
}) {
    const connection = connectionStatusMeta(
        state.connection.status,
        state.syncing,
    );
    const modelId = session?.model_id || state.defaultModelId;
    const modelName =
        state.models.find((model) => model.id === modelId)?.name || "";
    const workspaceLabel = session
        ? formatWorkspaceLabel(session, state.local?.deviceId, state.desktops)
        : "";
    const subtitleParts = [workspaceLabel, modelName].filter(Boolean);
    const directoryUnavailable =
        !!session?.needs_workspace ||
        isLocalDirectoryUnavailable(state, session);
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
                            variant="info"
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
                    {directoryUnavailable && (
                        <Badge variant="warning" label="原目录不可用" />
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
                </HStack>
            }
        />
    );
}
