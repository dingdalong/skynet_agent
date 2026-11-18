import { useLayoutEffect, useRef, useState } from "react";
import {
    Banner,
    ChatComposer,
    ChatComposerInput,
    ChatSendButton,
    HStack,
    Selector,
    VStack,
} from "@astryxdesign/core";
import { request } from "@skynet/app-sdk";
import { isSending } from "@skynet/agent-client/selectors";
import type { AgentState } from "@skynet/agent-client/types";
import type { Json } from "@skynet/contracts";

export type Send = (name: string, payload?: Json) => Promise<void>;
type Props = { state: AgentState; send: Send };

function WorkspaceSelector({
    state,
    send,
    disabled,
}: Props & { disabled: boolean }) {
    const [error, setError] = useState("");
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
            item.name === "SessionExecutionSetReq" &&
            item.target === state.selectedId,
    );
    if (!state.supportsLocal && !target?.device_id) return null;
    const select = async (id: string) => {
        setError("");
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
            setError(error instanceof Error ? error.message : String(error));
        }
    };
    return (
        <VStack>
            <Selector
                label="选择工作目录"
                isLabelHidden
                size="sm"
                variant="ghost"
                isDisabled={disabled || changing}
                value={
                    target?.device_id
                        ? local
                            ? target.workspace_id
                            : "remote"
                        : "server"
                }
                onChange={(id) => void select(id)}
                options={[
                    { value: "server", label: "服务器工作目录" },
                    ...workspaces.map((item) => ({
                        value: item.workspace_id,
                        label:
                            item.directory.split("/").at(-1) || item.directory,
                    })),
                    ...(target?.device_id && !local
                        ? [
                              {
                                  value: "remote",
                                  label: `远程桌面 · ${target.directory.split("/").at(-1)}`,
                                  disabled: true,
                              },
                          ]
                        : []),
                    ...(state.supportsLocal
                        ? [{ value: "choose", label: "选择本地目录…" }]
                        : []),
                ]}
            />
            {error && (
                <Banner
                    status="error"
                    title="工作目录未更改"
                    description={error}
                />
            )}
        </VStack>
    );
}

export function Composer({ state, send }: Props) {
    const saved = state.drafts[state.selectedId] ?? "";
    const previous = useRef(saved);
    const editorRoot = useRef<HTMLDivElement>(null);
    const [draft, setDraft] = useState(saved);
    useLayoutEffect(() => {
        const lastSaved = previous.current;
        previous.current = saved;
        setDraft((current) => (current === lastSaved ? saved : current));
    }, [saved]);
    const session = state.sessions[state.selectedId];
    const sending = isSending(state, state.selectedId);
    const active = !!session?.session.run_id;
    const pending = Object.values(state.connection.pending).filter(
        (item) => item.target === state.selectedId,
    );
    const cancelling =
        session?.session.cancelling ||
        pending.some((item) => item.name === "MessageCancelReq");
    const changingModel = pending.find(
        (item) => item.name === "SessionModelSetReq",
    );
    const online = state.connection.status === "online";
    const canSend =
        online && !state.syncing && !sending && !active && !!draft.trim();
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
                input={
                    <ChatComposerInput
                        id="agent-message"
                        ref={editorRoot}
                        label="发送给 Agent"
                        hasHistory={false}
                        pasteAsToken={false}
                        enterKeyHint={
                            matchMedia("(pointer: coarse)").matches
                                ? "enter"
                                : "send"
                        }
                        value={draft}
                        placeholder={
                            active
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
                                matchMedia("(pointer: coarse)").matches &&
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
                            placeholder="等待模型"
                            options={state.models.map((model) => ({
                                value: model.id,
                                label: model.name,
                            }))}
                            value={
                                changingModel?.text ||
                                session?.model_id ||
                                state.draftModelId ||
                                state.defaultModelId
                            }
                            isDisabled={
                                !!changingModel ||
                                !state.models.length ||
                                !online
                            }
                            onChange={(id) => void send("model.select", { id })}
                        />
                        <WorkspaceSelector
                            state={state}
                            send={send}
                            disabled={active || sending}
                        />
                    </HStack>
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
