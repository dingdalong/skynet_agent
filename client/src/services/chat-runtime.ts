import { isTauri } from '@tauri-apps/api/core'
import type { ChatSessionView, ConnectionState } from '../types/chat'
import { readUsername } from './user-preferences'
import { createBrowserChatRuntime } from './browser-chat-runtime'
import { createNativeChatRuntime } from './native-chat-runtime'

export interface ChatRuntimeState {
  username: string
  userId: string
  sessionViews: Map<string, ChatSessionView>
  activeSessionId: string | null
  connectionState: ConnectionState
  connectionError: string
  sessionOperations: number
  pendingSends: Set<string>
}

export interface ChatRuntime {
  readonly state: ChatRuntimeState
  attach(): Promise<void>
  detach(): void
  connect(username: string): Promise<void>
  disconnect(): void
  switchUser(): void
  createSession(): Promise<boolean>
  selectSession(sessionId: string): Promise<boolean>
  sendMessage(text: string): boolean
  retryLastMessage(): void
  cancelRun(): Promise<void>
  dismissError(): void
  setDraft(value: string): void
}

export function initialChatState(): ChatRuntimeState {
  return {
    username: readUsername(),
    userId: '',
    sessionViews: new Map(),
    activeSessionId: null,
    connectionState: 'idle',
    connectionError: '',
    sessionOperations: 0,
    pendingSends: new Set(),
  }
}

export function createChatRuntime(): ChatRuntime {
  if (isTauri() && import.meta.env.VITE_CHAT_TRANSPORT !== 'mock') return createNativeChatRuntime()
  return createBrowserChatRuntime()
}
