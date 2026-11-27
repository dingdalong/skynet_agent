import {
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
    type Ref,
} from "react";
import {
    ChatComposer,
    ChatComposerInput,
    ChatSendButton,
    HStack,
    Selector,
    Text,
    VStack,
    type ChatComposerInputHandle,
} from "@astryxdesign/core";
import {
    ComputerDesktopIcon,
    CpuChipIcon,
    FolderIcon,
    ServerStackIcon,
} from "@heroicons/react/24/outline";
import { request } from "@skynet/app-sdk";
import { isSending } from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import type { Json } from "@skynet/contracts";
import { directoryBasename } from "./format";

export type Send = (name: string, payload?: Json) => Promise<void>;
export interface ComposerHandle {
    applyDraft: (text: string) => void;
    focus: () => void;
}
type Props = { state: AgentState; send: Send };

function WorkspaceSelector({
    state,
    send,
    disabled,
    disabledMessage,
    onError,
}: Props & {
    disabled: boolean;
    disabledMessage?: string;
    onError: (message: string) => void;
}) {
    const session = state.sessions[state.selectedId];
    const target = session ? session.execution_target : state.draftTarget;
    const workspaces = state.local?.workspaces ?? [];
    const local = workspaces.some(
        (item) =>
            item.workspace_id === target?.workspace_id &&
            item.device_id === target?.device_id,
    );
    const changing = Object.values(state.connection.pending).some(
        (item) =>
            item.name === "AgentSessionExecutionSetReq" &&
            item.target === state.selectedId,
    );
    if (!state.supportsLocal && !target?.device_id && !session?.needs_workspace)
        return null;
    const select = async (id: string) => {
        onError("");
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
            onError(error instanceof Error ? error.message : String(error));
        }
    };
    const startIcon = target?.device_id
        ? local
            ? FolderIcon
            : ComputerDesktopIcon
        : ServerStackIcon;
    const environmentOptions = [
        ...(session?.needs_workspace
            ? [
                  {
                      value: "missing",
                      label: "原目录不可用",
                      disabled: true,
                  },
              ]
            : []),
        {
            value: "server",
            label: "服务器工作目录",
            description: "在服务器受管环境中执行任务",
        },
        ...(target?.device_id && !local
            ? [
                  {
                      value: "remote",
                      label: `远程桌面 · ${directoryBasename(target.directory)}`,
                      description: target.directory,
                      disabled: true,
                  },
              ]
            : []),
    ];
    return (
        <Selector
            label="选择工作目录"
            isLabelHidden
            size="sm"
            variant="ghost"
            presentation="adaptive"
            placement="above"
            startIcon={startIcon}
            isLoading={changing}
            isDisabled={disabled || changing}
            disabledMessage={changing ? "正在切换工作目录…" : disabledMessage}
            value={
                target?.device_id
                    ? local
                        ? target.workspace_id
                        : "remote"
                    : session?.needs_workspace
                      ? "missing"
                      : "server"
            }
            onChange={(id) => void select(id)}
            options={[
                {
                    type: "section" as const,
                    title: "执行环境",
                    options: environmentOptions,
                },
                ...(workspaces.length > 0
                    ? [
                          {
                              type: "section" as const,
                              title: "本机已授权目录",
                              options: workspaces.map((item) => ({
                                  value: item.workspace_id,
                                  label: directoryBasename(item.directory),
                                  description: item.directory,
                              })),
                          },
                      ]
                    : []),
                ...(state.supportsLocal
                    ? [
                          { type: "divider" as const },
                          { value: "choose", label: "选择本地目录…" },
                      ]
                    : []),
            ]}
        />
    );
}

export function Composer({
    state,
    send,
    wide = true,
    handleRef,
}: Props & { wide?: boolean; handleRef?: Ref<ComposerHandle> }) {
    const saved = state.drafts[state.selectedId] ?? "";
    const previous = useRef(saved);
    const editorRoot = useRef<HTMLDivElement>(null);
    const inputHandle = useRef<ChatComposerInputHandle>(null);
    const [draft, setDraft] = useState(saved);
    const [workspaceError, setWorkspaceError] = useState("");
    useLayoutEffect(() => {
        const lastSaved = previous.current;
        previous.current = saved;
        setDraft((current) => (current === lastSaved ? saved : current));
    }, [saved]);
    useLayoutEffect(() => {
        setWorkspaceError("");
    }, [state.selectedId]);
    const session = state.sessions[state.selectedId];
    const sending = isSending(state, state.selectedId);
    const active = !!session?.session.run_id;
    const pending = Object.values(state.connection.pending).filter(
        (item) => item.target === state.selectedId,
    );
    const cancelling =
        session?.session.cancelling ||
        pending.some((item) => item.name === "AgentMessageCancelReq");
    const changingModel = pending.find(
        (item) => item.name === "AgentSessionModelSetReq",
    );
    const online = state.connection.status === "online";
    const coarsePointer = matchMedia("(pointer: coarse)").matches;
    const canSend =
        online &&
        !session?.read_only &&
        !session?.needs_workspace &&
        !state.syncing &&
        !sending &&
        !active &&
        !!draft.trim();
    const composerStatus = workspaceError
        ? {
              type: "error" as const,
              message: `工作目录未更改：${workspaceError}`,
          }
        : session?.read_only
          ? {
                type: "warning" as const,
                message: "当前会话为只读模式，可浏览历史或新建会话继续。",
            }
          : session?.needs_workspace
            ? {
                  type: "warning" as const,
                  message: "原工作目录已不可用，请先在下方选择可用目录。",
              }
            : draft.length >= 30_000
              ? {
                    type: "warning" as const,
                    message: `输入字数已接近上限（${draft.length.toLocaleString()} / 32,000）`,
                }
              : undefined;
    const modelDisabledMessage = session?.read_only
        ? "只读会话不可切换模型"
        : !online
          ? "未连接时无法切换模型"
          : !state.models.length
            ? "暂无可用模型"
            : changingModel
              ? "正在切换模型…"
              : undefined;
    const workspaceDisabledMessage = session?.read_only
        ? "只读会话不可切换工作目录"
        : active || sending
          ? "任务执行期间无法切换工作目录"
          : !online
            ? "未连接时无法切换工作目录"
            : undefined;
    function submit() {
        if (canSend)
            void send("chat.send", { target: state.selectedId, text: draft });
    }
    function changeDraft(value: string) {
        const text = value.slice(0, 32_000);
        if (text !== value) {
            const editable =
                editorRoot.current?.querySelector("[contenteditable]");
            if (editable) {
                editable.textContent = text;
                const selection = window.getSelection();
                selection?.selectAllChildren(editable);
                selection?.collapseToEnd();
            }
        }
        setDraft(text);
        void send("draft.set", { target: state.selectedId, text });
    }
    useImperativeHandle(
        handleRef,
        () => ({
            focus: () => {
                inputHandle.current?.focus();
            },
            applyDraft: (text: string) => {
                const clipped = text.slice(0, 32_000);
                setDraft(clipped);
                void send("draft.set", {
                    target: state.selectedId,
                    text: clipped,
                });
                requestAnimationFrame(() => {
                    inputHandle.current?.focus();
                    const editable =
                        editorRoot.current?.querySelector("[contenteditable]");
                    if (editable) {
                        const selection = window.getSelection();
                        selection?.selectAllChildren(editable);
                        selection?.collapseToEnd();
                    }
                });
            },
        }),
        [send, state.selectedId],
    );
    return (
        <VStack
            as="form"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <ChatComposer
                onSubmit={submit}
                value={draft}
                status={composerStatus}
                statusPosition="top"
                input={
                    <ChatComposerInput
                        id="agent-message"
                        ref={editorRoot}
                        handleRef={inputHandle}
                        label="发送给 Agent"
                        hasHistory={false}
                        pasteAsToken={false}
                        enterKeyHint={coarsePointer ? "enter" : "send"}
                        value={draft}
                        placeholder={
                            session?.read_only
                                ? "当前会话为只读模式，请新建会话继续…"
                                : session?.needs_workspace
                                  ? "请先在下方选择可用的工作目录…"
                                  : active
                                    ? "任务进行中，可准备下一条消息…"
                                    : "描述你的任务…"
                        }
                        onChange={changeDraft}
                        onKeyDownCapture={(event) => {
                            if (event.key !== "Enter" || event.shiftKey) return;
                            event.stopPropagation();
                            if (
                                event.nativeEvent.isComposing ||
                                event.keyCode === 229
                            )
                                return;
                            if (
                                coarsePointer &&
                                !event.metaKey &&
                                !event.ctrlKey
                            )
                                return;
                            event.preventDefault();
                            submit();
                        }}
                    />
                }
                footerActions={
                    <HStack className="composer-options" gap={1} wrap="wrap">
                        <Selector
                            label="选择模型"
                            id="agent-model"
                            isLabelHidden
                            size="sm"
                            variant="ghost"
                            presentation="adaptive"
                            placement="above"
                            startIcon={CpuChipIcon}
                            isLoading={!!changingModel}
                            disabledMessage={modelDisabledMessage}
                            placeholder="等待模型"
                            options={state.models.map((model) => ({
                                value: model.id,
                                label: model.name,
                                description:
                                    model.model && model.model !== model.name
                                        ? model.model
                                        : undefined,
                            }))}
                            value={
                                changingModel?.text ||
                                session?.model_id ||
                                state.defaultModelId
                            }
                            isDisabled={
                                !!session?.read_only ||
                                !!changingModel ||
                                !state.models.length ||
                                !online
                            }
                            onChange={(id) => void send("model.select", { id })}
                        />
                        <WorkspaceSelector
                            state={state}
                            send={send}
                            disabled={
                                !!session?.read_only ||
                                active ||
                                sending ||
                                !online
                            }
                            disabledMessage={workspaceDisabledMessage}
                            onError={setWorkspaceError}
                        />
                    </HStack>
                }
                sendActions={
                    wide && !coarsePointer && !active ? (
                        <Text type="supporting" color="secondary">
                            Enter 发送
                        </Text>
                    ) : undefined
                }
                sendButton={
                    <ChatSendButton
                        isStopShown={active}
                        isDisabled={!canSend}
                        aria-disabled={
                            active ? !!cancelling || !online : !canSend
                        }
                        onSend={submit}
                        onStop={() => {
                            if (active && !cancelling && online)
                                void send("chat.cancel", {
                                    target: state.selectedId,
                                    runId: session.session.run_id,
                                });
                        }}
                    />
                }
            />
        </VStack>
    );
}
