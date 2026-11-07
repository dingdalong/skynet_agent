import { computed, reactive, toRefs } from 'vue'
import { initialChatState, type ChatRuntime } from './chat-runtime'
import { createChatTransport } from './chat-transport'
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
    activeSessionId,
    connectionState,
    connectionError,
    sessionOperations,
    pendingSends,
  } = toRefs(state)
  const sessions = computed(() =>
    [...sessionViews.value.values()].sort(
      (a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id),
    ),
  )
  const activeView = computed(() => sessionViews.value.get(activeSessionId.value ?? ''))
  const messages = computed(() => activeView.value?.messages ?? [])
  const draft = computed({
    get: () => activeView.value?.draft ?? '',
    set: (value: string) => {
      if (activeView.value) activeView.value.draft = value
    },
  })
  const runState = computed<'idle' | 'running' | 'cancelling'>(() => {
    if (activeView.value?.cancelling) return 'cancelling'
    return activeView.value?.runId || pendingSends.value.has(activeSessionId.value ?? '')
      ? 'running'
      : 'idle'
  })
  const sessionBusy = computed(() => sessionOperations.value > 0)
  const canOperateSessions = computed(
    () => connectionState.value === 'connected' && !sessionBusy.value,
  )
  const canSend = computed(
    () => canOperateSessions.value && runState.value === 'idle' && !!activeView.value,
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
      activeSessionId.value = null
      userId.value = snapshot.userId
    }
    for (const session of snapshot.sessions) mergeSession(session)
    if (!activeSessionId.value || !sessionViews.value.has(activeSessionId.value)) {
      const selected = readSelectedSession(username.value)
      activeSessionId.value = sessionViews.value.has(selected) ? selected : sessions.value[0]!.id
    }
  }

  function applyUpdate(update: ChatUpdate): boolean {
    if (update.type === 'session') {
      mergeSession(update.session)
      return true
    }
    const view = sessionViews.value.get(update.sessionId)
    if (view && update.revision <= view.revision) return true
    if (!view || update.revision !== view.revision + 1) return false
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
    sessionOperations.value = 0
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
      activeSessionId.value = null
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
    activeSessionId.value = null
    connectionError.value = ''
  }

  function selectSession(sessionId: string): Promise<boolean> {
    if (!sessionViews.value.has(sessionId)) return Promise.resolve(false)
    activeSessionId.value = sessionId
    saveSelectedSession(username.value, sessionId)
    return Promise.resolve(true)
  }

  async function createSession(): Promise<boolean> {
    if (!canOperateSessions.value) return false
    const empty = sessions.value.find((item) => item.messages.length === 0)
    if (empty) return selectSession(empty.id)
    const current = generation
    sessionOperations.value++
    try {
      const session = await transport.createSession()
      if (current !== generation) return false
      mergeSession(session)
      await selectSession(session.id)
      return true
    } catch (error) {
      if (current === generation && activeView.value) activeView.value.error = messageError(error)
      return false
    } finally {
      if (current === generation) sessionOperations.value--
    }
  }

  function startMessage(text: string, retryRunId?: string): boolean {
    const view = activeView.value
    if (!canSend.value || !view) return false
    const current = generation
    const originalDraft = view.draft
    pendingSends.value.add(view.id)
    view.error = ''
    void (async () => {
      try {
        const session = await transport.sendMessage({ sessionId: view.id, text, retryRunId })
        if (current !== generation) return
        mergeSession(session)
        const latest = sessionViews.value.get(view.id)
        if (!retryRunId && latest?.draft === originalDraft) latest.draft = ''
      } catch (error) {
        if (current === generation) {
          const latest = sessionViews.value.get(view.id)
          if (latest) latest.error = messageError(error)
        }
      } finally {
        if (current === generation) pendingSends.value.delete(view.id)
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
    if (activeView.value) activeView.value.error = ''
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
