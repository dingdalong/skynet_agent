import { isTauri } from '@tauri-apps/api/core'
import type {
  ChatSessionView,
  ConnectionState,
  ModelOption,
  ConversationSelection,
  LocalDraftSession,
} from '../types/chat'
import { readUsername } from './user-preferences'
import { createBrowserChatRuntime } from './browser-chat-runtime'
import { createNativeChatRuntime } from './native-chat-runtime'

export interface ChatRuntimeState {
  desktops: import('../types/chat').DesktopDevice[]
  localDeviceId: string
  models: ModelOption[]
  username: string
  userId: string
  sessionViews: Map<string, ChatSessionView>
  selection: ConversationSelection
  localDraft: LocalDraftSession | null
  defaultModelId: string
  permissionModelId: string
  connectionState: ConnectionState
  connectionError: string
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
  setExecution?(mode: 'cloud' | 'local'): Promise<boolean | null>
  setRemote?(enabled: boolean): Promise<boolean>
  setModel(modelId: string): Promise<boolean>
  selectSession(sessionId: string): Promise<boolean>
  sendMessage(text: string): boolean
  retryLastMessage(): void
  cancelRun(): Promise<void>
  dismissError(): void
  setDraft(value: string): void
}

export function initialChatState(): ChatRuntimeState {
  return {
    desktops: [],
    localDeviceId: '',
    models: [],
    username: readUsername(),
    userId: '',
    sessionViews: new Map(),
    selection: null,
    localDraft: null,
    defaultModelId: '',
    permissionModelId: '',
    connectionState: 'idle',
    connectionError: '',
    pendingSends: new Set(),
  }
}

export function createChatRuntime(): ChatRuntime {
  if (isTauri() && import.meta.env.VITE_CHAT_TRANSPORT !== 'mock') return createNativeChatRuntime()
  return createBrowserChatRuntime()
}
