import { useEffect, useMemo, useState } from "react";
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
    SideNavHeading,
    SideNavItem,
    SideNavSection,
    StatusDot,
    Text,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import {
    CloudIcon,
    ComputerDesktopIcon,
    FolderIcon,
    PencilSquareIcon,
    PlusIcon,
    SignalIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import { draftProject } from "@skynet/agent-client/selectors";
import type { AgentState, ChatSession } from "@skynet/agent-client/types";
import {
    connectionStatusMeta,
    groupSessionsByProject,
    projectGroupKey,
    projectGroupStatusKind,
    sessionStatusKind,
    type ProjectGroupKind,
} from "./format";

const VISIBLE_SESSIONS_LIMIT = 5;

export interface ProjectTarget {
    location: "local" | "cloud";
    id: string;
}

interface SidebarSharedProps {
    state: AgentState;
    sessions: ChatSession[];
    onSelectSession: (sessionId: string) => void;
    onCreateSession: () => void;
    onCreateSessionInProject: (project: ProjectTarget) => void;
    onOpenConnection: () => void;
}

function projectGroupIcon(kind: ProjectGroupKind) {
    switch (kind) {
        case "cloud":
            return CloudIcon;
        case "remote":
            return ComputerDesktopIcon;
        case "local":
        default:
            return FolderIcon;
    }
}

function sessionEndIndicator(chat: ChatSession, local: AgentState["local"]) {
    const status = sessionStatusKind(chat, local);
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
                label={chat.read_only ? "只读会话" : "原目录不可用"}
            />
        );
    }
    return undefined;
}

function projectGroupEndIndicator(
    sessions: ChatSession[],
    local: AgentState["local"],
) {
    const status = projectGroupStatusKind(sessions, local);
    if (status === "running") {
        return (
            <StatusDot variant="accent" isPulsing label="包含运行中的任务" />
        );
    }
    if (status === "error") {
        return <StatusDot variant="error" label="包含失败的任务" />;
    }
    if (status === "warning") {
        return <StatusDot variant="warning" label="包含需处理的会话" />;
    }
    return undefined;
}

function SessionGroups({
    sessions,
    state,
    selectedId,
    query,
    onClearQuery,
    onSelectSession,
    onCreateSessionInProject,
    isCollapsed,
}: {
    sessions: ChatSession[];
    state: AgentState;
    selectedId: string;
    query: string;
    onClearQuery: () => void;
    onSelectSession: (sessionId: string) => void;
    onCreateSessionInProject: (project: ProjectTarget) => void;
    isCollapsed: boolean;
}) {
    const groups = useMemo(
        () =>
            groupSessionsByProject(
                sessions,
                state.cloudProjects,
                state.local?.workspaces ?? [],
                query,
                state.local?.deviceId,
                state.desktops,
            ),
        [sessions, state.cloudProjects, state.local, state.desktops, query],
    );
    const searching = query.trim().length > 0;
    const activeGroupKey = groups.find((group) =>
        group.sessions.some((chat) => chat.session.id === selectedId),
    )?.key;
    const draft = draftProject(state);
    const activeDraftKey = useMemo(() => {
        if (!draft.id) return null;
        if (draft.location === "cloud") return projectGroupKey(null, draft.id);
        const workspace = state.local?.workspaces.find(
            (item) => item.workspace_id === draft.id,
        );
        return workspace ? projectGroupKey(workspace) : null;
    }, [draft.location, draft.id, state.local]);
    const firstNonEmptyKey = groups.find(
        (group) => group.sessions.length > 0,
    )?.key;
    const draftGroupHasSessions = Boolean(
        activeDraftKey &&
        groups.some(
            (group) =>
                group.key === activeDraftKey && group.sessions.length > 0,
        ),
    );
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchCollapsed, setSearchCollapsed] = useState<
        Record<string, boolean>
    >({});
    const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>(
        {},
    );
    useEffect(() => {
        setSearchCollapsed({});
    }, [query]);
    useEffect(() => {
        if (!activeGroupKey) return;
        setExpanded((previous) =>
            previous[activeGroupKey]
                ? previous
                : { ...previous, [activeGroupKey]: true },
        );
        const activeGroup = groups.find(
            (group) => group.key === activeGroupKey,
        );
        const selectedIndex = activeGroup
            ? activeGroup.sessions.findIndex(
                  (chat) => chat.session.id === selectedId,
              )
            : -1;
        if (selectedIndex >= VISIBLE_SESSIONS_LIMIT) {
            setExpandedLists((previous) =>
                previous[activeGroupKey]
                    ? previous
                    : { ...previous, [activeGroupKey]: true },
            );
        }
    }, [activeGroupKey, groups, selectedId]);
    useEffect(() => {
        if (searching || selectedId) return;
        if (draftGroupHasSessions && activeDraftKey) {
            setExpanded((previous) =>
                previous[activeDraftKey] === undefined
                    ? { ...previous, [activeDraftKey]: true }
                    : previous,
            );
            return;
        }
        if (firstNonEmptyKey) {
            setExpanded((previous) =>
                Object.keys(previous).length === 0
                    ? { [firstNonEmptyKey]: true }
                    : previous,
            );
        }
    }, [
        searching,
        selectedId,
        draftGroupHasSessions,
        activeDraftKey,
        firstNonEmptyKey,
    ]);

    if (!groups.length) {
        if (isCollapsed) return null;
        return (
            <EmptyState
                isCompact
                title={searching ? "未找到匹配项目或会话" : "暂无项目"}
                description={
                    searching
                        ? "试试其他项目名或会话标题。"
                        : "在输入栏上方选择或创建项目。"
                }
                actions={
                    searching ? (
                        <Button
                            label="清除搜索"
                            size="sm"
                            variant="ghost"
                            onClick={onClearQuery}
                        />
                    ) : undefined
                }
            />
        );
    }

    return (
        <SideNavSection title="项目">
            {groups.map((group) => {
                const hasSessions = group.sessions.length > 0;
                const isGroupExpanded = searching
                    ? !searchCollapsed[group.key]
                    : !!expanded[group.key];
                const showAll =
                    searching || isCollapsed || !!expandedLists[group.key];
                const visibleSessions = showAll
                    ? group.sessions
                    : group.sessions.slice(0, VISIBLE_SESSIONS_LIMIT);
                const hiddenCount =
                    group.sessions.length - visibleSessions.length;
                const canToggleLimit =
                    !searching &&
                    !isCollapsed &&
                    group.sessions.length > VISIBLE_SESSIONS_LIMIT;
                const isDraftSelected =
                    !selectedId && group.key === activeDraftKey;
                const isCollapsedActive =
                    group.key === activeGroupKey &&
                    (!isGroupExpanded || isCollapsed);
                const groupProject = group.project;
                return (
                    <SideNavItem
                        key={group.key}
                        label={group.name}
                        isSelected={isDraftSelected || isCollapsedActive}
                        isDisabled={!hasSessions && !groupProject}
                        icon={projectGroupIcon(group.kind)}
                        endContent={
                            hasSessions && !isGroupExpanded
                                ? projectGroupEndIndicator(
                                      group.sessions,
                                      state.local,
                                  )
                                : undefined
                        }
                        actions={
                            hasSessions && groupProject && !isCollapsed ? (
                                <IconButton
                                    className="agent-project-action"
                                    label={`在 ${group.name} 中新建会话`}
                                    tooltip="在此项目新建会话"
                                    variant="ghost"
                                    size="sm"
                                    icon={<Icon icon={PlusIcon} size="sm" />}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onCreateSessionInProject(groupProject);
                                    }}
                                />
                            ) : undefined
                        }
                        onClick={
                            !hasSessions && groupProject
                                ? () => onCreateSessionInProject(groupProject)
                                : undefined
                        }
                        collapsible={
                            hasSessions
                                ? {
                                      isCollapsed: !isGroupExpanded,
                                      onCollapsedChange: (collapsed) => {
                                          if (searching) {
                                              setSearchCollapsed(
                                                  (previous) => ({
                                                      ...previous,
                                                      [group.key]: collapsed,
                                                  }),
                                              );
                                          } else {
                                              setExpanded((previous) => ({
                                                  ...previous,
                                                  [group.key]: !collapsed,
                                              }));
                                          }
                                      },
                                  }
                                : false
                        }
                    >
                        {hasSessions
                            ? [
                                  ...visibleSessions.map((chat) => (
                                      <SideNavItem
                                          key={chat.session.id}
                                          label={chat.session.title || "新会话"}
                                          isSelected={
                                              chat.session.id === selectedId
                                          }
                                          endContent={sessionEndIndicator(
                                              chat,
                                              state.local,
                                          )}
                                          onClick={() =>
                                              onSelectSession(chat.session.id)
                                          }
                                      />
                                  )),
                                  ...(canToggleLimit
                                      ? [
                                            <SideNavItem
                                                key={`${group.key}:toggle`}
                                                label={
                                                    hiddenCount > 0
                                                        ? "展开显示"
                                                        : "收起"
                                                }
                                                endContent={
                                                    hiddenCount > 0 ? (
                                                        <Text
                                                            type="supporting"
                                                            color="secondary"
                                                        >
                                                            +{hiddenCount}
                                                        </Text>
                                                    ) : undefined
                                                }
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setExpandedLists(
                                                        (previous) => ({
                                                            ...previous,
                                                            [group.key]:
                                                                hiddenCount > 0,
                                                        }),
                                                    );
                                                }}
                                            />,
                                        ]
                                      : []),
                              ]
                            : undefined}
                    </SideNavItem>
                );
            })}
        </SideNavSection>
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
    onCreateSessionInProject,
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

    return (
        <SideNav
            aria-label="会话列表"
            header={
                <SideNavHeading
                    heading="Agent"
                    subheading={
                        sessions.length
                            ? `共 ${sessions.length} 个会话`
                            : "智能体工作区"
                    }
                    icon={<Icon icon={SparklesIcon} size="md" />}
                />
            }
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
                        {(sessions.length > 0 ||
                            state.cloudProjects.length > 0 ||
                            !!state.local?.workspaces.length) && (
                            <TextInput
                                type="search"
                                label="搜索项目或会话"
                                isLabelHidden
                                size="sm"
                                placeholder="搜索项目或会话…"
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
                state={state}
                selectedId={state.selectedId}
                query={searchQuery}
                onClearQuery={() => setSearchQuery("")}
                onSelectSession={onSelectSession}
                onCreateSessionInProject={onCreateSessionInProject}
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
    onCreateSessionInProject,
    onOpenConnection,
}: SidebarSharedProps & {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");

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
                                {(sessions.length > 0 ||
                                    state.cloudProjects.length > 0 ||
                                    !!state.local?.workspaces.length) && (
                                    <TextInput
                                        type="search"
                                        label="搜索项目或会话"
                                        isLabelHidden
                                        size="sm"
                                        placeholder="搜索项目或会话…"
                                        startIcon="search"
                                        hasClear
                                        width="100%"
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                    />
                                )}
                            </VStack>
                            <VStack as="nav" aria-label="会话列表" gap={2}>
                                <SessionGroups
                                    sessions={sessions}
                                    state={state}
                                    selectedId={state.selectedId}
                                    query={searchQuery}
                                    onClearQuery={() => setSearchQuery("")}
                                    onSelectSession={(sessionId) => {
                                        onSelectSession(sessionId);
                                        onOpenChange(false);
                                    }}
                                    onCreateSessionInProject={(project) => {
                                        onCreateSessionInProject(project);
                                        onOpenChange(false);
                                    }}
                                    isCollapsed={false}
                                />
                            </VStack>
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
