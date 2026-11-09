import { Channel, invoke } from '@tauri-apps/api/core'
import { reactive } from 'vue'
import type {
  ChatSessionView,
  ChatUpdate,
  ConversationSelection,
  LocalDraftSession,
} from '../types/chat'
import { initialChatState, type ChatRuntime } from './chat-runtime'
import { normalizeUsername, saveUsername } from './user-preferences'
import { appendReasoning } from '../protocol/reasoning'
import type { ModelOption } from '../types/chat'

export interface NativeChatState {
  desktops?: import('../types/chat').DesktopDevice[]
  localDeviceId?: string
  models?: ModelOption[]
  username: string
  userId: string
  sessions: ChatSessionView[]
  selection: ConversationSelection
  localDraft: LocalDraftSession | null
  defaultModelId: string
  permissionModelId: string
  connectionState: 'idle' | 'connecting' | 'connected' | 'offline' | 'error'
  connectionError: string
  pendingSends: string[]
}
export type NativeChatEvent =
  | { type: 'reasoning'; update: Extract<ChatUpdate, { type: 'reasoning' }> }
  | { type: 'state'; state: NativeChatState }
  | { type: 'delta'; update: Extract<ChatUpdate, { type: 'delta' }> }

type Action =
  | { type: 'setExecution'; target: ConversationSelection; directory: string | null }
  | { type: 'setRemote'; enabled: boolean }
  | { type: 'setModel'; modelId: string }
  | { type: 'connect'; username: string }
  | { type: 'disconnect' | 'switchUser' | 'dismissError' | 'retryLastMessage' }
  | { type: 'createSession'; draftId?: string }
  | { type: 'selectSession'; sessionId: string }
  | { type: 'sendMessage'; text: string }
  | { type: 'cancelRun' }
  | { type: 'setDraft'; target: ConversationSelection; value: string }

export function createNativeChatRuntime(): ChatRuntime {
  const state = reactive(initialChatState())
  let attaching: Promise<void> | null = null
  let subscription: string | null = null
  let generation = 0
  let stateRevision = 0
  const pendingDrafts = new Map<string, string>()
  let pendingSelection: ConversationSelection | undefined
  let pendingLocalDraft: { id: string; text: string } | null = null
  let pendingDraftSend: { draftId: string } | null = null

  function sameSelection(a: ConversationSelection | undefined, b: ConversationSelection) {
    if (a == null || b == null) return a === b
    return a.kind === 'draft'
      ? b.kind === 'draft' && a.draftId === b.draftId
      : b.kind === 'session' && a.sessionId === b.sessionId
  }

  function receive(event: NativeChatEvent) {
    stateRevision++
    if (event.type === 'state') {
      const next = event.state
      if (next.username !== state.username || next.userId !== state.userId) {
        pendingDrafts.clear()
        pendingSelection = undefined
        pendingLocalDraft = null
        pendingDraftSend = null
      }
      const { sessions, pendingSends, ...rest } = next
      for (const session of sessions) {
        const pending = pendingDrafts.get(session.id)
        if (pending === undefined) continue
        if (session.draft === pending) pendingDrafts.delete(session.id)
        else session.draft = pending
      }
      if (pendingLocalDraft) {
        if (
          !rest.localDraft ||
          rest.localDraft.id !== pendingLocalDraft.id ||
          rest.localDraft.text === pendingLocalDraft.text
        )
          pendingLocalDraft = null
        else rest.localDraft.text = pendingLocalDraft.text
      }
      if (pendingDraftSend) {
        if (
          rest.connectionState !== 'connected' ||
          rest.localDraft?.id !== pendingDraftSend.draftId ||
          rest.localDraft.sending
        )
          pendingDraftSend = null
        else rest.localDraft.sending = true
      }
      if (
        sameSelection(pendingSelection, rest.selection) ||
        (pendingSelection?.kind === 'draft' && rest.localDraft?.id !== pendingSelection.draftId)
      )
        pendingSelection = undefined
      Object.assign(state, rest, {
        models: next.models ?? [],
        selection: pendingSelection === undefined ? rest.selection : pendingSelection,
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
        state.pendingSends.clear()
        if (state.localDraft) state.localDraft.sending = false
        pendingDraftSend = null
      }
      return false
    }
  }
  function active() {
    return state.selection?.kind === 'session'
      ? state.sessionViews.get(state.selection.sessionId)
      : undefined
  }
  function canSend() {
    return (
      state.connectionState === 'connected' &&
      (state.selection?.kind === 'draft'
        ? !!state.localDraft && !state.localDraft.sending
        : !!active() && !active()!.runId && !state.pendingSends.has(active()!.id))
    )
  }
  return {
    state,
    attach,
    detach() {
      generation++
      pendingSelection = undefined
      pendingLocalDraft = null
      pendingDraftSend = null
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
      if (state.connectionState !== 'connected') return false
      const previous = state.selection
      const draftId = state.localDraft?.id
      const issuedAt = stateRevision
      if (draftId) {
        pendingSelection = { kind: 'draft', draftId }
        state.selection = pendingSelection
      }
      const accepted = await action(
        draftId ? { type: 'createSession', draftId } : { type: 'createSession' },
      )
      if (!accepted && pendingSelection?.kind === 'draft' && pendingSelection.draftId === draftId) {
        pendingSelection = undefined
        if (issuedAt === stateRevision) state.selection = previous
      }
      return accepted
    },
    async setExecution(mode) {
      const target = state.selection && { ...state.selection }
      if (!target) return false
      if (mode === 'cloud') return action({ type: 'setExecution', target, directory: null })
      const userId = state.userId
      const current = generation
      try {
        const directory = await invoke<string | null>('chat_choose_directory')
        if (!directory) return null
        if (
          current !== generation ||
          state.userId !== userId ||
          !sameSelection(target, state.selection)
        )
          return false
        return action({ type: 'setExecution', target, directory })
      } catch (error) {
        state.connectionError = String(error)
        return false
      }
    },
    async setRemote(enabled) {
      return action({ type: 'setRemote', enabled })
    },
    async setModel(modelId) {
      if (state.selection?.kind === 'draft' && state.localDraft?.sending) return false
      return action({ type: 'setModel', modelId })
    },
    async selectSession(sessionId) {
      if (!state.sessionViews.has(sessionId)) return false
      pendingSelection = { kind: 'session', sessionId }
      state.selection = pendingSelection
      return action({ type: 'selectSession', sessionId })
    },
    sendMessage(text) {
      if (!text.trim() || !canSend()) return false
      const draftId = state.selection?.kind === 'draft' ? state.localDraft?.id : undefined
      const current = generation
      const optimistic = draftId ? { draftId } : null
      if (optimistic && state.localDraft) {
        state.localDraft.sending = true
        pendingDraftSend = optimistic
      } else if (active()) state.pendingSends.add(active()!.id)
      void action({ type: 'sendMessage', text: text.trim() }).then((accepted) => {
        if (!accepted && current === generation && optimistic && pendingDraftSend === optimistic) {
          pendingDraftSend = null
          if (state.localDraft?.id === optimistic.draftId) state.localDraft.sending = false
        }
      })
      return true
    },
    retryLastMessage() {
      if (active() && canSend()) void action({ type: 'retryLastMessage' })
    },
    async cancelRun() {
      await action({ type: 'cancelRun' })
    },
    dismissError() {
      void action({ type: 'dismissError' })
    },
    setDraft(value) {
      const target = state.selection
      if (target?.kind === 'draft') {
        if (!state.localDraft || state.localDraft.sending) return
        state.localDraft.text = value
        pendingLocalDraft = { id: state.localDraft.id, text: value }
      } else {
        const session = active()
        if (!session) return
        session.draft = value
        pendingDrafts.set(session.id, value)
      }
      void action({ type: 'setDraft', target, value })
    },
  }
}
