import { useState } from "react";
import {
    Badge,
    Banner,
    Button,
    Card,
    Dialog,
    DialogHeader,
    Heading,
    HStack,
    Icon,
    Layout,
    LayoutContent,
    LayoutFooter,
    List,
    ListItem,
    MetadataList,
    MetadataListItem,
    StatusDot,
    Switch,
    Text,
    VStack,
    useToast,
} from "@astryxdesign/core";
import {
    ComputerDesktopIcon,
    FolderIcon,
    FolderPlusIcon,
} from "@heroicons/react/24/outline";
import { request } from "@skynet/app-sdk";
import type { AgentState } from "@skynet/agent-client/types";
import type { Send } from "./Composer";
import { connectionStatusMeta, directoryBasename } from "./format";

export function Connection({
    state,
    send,
    close,
}: {
    state: AgentState;
    send: Send;
    close(): void;
}) {
    const [error, setError] = useState("");
    const [choosingDirectory, setChoosingDirectory] = useState(false);
    const showToast = useToast();
    const connection = connectionStatusMeta(
        state.connection.status,
        state.syncing,
    );
    const canReconnect = ["offline", "error", "retrying"].includes(
        state.connection.status,
    );
    const canDisconnect = [
        "online",
        "connecting",
        "restoring",
        "retrying",
    ].includes(state.connection.status);
    const workspaces = state.local?.workspaces ?? [];
    const authorizeDirectory = async () => {
        setError("");
        setChoosingDirectory(true);
        try {
            const value = await request("agent.directory.choose");
            if (!value.cancelled) {
                showToast({
                    uniqueID: "agent-directory-added",
                    body: "已授权本地目录",
                    type: "info",
                    autoHideDuration: 2400,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setChoosingDirectory(false);
        }
    };

    return (
        <Dialog
            isOpen
            width={480}
            purpose="form"
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <Layout
                header={
                    <DialogHeader
                        title="连接与设备"
                        subtitle={connection.description}
                        hasDivider
                        onOpenChange={close}
                    />
                }
                content={
                    <LayoutContent>
                        <VStack gap={4}>
                            <Card variant="muted" padding={3}>
                                <VStack gap={3}>
                                    <HStack
                                        gap={2}
                                        vAlign="center"
                                        hAlign="between"
                                        wrap="wrap"
                                    >
                                        <HStack gap={2} vAlign="center">
                                            <StatusDot
                                                variant={connection.dotVariant}
                                                isPulsing={connection.pulsing}
                                                label={connection.label}
                                            />
                                            <Text
                                                type="label"
                                                weight="semibold"
                                            >
                                                网关连接
                                            </Text>
                                            <Badge
                                                variant={
                                                    connection.badgeVariant
                                                }
                                                label={connection.label}
                                            />
                                        </HStack>
                                        <HStack gap={1.5}>
                                            {canReconnect && (
                                                <Button
                                                    label="重新连接"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() =>
                                                        void send(
                                                            "connection.reconnect",
                                                        )
                                                    }
                                                />
                                            )}
                                            {canDisconnect && (
                                                <Button
                                                    label="断开连接"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        void send(
                                                            "connection.disconnect",
                                                        )
                                                    }
                                                />
                                            )}
                                        </HStack>
                                    </HStack>
                                    <MetadataList label={{ position: "top" }}>
                                        <MetadataListItem label="当前账号">
                                            {state.configuration.username ||
                                                "未登录"}
                                        </MetadataListItem>
                                        <MetadataListItem label="网关地址">
                                            <Text type="code">
                                                {state.configuration.url ||
                                                    "未配置"}
                                            </Text>
                                        </MetadataListItem>
                                        <MetadataListItem label="同步状态">
                                            {state.syncing
                                                ? "正在同步会话"
                                                : "已同步"}
                                        </MetadataListItem>
                                        {state.local?.name && (
                                            <MetadataListItem label="本机设备">
                                                {state.local.name}
                                            </MetadataListItem>
                                        )}
                                    </MetadataList>
                                </VStack>
                            </Card>

                            {state.local && state.supportsLocal && (
                                <Card padding={3}>
                                    <VStack gap={3}>
                                        <HStack
                                            gap={2}
                                            vAlign="center"
                                            hAlign="between"
                                            wrap="wrap"
                                        >
                                            <Heading level={4}>
                                                本机执行器
                                            </Heading>
                                            <Button
                                                label="授权新目录…"
                                                variant="secondary"
                                                size="sm"
                                                isLoading={choosingDirectory}
                                                icon={
                                                    <Icon
                                                        icon={FolderPlusIcon}
                                                        size="sm"
                                                    />
                                                }
                                                onClick={() =>
                                                    void authorizeDirectory()
                                                }
                                            />
                                        </HStack>
                                        <Switch
                                            label="允许其他设备使用本机工作目录"
                                            description="开启后，其他在线客户端可通过服务器在已授权的本机目录中执行任务。"
                                            value={state.local.remoteEnabled}
                                            onChange={(enabled) => {
                                                setError("");
                                                void request(
                                                    "agent.remote.set",
                                                    {
                                                        enabled,
                                                    },
                                                ).catch((err) =>
                                                    setError(String(err)),
                                                );
                                            }}
                                        />
                                        {workspaces.length > 0 ? (
                                            <VStack gap={1.5}>
                                                <Text
                                                    type="supporting"
                                                    color="secondary"
                                                >
                                                    已授权目录（
                                                    {workspaces.length}）
                                                </Text>
                                                <List
                                                    density="compact"
                                                    edge="flush"
                                                    hasDividers
                                                >
                                                    {workspaces.map(
                                                        (workspace) => (
                                                            <ListItem
                                                                key={
                                                                    workspace.workspace_id
                                                                }
                                                                startContent={
                                                                    <Icon
                                                                        icon={
                                                                            FolderIcon
                                                                        }
                                                                        size="sm"
                                                                        color="secondary"
                                                                    />
                                                                }
                                                                label={directoryBasename(
                                                                    workspace.directory,
                                                                )}
                                                                description={
                                                                    workspace.directory
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </List>
                                            </VStack>
                                        ) : (
                                            <Text
                                                type="supporting"
                                                color="secondary"
                                            >
                                                尚未授权本机目录，可点击上方按钮添加项目目录。
                                            </Text>
                                        )}
                                    </VStack>
                                </Card>
                            )}

                            {state.desktops.length > 0 && (
                                <Card padding={3}>
                                    <VStack gap={2}>
                                        <Heading level={4}>
                                            可用桌面设备（
                                            {state.desktops.length}）
                                        </Heading>
                                        <List
                                            density="compact"
                                            edge="flush"
                                            hasDividers
                                        >
                                            {state.desktops.map((desktop) => (
                                                <ListItem
                                                    key={desktop.id}
                                                    startContent={
                                                        <Icon
                                                            icon={
                                                                ComputerDesktopIcon
                                                            }
                                                            size="sm"
                                                            color="secondary"
                                                        />
                                                    }
                                                    label={
                                                        desktop.name ||
                                                        desktop.id
                                                    }
                                                    endContent={
                                                        <HStack
                                                            gap={1.5}
                                                            vAlign="center"
                                                        >
                                                            {desktop.remote_enabled && (
                                                                <Badge
                                                                    variant="blue"
                                                                    label="远程可用"
                                                                />
                                                            )}
                                                            <StatusDot
                                                                variant={
                                                                    desktop.online
                                                                        ? "success"
                                                                        : "neutral"
                                                                }
                                                                label={
                                                                    desktop.online
                                                                        ? "在线"
                                                                        : "离线"
                                                                }
                                                            />
                                                        </HStack>
                                                    }
                                                />
                                            ))}
                                        </List>
                                    </VStack>
                                </Card>
                            )}

                            {error && (
                                <Banner
                                    status="error"
                                    title="设备设置失败"
                                    description={error}
                                />
                            )}
                        </VStack>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter hasDivider>
                        <HStack hAlign="end">
                            <Button
                                label="完成"
                                variant="secondary"
                                onClick={close}
                            />
                        </HStack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
