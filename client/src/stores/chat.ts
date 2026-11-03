import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import { createChatTransport } from '../services/chat-transport'
import { ResponseError } from '../protocol/chat-mapper'
import type {
  ChatMessage,
  ChatSessionSummary,
  ChatSessionView,
  ChatTransport,
  ConnectionState,
  FailedReply,
  StreamRequest,
} from '../types/chat'

export const useChatStore = defineStore('chat', () => {
  let transport = markRaw(createChatTransport())
  let unsubscribe: (() => void) | null = null
  let generation = 0
  let sessionQueue = Promise.resolve(true)
  let activeRun: {
    request: StreamRequest | null
    assistant: ChatMessage
    view: ChatSessionView
  } | null = null

  const sessions = ref<ChatSessionSummary[]>([])
  const sessionViews = ref(new Map<string, ChatSessionView>())
  const activeSessionId = ref<string | null>(null)
  const connectionState = ref<ConnectionState>('idle')
  const connectionError = ref('')
  const runState = ref<'idle' | 'running' | 'cancelling'>('idle')
  const sessionOperations = ref(0)
  const activeSession = computed(
    () => sessions.value.find((item) => item.id === activeSessionId.value) ?? null,
  )
  const activeView = computed(() => sessionViews.value.get(activeSessionId.value ?? ''))
  const messages = computed(() => activeView.value?.messages ?? [])
  const draft = computed({
    get: () => activeView.value?.draft ?? '',
    set: (value: string) => {
      if (activeView.value) activeView.value.draft = value
    },
  })
  const errorMessage = computed(() => connectionError.value || activeView.value?.error || '')
  const sessionBusy = computed(() => sessionOperations.value > 0)
  const canOperateSessions = computed(
    () => connectionState.value === 'connected' && runState.value === 'idle' && !sessionBusy.value,
  )
  const canSend = computed(() => canOperateSessions.value && activeView.value !== undefined)
  const retryAvailable = computed(
    () => connectionState.value === 'connected' && activeView.value?.retry != null,
  )
  const canRetry = computed(() => retryAvailable.value && canSend.value)

  function messageError(error: unknown): string {
    return error instanceof Error ? error.message : 'Agent 请求失败'
  }

  function cacheSession(sessionId: string, history: ChatMessage[]) {
    sessionViews.value.set(sessionId, { messages: history, draft: '', error: '', retry: null })
  }

  function stopLocalRun() {
    if (activeRun) activeRun.assistant.status = 'error'
    activeRun = null
    runState.value = 'idle'
  }

  function resetOperations() {
    generation++
    stopLocalRun()
    sessionQueue = Promise.resolve(true)
    sessionOperations.value = 0
  }

  function setTransport(nextTransport: ChatTransport) {
    unsubscribe?.()
    unsubscribe = null
    resetOperations()
    transport.close()
    transport = markRaw(nextTransport)
    connectionState.value = 'idle'
    connectionError.value = ''
    sessions.value = []
    sessionViews.value.clear()
    activeSessionId.value = null
  }

  async function connect() {
    unsubscribe?.()
    resetOperations()
    const current = generation
    sessions.value = []
    sessionViews.value.clear()
    activeSessionId.value = null
    connectionState.value = 'connecting'
    connectionError.value = ''
    unsubscribe = transport.subscribeConnection(({ state, error }) => {
      if (current !== generation || (state === 'offline' && connectionState.value === 'connecting'))
        return
      connectionState.value = state
      connectionError.value = messageError(error)
      resetOperations()
    })
    try {
      const snapshot = await transport.connect()
      if (current !== generation) return
      sessions.value = snapshot.sessions
      cacheSession(snapshot.activeSessionId, snapshot.messages)
      activeSessionId.value = snapshot.activeSessionId
      connectionState.value = 'connected'
    } catch (error) {
      if (current !== generation) return
      connectionState.value = 'error'
      connectionError.value = messageError(error)
    }
  }

  function disconnect() {
    unsubscribe?.()
    unsubscribe = null
    resetOperations()
    transport.close()
    connectionState.value = 'offline'
  }

  function queueSessionOperation(operation: () => Promise<void>): Promise<boolean> {
    if (connectionState.value !== 'connected' || runState.value !== 'idle')
      return Promise.resolve(false)
    const current = generation
    sessionOperations.value++
    const next = sessionQueue
      .then(async () => {
        if (current !== generation) return false
        try {
          await operation()
          return current === generation
        } catch (error) {
          if (current === generation && activeView.value)
            activeView.value.error = messageError(error)
          return false
        }
      })
      .finally(() => {
        if (current === generation) sessionOperations.value--
      })
    sessionQueue = next
    return next
  }

  function createSession(): Promise<boolean> {
    const current = generation
    return queueSessionOperation(async () => {
      // 在队列执行时判断，连续点击也会复用前一次操作得到的空会话。
      if (activeView.value?.messages.length === 0) return
      const emptySession = sessions.value.find(
        (session) => sessionViews.value.get(session.id)?.messages.length === 0,
      )
      if (emptySession) {
        await activateSession(emptySession.id, current)
        return
      }
      const session = await transport.createSession()
      if (current !== generation) return
      const { messages: history, ...summary } = session
      sessions.value = [summary, ...sessions.value.filter((item) => item.id !== session.id)]
      cacheSession(session.id, history)
      activeSessionId.value = session.id
    })
  }

  function selectSession(sessionId: string): Promise<boolean> {
    const current = generation
    return queueSessionOperation(() => activateSession(sessionId, current))
  }

  async function activateSession(sessionId: string, current: number) {
    if (sessionId === activeSessionId.value) return
    const session = await transport.selectSession(sessionId)
    if (current !== generation) return
    // 一个连接独占自己的会话，服务端确认切换后保留本地失败、取消和草稿展示。
    if (!sessionViews.value.has(sessionId)) cacheSession(sessionId, session.messages)
    activeSessionId.value = session.sessionId
  }

  function startMessage(text: string, retry: FailedReply | null = null): boolean {
    const view = activeView.value
    const sessionId = activeSessionId.value
    if (!canSend.value || !view || !sessionId) return false
    if (
      retry &&
      (retry.sessionId !== sessionId ||
        !view.messages.some((message) => message.id === retry.userMessageId))
    )
      return false

    const current = generation
    const previousError = view.error
    const previousRetry = view.retry
    const createdAt = Date.now()
    const userMessageId = retry?.userMessageId ?? crypto.randomUUID()
    const assistant: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt,
      status: 'streaming',
    }
    const retryIndex = retry
      ? view.messages.findIndex((message) => message.id === retry.assistantMessageId)
      : -1
    if (retry && retryIndex < 0) return false
    const previousAssistant = retryIndex >= 0 ? view.messages[retryIndex]! : null
    if (retryIndex >= 0) view.messages[retryIndex] = assistant
    else {
      view.messages.push(
        { id: userMessageId, role: 'user', content: text, createdAt, status: 'complete' },
        assistant,
      )
    }
    const assistantIndex = retryIndex >= 0 ? retryIndex : view.messages.length - 1
    // 必须先登记，sendMessage 可能同步触发连接终止回调。
    const run = {
      request: null as StreamRequest | null,
      assistant: view.messages[assistantIndex]!,
      view,
    }
    activeRun = run
    runState.value = 'running'
    view.error = ''
    view.retry = null

    const rollback = () => {
      if (previousAssistant) view.messages[assistantIndex] = previousAssistant
      else view.messages.splice(assistantIndex - 1, 2)
      view.retry = previousRetry
      if (!view.error) view.error = previousError
      if (activeRun === run) {
        activeRun = null
        runState.value = 'idle'
      }
    }

    try {
      const request = transport.sendMessage({ sessionId, text }, (delta) => {
        if (current === generation && activeRun === run && run.assistant.status === 'streaming')
          run.assistant.content += delta
      })
      run.request = request
      void request.completed
        .then((result) => {
          if (current !== generation || activeRun !== run) return
          if (result.status === 'complete') view.messages[assistantIndex] = result.message
          else run.assistant.status = 'cancelled'
          view.error = ''
          activeRun = null
          runState.value = 'idle'
        })
        .catch((error: unknown) => {
          if (current !== generation || activeRun !== run) return
          view.error = messageError(error)
          if (!(error instanceof ResponseError) || error.retryable)
            view.retry = { sessionId, userMessageId, assistantMessageId: assistant.id, text }
          stopLocalRun()
        })
      if (current !== generation || activeRun !== run) {
        rollback()
        return false
      }
      if (activeSession.value?.title === '新的会话')
        activeSession.value.title = text.length > 24 ? `${text.slice(0, 24)}…` : text
      if (activeSession.value) activeSession.value.updatedAt = createdAt
      return true
    } catch (error) {
      rollback()
      if (current === generation) view.error = messageError(error)
      return false
    }
  }

  function sendMessage(text: string): boolean {
    const trimmed = text.trim()
    if (!trimmed || !startMessage(trimmed)) return false
    draft.value = ''
    return true
  }

  function retryLastMessage() {
    const retry = activeView.value?.retry
    if (canRetry.value && retry) startMessage(retry.text, retry)
  }

  async function cancelRun() {
    const run = activeRun
    if (!run?.request || runState.value === 'cancelling') return
    runState.value = 'cancelling'
    try {
      await run.request.cancel()
    } catch (error) {
      if (activeRun !== run) return
      run.view.error = messageError(error)
      runState.value = 'running'
    }
  }

  function dismissError() {
    if (activeView.value) activeView.value.error = ''
  }

  return {
    sessions,
    sessionViews,
    activeSessionId,
    activeSession,
    messages,
    draft,
    connectionState,
    connectionError,
    runState,
    sessionOperations,
    sessionBusy,
    errorMessage,
    retryAvailable,
    canRetry,
    canOperateSessions,
    canSend,
    connect,
    disconnect,
    createSession,
    selectSession,
    sendMessage,
    retryLastMessage,
    cancelRun,
    dismissError,
    setTransport,
  }
})
