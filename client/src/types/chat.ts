export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'complete' | 'streaming' | 'cancelled' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  status: MessageStatus
  runId: string
  error: string
  retryable: boolean
}

export interface ChatSessionSummary {
  id: string
  title: string
  updatedAt: number
}

export interface ChatSession extends ChatSessionSummary {
  revision: number
  messages: ChatMessage[]
  runId: string
  cancelling: boolean
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'offline' | 'error'

export interface UserSnapshot {
  userId: string
  username: string
  sessions: ChatSession[]
}

export interface ChatSessionView extends ChatSession {
  draft: string
  error: string
}

export type ChatUpdate =
  | { type: 'session'; session: ChatSession }
  | {
      type: 'delta'
      sessionId: string
      runId: string
      messageId: string
      delta: string
      revision: number
    }

export interface TransportConnectionEvent {
  state: 'offline' | 'error'
  error: Error
}

export type TransportConnectionListener = (event: TransportConnectionEvent) => void

export interface ChatTransport {
  connect(username: string): Promise<UserSnapshot>
  snapshot(): Promise<UserSnapshot>
  createSession(): Promise<ChatSession>
  sendMessage(input: { sessionId: string; text: string; retryRunId?: string }): Promise<ChatSession>
  cancelRun(sessionId: string, runId: string): Promise<void>
  subscribeUpdates(listener: (update: ChatUpdate) => void): () => void
  subscribeConnection(listener: TransportConnectionListener): () => void
  close(): void
}
