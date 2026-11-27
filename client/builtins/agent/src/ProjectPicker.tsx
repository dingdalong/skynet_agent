import { useEffect, useState, type FormEvent } from "react";
import {
    Button,
    Dialog,
    DialogHeader,
    DropdownMenu,
    HStack,
    Icon,
    Layout,
    LayoutContent,
    LayoutFooter,
    Selector,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import {
    CloudIcon,
    ComputerDesktopIcon,
    FolderIcon,
    FolderPlusIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { app, request } from "@skynet/app-sdk";
import { creatingProject, draftProject } from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import type { Send } from "./Composer";
import { directoryBasename, validateCloudProjectName } from "./format";

export function ProjectPicker({
    state,
    send,
    disabled,
    onError,
}: {
    state: AgentState;
    send: Send;
    disabled: boolean;
    onError: (message: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [pendingCreate, setPendingCreate] = useState<{
        name: string;
        sawRequest: boolean;
        dispatched: boolean;
        initialError: string;
        draftVersion: number;
    } | null>(null);
    const { location, id } = draftProject(state);
    const creating = creatingProject(state);
    const submitting = Boolean(pendingCreate);
    const local = location === "local";
    const workspaces = state.local?.workspaces ?? [];
    const options = local
        ? workspaces.map((item) => ({
              id: item.workspace_id,
              label: directoryBasename(item.directory),
              description: item.directory,
          }))
        : state.cloudProjects
              .slice()
              .sort((left, right) => left.localeCompare(right))
              .map((projectName) => ({ id: projectName, label: projectName }));
    const draftVersion = state.draftVersion;
    function resetDialogState() {
        setName("");
        setError("");
        setPendingCreate(null);
    }
    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);
        if (!nextOpen) resetDialogState();
    }
    useEffect(() => {
        if (!open || !pendingCreate) return;
        if (creating) {
            if (!pendingCreate.sawRequest) {
                setPendingCreate((previous) =>
                    previous ? { ...previous, sawRequest: true } : null,
                );
            }
            return;
        }
        if (state.cloudProjects.includes(pendingCreate.name)) {
            resetDialogState();
            setOpen(false);
            return;
        }
        if (pendingCreate.sawRequest) {
            setError(state.error || "云端项目创建失败，请稍后重试。");
            setPendingCreate(null);
            if (state.error) void send("error.dismiss");
            return;
        }
        if (pendingCreate.dispatched) {
            if (state.error && state.error !== pendingCreate.initialError) {
                setError(state.error);
                setPendingCreate(null);
                void send("error.dismiss");
            } else if (state.connection.status !== "online") {
                setError("当前未连接服务器，请稍后重试。");
                setPendingCreate(null);
            } else if (state.syncing) {
                setError("正在恢复会话，请稍后重试。");
                setPendingCreate(null);
            } else if (state.draftVersion !== pendingCreate.draftVersion) {
                setError("当前项目选择已变更，请重新提交。");
                setPendingCreate(null);
            }
        }
    }, [
        open,
        pendingCreate,
        creating,
        state.cloudProjects,
        state.error,
        state.connection.status,
        state.syncing,
        state.draftVersion,
        send,
    ]);
    async function chooseFolder() {
        try {
            onError("");
            const result = await request("agent.directory.choose");
            if (!result.cancelled)
                await send("project.select", {
                    location,
                    id: String(
                        (result.target as { workspace_id: string })
                            .workspace_id,
                    ),
                    draftVersion,
                });
        } catch (failure) {
            onError(
                failure instanceof Error ? failure.message : String(failure),
            );
        }
    }
    async function handleCreateSubmit(event: FormEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (submitting) return;
        const checked = validateCloudProjectName(name, state.cloudProjects);
        if (checked.error) {
            setError(checked.error);
            return;
        }
        setError("");
        setPendingCreate({
            name: checked.value,
            sawRequest: false,
            dispatched: false,
            initialError: state.error,
            draftVersion,
        });
        try {
            await app.command("project.create", {
                location: "cloud",
                id: checked.value,
                draftVersion,
            });
            setPendingCreate((previous) =>
                previous ? { ...previous, dispatched: true } : null,
            );
        } catch (failure) {
            setError(
                failure instanceof Error ? failure.message : String(failure),
            );
            setPendingCreate(null);
        }
    }
    return (
        <HStack gap={1} wrap="wrap" vAlign="center">
            <Selector
                label="工作位置"
                isLabelHidden
                size="sm"
                variant="ghost"
                presentation="adaptive"
                placement="above"
                value={location}
                startIcon={local ? ComputerDesktopIcon : CloudIcon}
                isReadOnly={!state.supportsLocal}
                isDisabled={disabled}
                options={[
                    ...(state.supportsLocal
                        ? [{ value: "local", label: "此计算机" }]
                        : []),
                    { value: "cloud", label: "云端" },
                ]}
                onClick={(event) =>
                    event.currentTarget.focus({ preventScroll: true })
                }
                onChange={(value) => {
                    if (value && value !== location)
                        void send("project.select", {
                            location: value,
                            draftVersion,
                        });
                }}
            />
            <DropdownMenu
                presentation="adaptive"
                placement="above"
                button={{
                    label:
                        options.find((item) => item.id === id)?.label ??
                        "选择项目",
                    icon: (
                        <Icon icon={FolderIcon} size="sm" color="secondary" />
                    ),
                    endContent: (
                        <Icon icon="chevronDown" size="sm" color="secondary" />
                    ),
                    size: "sm",
                    variant: "ghost",
                    isLoading: creating && !open,
                    isDisabled: disabled,
                }}
                items={[
                    ...options.map((item) => ({
                        ...item,
                        endContent:
                            item.id === id ? (
                                <Icon icon="check" size="sm" color="accent" />
                            ) : undefined,
                        onClick: () =>
                            void send("project.select", {
                                location,
                                id: item.id,
                                draftVersion,
                            }),
                    })),
                    ...(options.length ? [{ type: "divider" as const }] : []),
                    {
                        label: local ? "选择文件夹…" : "新建项目…",
                        icon: local ? FolderPlusIcon : PlusIcon,
                        onClick: () => {
                            if (local) void chooseFolder();
                            else {
                                resetDialogState();
                                setOpen(true);
                            }
                        },
                    },
                ]}
            />
            <Dialog
                purpose="form"
                width={420}
                isOpen={open}
                onOpenChange={handleOpenChange}
            >
                <Layout
                    header={
                        <DialogHeader
                            title="新建云端项目"
                            subtitle="在服务器工作区中创建独立的项目目录"
                            hasDivider
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <VStack
                                as="form"
                                gap={0}
                                id="agent-create-project"
                                onSubmit={(event) =>
                                    void handleCreateSubmit(event)
                                }
                            >
                                <TextInput
                                    label="项目名称"
                                    placeholder="例如：演示项目"
                                    hasAutoFocus
                                    isDisabled={submitting}
                                    value={name}
                                    onChange={(value) => {
                                        setName(value);
                                        if (error) setError("");
                                    }}
                                    status={
                                        error
                                            ? { type: "error", message: error }
                                            : undefined
                                    }
                                />
                            </VStack>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter hasDivider>
                            <HStack gap={2} hAlign="end">
                                <Button
                                    label="取消"
                                    variant="secondary"
                                    onClick={() => handleOpenChange(false)}
                                />
                                <Button
                                    label="创建项目"
                                    type="submit"
                                    form="agent-create-project"
                                    variant="primary"
                                    isLoading={submitting}
                                    isDisabled={disabled && !submitting}
                                />
                            </HStack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </HStack>
    );
}
