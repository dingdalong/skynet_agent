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
    ChatComposerDrawer,
    ChatSendButton,
    HStack,
    Selector,
    Text,
    type ChatComposerInputHandle,
} from "@astryxdesign/core";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { ProjectPicker } from "./ProjectPicker";
import {
    creatingProject,
    draftProject,
    isLocalDirectoryUnavailable,
    isSending,
} from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import type { Json } from "@skynet/contracts";

export type Send = (name: string, payload?: Json) => Promise<void>;
export interface ComposerHandle {
    applyDraft: (text: string) => void;
    focus: () => void;
}
type Props = { state: AgentState; send: Send };

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
    const [projectHint, setProjectHint] = useState(false);
    useLayoutEffect(() => {
        const lastSaved = previous.current;
        previous.current = saved;
        setDraft((current) => (current === lastSaved ? saved : current));
    }, [saved]);
    useLayoutEffect(() => {
        setWorkspaceError("");
        setProjectHint(false);
    }, [state.selectedId]);
    const session = state.sessions[state.selectedId];
    const project = draftProject(state);
    const creating = creatingProject(state);
    const missingProject = !session && !project.id;
    const localDirectoryMissing = isLocalDirectoryUnavailable(state, session);
    useLayoutEffect(() => {
        if (!missingProject) setProjectHint(false);
    }, [missingProject]);
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
        !localDirectoryMissing &&
        !state.syncing &&
        !sending &&
        (!!session || (!!project.id && !creating)) &&
        !active &&
        !!draft.trim();
    const composerStatus = workspaceError
        ? {
              type: "error" as const,
              message: `选择本地项目失败：${workspaceError}`,
          }
        : session?.read_only
          ? {
                type: "warning" as const,
                message: "当前会话为只读模式，可浏览历史或新建会话继续。",
            }
          : session?.needs_workspace
            ? {
                  type: "warning" as const,
                  message: "原项目目录不可用，可在上方重建项目目录或新建会话。",
              }
            : localDirectoryMissing
              ? {
                    type: "warning" as const,
                    message:
                        "原本地目录尚未授权，可在上方重新授权目录或新建会话。",
                }
              : missingProject && (projectHint || !!draft.trim())
                ? {
                      type: "warning" as const,
                      message: creating
                          ? "正在创建云端项目，请稍候…"
                          : project.location === "local"
                            ? "请先在上方选择或授权本地项目，再发送消息。"
                            : "请先在上方选择或新建云端项目，再发送消息。",
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
    function submit() {
        if (canSend) {
            setProjectHint(false);
            void send("chat.send", { target: state.selectedId, text: draft });
            return;
        }
        if (
            missingProject &&
            online &&
            !state.syncing &&
            !sending &&
            !creating
        ) {
            setProjectHint(true);
        }
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
        <ChatComposer
            drawer={
                !session ? (
                    <ChatComposerDrawer className="composer-drawer">
                        <ProjectPicker
                            state={state}
                            send={send}
                            disabled={
                                !online || sending || state.syncing || creating
                            }
                            onError={setWorkspaceError}
                        />
                    </ChatComposerDrawer>
                ) : undefined
            }
            onSubmit={submit}
            value={draft}
            status={composerStatus}
            statusPosition="bottom"
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
                              ? "请重建原项目目录或新建会话…"
                              : localDirectoryMissing
                                ? "请重新授权原项目目录或新建会话…"
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
                        if (coarsePointer && !event.metaKey && !event.ctrlKey)
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
                        onClick={(event) =>
                            event.currentTarget.focus({ preventScroll: true })
                        }
                        onChange={(id) => void send("model.select", { id })}
                    />
                </HStack>
            }
            sendActions={
                wide &&
                !coarsePointer &&
                !active &&
                !session?.read_only &&
                !session?.needs_workspace &&
                !localDirectoryMissing ? (
                    <Text type="supporting" color="secondary">
                        {missingProject
                            ? creating
                                ? "正在创建项目…"
                                : "请先选择项目"
                            : "Enter 发送"}
                    </Text>
                ) : undefined
            }
            sendButton={
                <ChatSendButton
                    isStopShown={active}
                    isDisabled={!canSend}
                    aria-disabled={active ? !!cancelling || !online : !canSend}
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
    );
}
