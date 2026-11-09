import { defineStore } from 'pinia'
import { computed, markRaw, shallowRef } from 'vue'
import { createChatRuntime, type ChatRuntime } from '../services/chat-runtime'

export const useChatStore = defineStore('chat', () => {
  const runtime = shallowRef(markRaw(createChatRuntime()))
  const state = computed(() => runtime.value.state)
  const username = computed(() => state.value.username)
  const userId = computed(() => state.value.userId)
  const sessionViews = computed(() => state.value.sessionViews)
  const selection = computed(() => state.value.selection)
  const localDraft = computed(() => state.value.localDraft)
  const activeSessionId = computed(() =>
    selection.value?.kind === 'session' ? selection.value.sessionId : null,
  )
  const activeDraft = computed(() => (selection.value?.kind === 'draft' ? localDraft.value : null))
  const sending = computed(() => activeDraft.value?.sending === true)
  const modelId = computed(() => activeDraft.value?.modelId ?? activeSession.value?.modelId ?? '')
  const permissionModelId = computed(() =>
    activeDraft.value
      ? state.value.permissionModelId || activeDraft.value.modelId
      : (activeSession.value?.permissionModelId ?? ''),
  )
  const connectionState = computed(() => state.value.connectionState)
  const connectionError = computed(() => state.value.connectionError)
  const pendingSends = computed(() => state.value.pendingSends)
  const sessions = computed(() =>
    [...sessionViews.value.values()].sort(
      (a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id),
    ),
  )
  const activeSession = computed(() => sessionViews.value.get(activeSessionId.value ?? ''))
  const messages = computed(() => activeSession.value?.messages ?? [])
  const draft = computed({
    get: () => activeDraft.value?.text ?? activeSession.value?.draft ?? '',
    set: (value: string) => runtime.value.setDraft(value),
  })
  const runState = computed<'idle' | 'running' | 'cancelling'>(() => {
    if (activeSession.value?.cancelling) return 'cancelling'
    return activeSession.value?.runId || pendingSends.value.has(activeSessionId.value ?? '')
      ? 'running'
      : 'idle'
  })
  const canOperateSessions = computed(() => connectionState.value === 'connected')
  const canSend = computed(
    () =>
      canOperateSessions.value &&
      runState.value === 'idle' &&
      !sending.value &&
      (!!activeDraft.value || !!activeSession.value),
  )
  const retryAvailable = computed(() => {
    const last = messages.value.at(-1)
    return connectionState.value === 'connected' && last?.status === 'error' && last.retryable
  })
  const canRetry = computed(() => retryAvailable.value && canSend.value)
  const errorMessage = computed(
    () => connectionError.value || activeDraft.value?.error || activeSession.value?.error || '',
  )

  function setRuntime(next: ChatRuntime) {
    runtime.value.detach()
    runtime.value = markRaw(next)
  }

  return {
    models: computed(() => state.value.models),
    username,
    userId,
    sessionViews,
    selection,
    localDraft,
    sending,
    modelId,
    permissionModelId,
    activeSessionId,
    activeSession,
    connectionState,
    connectionError,
    pendingSends,
    sessions,
    messages,
    draft,
    runState,
    canOperateSessions,
    canSend,
    retryAvailable,
    canRetry,
    errorMessage,
    attach: () => runtime.value.attach(),
    detach: () => runtime.value.detach(),
    connect: (name = username.value) => runtime.value.connect(name),
    disconnect: () => runtime.value.disconnect(),
    switchUser: () => runtime.value.switchUser(),
    setModel: (id: string) => runtime.value.setModel(id),
    createSession: () => runtime.value.createSession(),
    selectSession: (id: string) => runtime.value.selectSession(id),
    sendMessage: (text: string) => runtime.value.sendMessage(text),
    retryLastMessage: () => runtime.value.retryLastMessage(),
    cancelRun: () => runtime.value.cancelRun(),
    dismissError: () => runtime.value.dismissError(),
    setRuntime,
  }
})
