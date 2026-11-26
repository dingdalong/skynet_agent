import { useMemo, useState } from "react";
import {
    Button,
    ClickableCard,
    Drawer,
    DrawerHeader,
    EmptyState,
    HStack,
    Icon,
    IconButton,
    Layout,
    LayoutContent,
    LayoutFooter,
    SideNav,
    SideNavItem,
    SideNavSection,
    StatusDot,
    Text,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import {
    ChatBubbleLeftRightIcon,
    ComputerDesktopIcon,
    FolderIcon,
    PencilSquareIcon,
    ServerStackIcon,
    SignalIcon,
} from "@heroicons/react/24/outline";
import {
    ChatBubbleLeftRightIcon as ChatBubbleLeftRightSolidIcon,
    ComputerDesktopIcon as ComputerDesktopSolidIcon,
    FolderIcon as FolderSolidIcon,
    ServerStackIcon as ServerStackSolidIcon,
} from "@heroicons/react/24/solid";
import type {
    AgentState,
    ChatSession,
    ExecutionTarget,
} from "@skynet/agent-client/types";
import {
    connectionStatusMeta,
    filterSessions,
    groupSessionsByDate,
    sessionExecutionKind,
    sessionStatusKind,
    type SessionExecutionKind,
} from "./format";

const SESSION_ICONS: Record<
    SessionExecutionKind,
    { outline: typeof FolderIcon; solid: typeof FolderSolidIcon }
> = {
    local: { outline: FolderIcon, solid: FolderSolidIcon },
    remote: { outline: ComputerDesktopIcon, solid: ComputerDesktopSolidIcon },
    server: { outline: ServerStackIcon, solid: ServerStackSolidIcon },
    default: {
        outline: ChatBubbleLeftRightIcon,
        solid: ChatBubbleLeftRightSolidIcon,
    },
};

interface SidebarSharedProps {
    state: AgentState;
    sessions: ChatSession[];
    onSelectSession: (sessionId: string) => void;
    onCreateSession: () => void;
    onOpenConnection: () => void;
}

function sessionEndIndicator(chat: ChatSession) {
    const status = sessionStatusKind(chat);
    if (status === "running") {
        return <StatusDot variant="accent" isPulsing label="任务运行中" />;
    }
    if (status === "error") {
        return <StatusDot variant="error" label="最近任务失败" />;
    }
    if (status === "warning") {
        return (
            <StatusDot
                variant="warning"
                label={chat.read_only ? "只读会话" : "需选择工作目录"}
            />
        );
    }
    return undefined;
}

function SessionGroups({
    sessions,
    localWorkspaces,
    selectedId,
    query,
    onClearQuery,
    onSelectSession,
    isCollapsed,
}: {
    sessions: ChatSession[];
    localWorkspaces: ExecutionTarget[];
    selectedId: string;
    query: string;
    onClearQuery: () => void;
    onSelectSession: (sessionId: string) => void;
    isCollapsed: boolean;
}) {
    const filtered = useMemo(
        () => filterSessions(sessions, query),
        [sessions, query],
    );
    const groups = useMemo(() => groupSessionsByDate(filtered), [filtered]);

    if (!sessions.length) {
        if (isCollapsed) return null;
        return (
            <EmptyState
                isCompact
                title="暂无会话"
                description="在右侧输入任务即可开始。"
            />
        );
    }

    if (!groups.length) {
        if (isCollapsed) return null;
        return (
            <EmptyState
                isCompact
                title="未找到匹配会话"
                description="尝试更换关键词或新建会话。"
                actions={
                    <Button
                        label="清除搜索"
                        size="sm"
                        variant="ghost"
                        onClick={onClearQuery}
                    />
                }
            />
        );
    }

    return (
        <>
            {groups.map((group) => (
                <SideNavSection key={group.key} title={group.title}>
                    {group.sessions.map((chat) => {
                        const icons =
                            SESSION_ICONS[
                                sessionExecutionKind(chat, localWorkspaces)
                            ];
                        return (
                            <SideNavItem
                                key={chat.session.id}
                                label={chat.session.title || "新会话"}
                                icon={icons.outline}
                                selectedIcon={icons.solid}
                                isSelected={chat.session.id === selectedId}
                                endContent={sessionEndIndicator(chat)}
                                onClick={() => onSelectSession(chat.session.id)}
                            />
                        );
                    })}
                </SideNavSection>
            ))}
        </>
    );
}

function ConnectionFooterCard({
    state,
    onOpenConnection,
}: {
    state: AgentState;
    onOpenConnection: () => void;
}) {
    const connection = connectionStatusMeta(
        state.connection.status,
        state.syncing,
    );
    return (
        <ClickableCard
            label={`连接与设备：${connection.label}`}
            variant="muted"
            padding={2}
            width="100%"
            onClick={onOpenConnection}
        >
            <HStack gap={2} vAlign="center" width="100%">
                <StatusDot
                    variant={connection.dotVariant}
                    isPulsing={connection.pulsing}
                    label={connection.label}
                />
                <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text type="label" weight="semibold" maxLines={1}>
                        {connection.label}
                    </Text>
                    <Text type="supporting" color="secondary" maxLines={1}>
                        {state.configuration.username || "查看连接与设备"}
                    </Text>
                </VStack>
                <Icon icon={SignalIcon} size="sm" color="secondary" />
            </HStack>
        </ClickableCard>
    );
}

export function SessionSideNav({
    state,
    sessions,
    isCollapsed,
    onCollapsedChange,
    onSelectSession,
    onCreateSession,
    onOpenConnection,
}: SidebarSharedProps & {
    isCollapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const connection = connectionStatusMeta(
        state.connection.status,
        state.syncing,
    );
    const localWorkspaces = state.local?.workspaces ?? [];

    return (
        <SideNav
            aria-label="会话列表"
            topContent={
                isCollapsed ? (
                    <IconButton
                        label="新建会话"
                        tooltip="新建会话"
                        variant="primary"
                        size="sm"
                        icon={<Icon icon={PencilSquareIcon} size="sm" />}
                        onClick={onCreateSession}
                    />
                ) : (
                    <VStack gap={2} width="100%">
                        <Button
                            label="新建会话"
                            variant="primary"
                            size="sm"
                            width="100%"
                            icon={<Icon icon={PencilSquareIcon} size="sm" />}
                            onClick={onCreateSession}
                        />
                        {sessions.length >= 5 && (
                            <TextInput
                                type="search"
                                label="搜索会话"
                                isLabelHidden
                                size="sm"
                                placeholder="搜索会话…"
                                startIcon="search"
                                hasClear
                                width="100%"
                                value={searchQuery}
                                onChange={setSearchQuery}
                            />
                        )}
                    </VStack>
                )
            }
            footer={
                !isCollapsed ? (
                    <ConnectionFooterCard
                        state={state}
                        onOpenConnection={onOpenConnection}
                    />
                ) : undefined
            }
            footerIcons={
                isCollapsed ? (
                    <IconButton
                        label={`连接与设备（${connection.label}）`}
                        tooltip={`连接与设备 · ${connection.label}`}
                        variant="ghost"
                        size="sm"
                        icon={<Icon icon={SignalIcon} size="sm" />}
                        onClick={onOpenConnection}
                    />
                ) : undefined
            }
            collapsible={{
                hasButton: true,
                buttonLabel: isCollapsed ? "展开会话列表" : "收起会话列表",
            }}
            resizable={{
                defaultWidth: 260,
                minWidth: 210,
                maxWidth: 360,
                autoSaveId: "skynet.agent.sidebar",
                isCollapsed,
                onCollapseChange: onCollapsedChange,
            }}
        >
            <SessionGroups
                sessions={sessions}
                localWorkspaces={localWorkspaces}
                selectedId={state.selectedId}
                query={searchQuery}
                onClearQuery={() => setSearchQuery("")}
                onSelectSession={onSelectSession}
                isCollapsed={isCollapsed}
            />
        </SideNav>
    );
}

export function SessionDrawer({
    state,
    sessions,
    isOpen,
    onOpenChange,
    onSelectSession,
    onCreateSession,
    onOpenConnection,
}: SidebarSharedProps & {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const localWorkspaces = state.local?.workspaces ?? [];

    return (
        <Drawer
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            side="start"
            width={300}
            label="会话列表"
        >
            <Layout
                header={
                    <DrawerHeader
                        title="会话列表"
                        subtitle={
                            sessions.length
                                ? `共 ${sessions.length} 个会话`
                                : "开始一个新任务"
                        }
                        hasDivider
                        onOpenChange={onOpenChange}
                    />
                }
                content={
                    <LayoutContent>
                        <VStack gap={3}>
                            <VStack gap={2}>
                                <Button
                                    label="新建会话"
                                    variant="primary"
                                    width="100%"
                                    icon={
                                        <Icon
                                            icon={PencilSquareIcon}
                                            size="sm"
                                        />
                                    }
                                    onClick={() => {
                                        onCreateSession();
                                        onOpenChange(false);
                                    }}
                                />
                                {sessions.length >= 5 && (
                                    <TextInput
                                        type="search"
                                        label="搜索会话"
                                        isLabelHidden
                                        size="sm"
                                        placeholder="搜索会话…"
                                        startIcon="search"
                                        hasClear
                                        width="100%"
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                    />
                                )}
                            </VStack>
                            <SessionGroups
                                sessions={sessions}
                                localWorkspaces={localWorkspaces}
                                selectedId={state.selectedId}
                                query={searchQuery}
                                onClearQuery={() => setSearchQuery("")}
                                onSelectSession={(sessionId) => {
                                    onSelectSession(sessionId);
                                    onOpenChange(false);
                                }}
                                isCollapsed={false}
                            />
                        </VStack>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter hasDivider>
                        <ConnectionFooterCard
                            state={state}
                            onOpenConnection={() => {
                                onOpenChange(false);
                                onOpenConnection();
                            }}
                        />
                    </LayoutFooter>
                }
            />
        </Drawer>
    );
}
