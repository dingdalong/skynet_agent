import { computed, reactive, toRefs } from 'vue'
import { initialChatState, type ChatRuntime } from './chat-runtime'
import { createChatTransport } from './chat-transport'
import { appendReasoning } from '../protocol/reasoning'
import {
  normalizeUsername,
  saveUsername,
  readSelectedSession,
  saveSelectedSession,
} from './user-preferences'
import type { ChatSession, ChatTransport, ChatUpdate, UserSnapshot } from '../types/chat'

export function createBrowserChatRuntime(
  transport: ChatTransport = createChatTransport(),
): ChatRuntime {
  let unsubscribe: (() => void) | null = null
  let generation = 0
  let baselineReady = false
  let buffered: ChatUpdate[] = []
  let syncing = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectAttempt = 0
  const state = reactive(initialChatState())
  const {
    username,
    userId,
    sessionViews,
    selection,
    localDraft,
    connectionState,
    connectionError,
    pendingSends,
  } = toRefs(state)
  const sessions = computed(() =>
    [...sessionViews.value.values()].sort(
      (a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id),
    ),
  )
  const activeSessionId = computed(() =>
    selection.value?.kind === 'session' ? selection.value.sessionId : null,
  )
  const activeView = computed(() => sessionViews.value.get(activeSessionId.value ?? ''))
  const messages = computed(() => activeView.value?.messages ?? [])
  const draft = computed({
    get: () =>
      selection.value?.kind === 'draft'
        ? (localDraft.value?.text ?? '')
        : (activeView.value?.draft ?? ''),
    set: (value: string) => {
      if (selection.value?.kind === 'draft') {
        if (localDraft.value && !localDraft.value.sending) localDraft.value.text = value
      } else if (activeView.value) activeView.value.draft = value
    },
  })
  const runState = computed<'idle' | 'running' | 'cancelling'>(() => {
    if (activeView.value?.cancelling) return 'cancelling'
    return activeView.value?.runId || pendingSends.value.has(activeSessionId.value ?? '')
      ? 'running'
      : 'idle'
  })
  const canOperateSessions = computed(() => connectionState.value === 'connected')
  const canSend = computed(
    () =>
      canOperateSessions.value &&
      runState.value === 'idle' &&
      (selection.value?.kind === 'draft'
        ? !!localDraft.value && !localDraft.value.sending
        : !!activeView.value),
  )
  const retryAvailable = computed(() => {
    const last = messages.value.at(-1)
    return connectionState.value === 'connected' && last?.status === 'error' && last.retryable
  })
  const canRetry = computed(() => retryAvailable.value && canSend.value)

  function messageError(error: unknown): string {
    return error instanceof Error ? error.message : 'Agent 请求失败'
  }

  function mergeSession(session: ChatSession) {
    const previous = sessionViews.value.get(session.id)
    if (previous && previous.revision >= session.revision) return
    sessionViews.value.set(session.id, {
      ...session,
      draft: previous?.draft ?? '',
      error: session.messages.at(-1)?.error ?? '',
    })
  }

  function installSnapshot(snapshot: UserSnapshot) {
    if (snapshot.username !== username.value) throw new Error('用户快照身份不匹配')
    if (userId.value !== snapshot.userId) {
      sessionViews.value.clear()
      selection.value = null
      localDraft.value = null
      userId.value = snapshot.userId
    }
    state.desktops = snapshot.desktops ?? []
    state.models = snapshot.models ?? []
    state.defaultModelId = snapshot.defaultModelId
    state.permissionModelId = snapshot.permissionModelId
    for (const session of snapshot.chatSessions) mergeSession(session)
    if (selection.value?.kind === 'draft' && localDraft.value) return
    if (!activeSessionId.value || !sessionViews.value.has(activeSessionId.value)) {
      const selected = readSelectedSession(username.value)
      const id = sessionViews.value.has(selected) ? selected : sessions.value[0]?.id
      if (id) selection.value = { kind: 'session', sessionId: id }
      else selectLocalDraft()
    }
  }

  function applyUpdate(update: ChatUpdate): boolean {
    if (update.type === 'desktop') {
      state.desktops = [...state.desktops.filter((d) => d.id !== update.device.id), update.device]
      return true
    }
    if (update.type === 'session') {
      mergeSession(update.session)
      return true
    }
    const view = sessionViews.value.get(update.sessionId)
    if (view && update.revision <= view.revision) return true
    if (!view || update.revision !== view.revision + 1) return false
    if (update.type === 'reasoning') {
      const message = view.messages.find(
        (item) => item.id === update.messageId && item.role === 'assistant',
      )
      if (!message || !appendReasoning(message, update.toolCallId, update.block)) return false
      view.revision = update.revision
      return true
    }
    if (update.type === 'tool') {
      const message = view.messages.find((item) => item.id === update.messageId)
      if (!message || message.role !== 'assistant') return false
      message.toolCalls ??= []
      const index = message.toolCalls.findIndex((tool) => tool.id === update.tool.id)
      if (index < 0) message.toolCalls.push(update.tool)
      else message.toolCalls[index] = update.tool
      view.revision = update.revision
      return true
    }
    const message = view.messages.find(
      (item) => item.id === update.messageId && item.runId === update.runId,
    )
    if (!message || view.runId !== update.runId) return false
    message.content += update.delta
    view.revision = update.revision
    return true
  }

  function drainUpdates() {
    const pending = buffered
    buffered = []
    for (const update of pending) if (!applyUpdate(update)) buffered.push(update)
  }

  async function synchronize(current: number) {
    if (syncing || connectionState.value !== 'connected') return
    syncing = true
    try {
      const snapshot = await transport.snapshot()
      if (current !== generation) return
      installSnapshot(snapshot)
      drainUpdates()
      if (buffered.length) throw new Error('用户数据版本不连续，请重新连接')
    } catch (error) {
      if (current === generation) {
        connectionError.value = messageError(error)
        // 无法建立连续基线时重新绑定，避免继续展示不完整的增量。
        void connect()
      }
    } finally {
      if (current === generation) syncing = false
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    const delay = [1000, 2000, 5000, 10000][Math.min(reconnectAttempt++, 3)]!
    reconnectTimer = setTimeout(() => {
      void connect()
    }, delay)
  }

  function releaseConnection() {
    clearTimeout(reconnectTimer)
    unsubscribe?.()
    unsubscribe = null
    generation++
    baselineReady = false
    buffered = []
    syncing = false
    pendingSends.value.clear()
    if (localDraft.value) localDraft.value.sending = false
    transport.close()
  }

  async function connect(name = username.value) {
    let normalized: string
    try {
      normalized = normalizeUsername(name)
    } catch (error) {
      connectionError.value = messageError(error)
      return
    }
    releaseConnection()
    if (normalized !== username.value) {
      sessionViews.value.clear()
      selection.value = null
      localDraft.value = null
      userId.value = ''
    }
    username.value = normalized
    const current = generation
    connectionState.value = 'connecting'
    connectionError.value = ''
    const stopUpdates = transport.subscribeUpdates((update) => {
      if (current !== generation) return
      if (!baselineReady || syncing) buffered.push(update)
      else if (!applyUpdate(update)) {
        buffered.push(update)
        void synchronize(current)
      }
    })
    let connectionFailure: Error | null = null
    const stopConnection = transport.subscribeConnection(({ state, error }) => {
      if (current !== generation) return
      const wasConnecting = connectionState.value === 'connecting'
      connectionFailure = error
      connectionState.value = state
      connectionError.value = messageError(error)
      pendingSends.value.clear()
      if (localDraft.value) localDraft.value.sending = false
      if (!wasConnecting) scheduleReconnect()
    })
    unsubscribe = () => {
      stopUpdates()
      stopConnection()
    }
    try {
      const snapshot = await transport.connect(normalized)
      if (current !== generation) return
      if (connectionFailure) throw connectionFailure
      installSnapshot(snapshot)
      baselineReady = true
      drainUpdates()
      connectionState.value = 'connected'
      connectionError.value = ''
      reconnectAttempt = 0
      saveUsername(normalized)
      if (buffered.length) void synchronize(current)
    } catch (error) {
      if (current !== generation) return
      connectionState.value = 'error'
      connectionError.value = messageError(error)
      scheduleReconnect()
    }
  }

  function disconnect() {
    releaseConnection()
    connectionState.value = 'offline'
  }

  function switchUser() {
    disconnect()
    username.value = ''
    userId.value = ''
    saveUsername('')
    sessionViews.value.clear()
    selection.value = null
    localDraft.value = null
    connectionError.value = ''
  }

  function selectSession(sessionId: string): Promise<boolean> {
    if (!sessionViews.value.has(sessionId)) return Promise.resolve(false)
    selection.value = { kind: 'session', sessionId }
    saveSelectedSession(username.value, sessionId)
    return Promise.resolve(true)
  }

  function selectLocalDraft() {
    localDraft.value ??= {
      id: crypto.randomUUID(),
      text: '',
      modelId: state.defaultModelId,
      error: '',
      sending: false,
    }
    selection.value = { kind: 'draft', draftId: localDraft.value.id }
  }

  function createSession(): Promise<boolean> {
    if (!canOperateSessions.value) return Promise.resolve(false)
    selectLocalDraft()
    return Promise.resolve(true)
  }

  function startMessage(text: string, retryRunId?: string): boolean {
    if (!canSend.value) return false
    const source = selection.value
    const view = activeView.value
    const draftSession = source?.kind === 'draft' ? localDraft.value : null
    if (!source || (!view && !draftSession)) return false
    const current = generation
    const originalDraft = draftSession?.text ?? view!.draft
    if (draftSession) {
      draftSession.sending = true
      draftSession.error = ''
    } else {
      pendingSends.value.add(view!.id)
      view!.error = ''
    }
    void (async () => {
      try {
        const session = await transport.sendMessage(
          source.kind === 'draft'
            ? { text, modelId: draftSession!.modelId }
            : { sessionId: source.sessionId, text, retryRunId },
        )
        if (current !== generation) return
        mergeSession(session)
        if (source.kind === 'draft') {
          if (localDraft.value?.id !== source.draftId) return
          if (selection.value?.kind === 'draft' && selection.value.draftId === source.draftId)
            await selectSession(session.id)
          localDraft.value = null
        } else {
          const latest = sessionViews.value.get(source.sessionId)
          if (!retryRunId && latest?.draft === originalDraft) latest.draft = ''
        }
      } catch (error) {
        if (current !== generation) return
        if (source.kind === 'draft') {
          if (localDraft.value?.id === source.draftId) localDraft.value.error = messageError(error)
        } else {
          const latest = sessionViews.value.get(source.sessionId)
          if (latest) latest.error = messageError(error)
        }
      } finally {
        if (current === generation) {
          if (source.kind === 'draft') {
            if (localDraft.value?.id === source.draftId) localDraft.value.sending = false
          } else pendingSends.value.delete(source.sessionId)
        }
      }
    })()
    return true
  }

  function sendMessage(text: string): boolean {
    const trimmed = text.trim()
    return !!trimmed && startMessage(trimmed)
  }
  function retryLastMessage() {
    const last = messages.value.at(-1)
    if (canRetry.value && last) startMessage('', last.runId)
  }

  async function cancelRun() {
    const view = activeView.value
    if (!view?.runId || view.cancelling || connectionState.value !== 'connected') return
    const current = generation
    try {
      await transport.cancelRun(view.id, view.runId)
    } catch (error) {
      if (current === generation) {
        const latest = sessionViews.value.get(view.id)
        if (latest) latest.error = messageError(error)
      }
    }
  }

  function dismissError() {
    if (selection.value?.kind === 'draft' && localDraft.value) localDraft.value.error = ''
    else if (activeView.value) activeView.value.error = ''
  }

  return {
    state,
    async attach() {
      if (username.value) await connect()
    },
    detach: disconnect,
    connect,
    disconnect,
    switchUser,
    async setExecution(mode) {
      if (mode !== 'cloud' || !transport.setExecution) return false
      const view = activeView.value
      if (!view) return selection.value?.kind === 'draft'
      const current = generation
      try {
        const session = await transport.setExecution(view.id)
        if (current !== generation) return false
        mergeSession(session)
        return true
      } catch (error) {
        if (current === generation) view.error = messageError(error)
        return false
      }
    },
    async setModel(modelId) {
      if (selection.value?.kind === 'draft') {
        if (!localDraft.value || localDraft.value.sending || connectionState.value !== 'connected')
          return false
        if (!state.models.some((model) => model.id === modelId)) return false
        localDraft.value.modelId = modelId
        return true
      }
      const view = activeView.value
      if (!view || connectionState.value !== 'connected') return false
      const current = generation
      try {
        const session = await transport.setModel(view.id, modelId)
        if (current !== generation) return false
        mergeSession(session)
        return true
      } catch (error) {
        if (current === generation) {
          const latest = sessionViews.value.get(view.id)
          if (latest) latest.error = messageError(error)
        }
        return false
      }
    },
    createSession,
    selectSession,
    sendMessage,
    retryLastMessage,
    cancelRun,
    dismissError,
    setDraft(value: string) {
      draft.value = value
    },
  }
}
