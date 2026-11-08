import { Channel, invoke } from '@tauri-apps/api/core'
import { reactive } from 'vue'
import type { ChatSessionView, ChatUpdate } from '../types/chat'
import { initialChatState, type ChatRuntime } from './chat-runtime'
import { normalizeUsername, saveUsername } from './user-preferences'
import { appendReasoning } from '../protocol/reasoning'
import type { ModelOption } from '../types/chat'

export interface NativeChatState {
  models?: ModelOption[]
  username: string
  userId: string
  sessions: ChatSessionView[]
  activeSessionId: string | null
  connectionState: 'idle' | 'connecting' | 'connected' | 'offline' | 'error'
  connectionError: string
  sessionOperations: number
  pendingSends: string[]
}
export type NativeChatEvent =
  | { type: 'reasoning'; update: Extract<ChatUpdate, { type: 'reasoning' }> }
  | { type: 'state'; state: NativeChatState }
  | { type: 'delta'; update: Extract<ChatUpdate, { type: 'delta' }> }

type Action =
  | { type: 'setModel'; modelId: string }
  | { type: 'connect'; username: string }
  | { type: 'disconnect' | 'switchUser' | 'createSession' | 'dismissError' | 'retryLastMessage' }
  | { type: 'selectSession'; sessionId: string }
  | { type: 'sendMessage'; text: string }
  | { type: 'cancelRun' }
  | { type: 'setDraft'; sessionId: string; value: string }

export function createNativeChatRuntime(): ChatRuntime {
  const state = reactive(initialChatState())
  let attaching: Promise<void> | null = null
  let subscription: string | null = null
  let generation = 0
  let stateRevision = 0
  const pendingDrafts = new Map<string, string>()
  let pendingSelection: string | null = null

  function receive(event: NativeChatEvent) {
    stateRevision++
    if (event.type === 'state') {
      const next = event.state
      if (next.username !== state.username || next.userId !== state.userId) {
        pendingDrafts.clear()
        pendingSelection = null
      }
      const { sessions, pendingSends, ...rest } = next
      for (const session of sessions) {
        const pending = pendingDrafts.get(session.id)
        if (pending === undefined) continue
        if (session.draft === pending) pendingDrafts.delete(session.id)
        else session.draft = pending
      }
      if (pendingSelection === rest.activeSessionId) pendingSelection = null
      Object.assign(state, rest, {
        models: next.models ?? [],
        activeSessionId: pendingSelection ?? rest.activeSessionId,
        sessionViews: new Map(sessions.map((session) => [session.id, session])),
        pendingSends: new Set(pendingSends),
      })
      if (next.userId) saveUsername(next.username)
      else if (!next.username) saveUsername('')
      return
    }
    // Native 核心已完成版本校验；这里只更新当前界面的投影。
    const update = event.update
    const session = state.sessionViews.get(update.sessionId)
    const message = session?.messages.find((item) => item.id === update.messageId)
    if (session && message) {
      if (update.type === 'reasoning') appendReasoning(message, update.toolCallId, update.block)
      else message.content += update.delta
      session.revision = update.revision
    }
  }

  async function attach() {
    if (attaching) return attaching
    const current = ++generation
    const channel = new Channel<NativeChatEvent>()
    channel.onmessage = (event) => {
      if (current === generation) receive(event)
    }
    attaching = invoke<string>('chat_attach', { preferredUsername: state.username, channel })
      .then((id) => {
        if (current === generation) subscription = id
        else
          void invoke('chat_detach', { subscription: id }).catch((error) =>
            console.error('[NativeChatRuntime.detach]', error),
          )
      })
      .catch((error: unknown) => {
        if (current === generation) {
          attaching = null
          state.connectionState = 'error'
          state.connectionError = String(error)
        }
        console.error('[NativeChatRuntime.attach]', error)
      })
    return attaching
  }

  async function action(value: Action): Promise<boolean> {
    await attach()
    if (!subscription) return false
    const current = generation
    const issuedAt = stateRevision
    try {
      return await invoke<boolean>('chat_action', { subscription, action: value })
    } catch (error) {
      console.error('[NativeChatRuntime.action]', value.type, error)
      if (current === generation && issuedAt === stateRevision) {
        state.connectionError = String(error)
        state.sessionOperations = 0
        state.pendingSends.clear()
      }
      return false
    }
  }
  function active() {
    return state.sessionViews.get(state.activeSessionId ?? '')
  }
  function canSend() {
    return (
      state.connectionState === 'connected' &&
      state.sessionOperations === 0 &&
      !!active() &&
      !active()!.runId &&
      !state.pendingSends.has(state.activeSessionId ?? '')
    )
  }
  return {
    state,
    attach,
    detach() {
      generation++
      const id = subscription
      subscription = null
      attaching = null
      if (id)
        void invoke('chat_detach', { subscription: id }).catch((error) =>
          console.error('[NativeChatRuntime.detach]', error),
        )
    },
    async connect(username) {
      try {
        await action({ type: 'connect', username: normalizeUsername(username) })
      } catch (error) {
        state.connectionError = String(error instanceof Error ? error.message : error)
      }
    },
    disconnect() {
      void action({ type: 'disconnect' })
    },
    switchUser() {
      void action({ type: 'switchUser' })
    },
    async createSession() {
      if (state.connectionState !== 'connected' || state.sessionOperations > 0) return false
      state.sessionOperations++
      return action({ type: 'createSession' })
    },
    async setModel(modelId) {
      return action({ type: 'setModel', modelId })
    },
    async selectSession(sessionId) {
      if (!state.sessionViews.has(sessionId)) return false
      pendingSelection = sessionId
      state.activeSessionId = sessionId
      return action({ type: 'selectSession', sessionId })
    },
    sendMessage(text) {
      if (!text.trim() || !canSend()) return false
      state.pendingSends.add(state.activeSessionId!)
      void action({ type: 'sendMessage', text: text.trim() })
      return true
    },
    retryLastMessage() {
      if (canSend()) void action({ type: 'retryLastMessage' })
    },
    async cancelRun() {
      await action({ type: 'cancelRun' })
    },
    dismissError() {
      void action({ type: 'dismissError' })
    },
    setDraft(value) {
      const session = active()
      if (!session) return
      session.draft = value
      pendingDrafts.set(session.id, value)
      void action({ type: 'setDraft', sessionId: session.id, value })
    },
  }
}
