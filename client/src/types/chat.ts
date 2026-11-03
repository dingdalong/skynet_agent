export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'complete' | 'streaming' | 'cancelled' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  status: MessageStatus
}

export interface ChatSessionSummary {
  id: string
  title: string
  updatedAt: number
}

export interface ChatSession {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'offline' | 'error'

export interface SessionSnapshot {
  sessions: ChatSessionSummary[]
  activeSessionId: string
  messages: ChatMessage[]
}

export interface SessionSelection {
  sessionId: string
  messages: ChatMessage[]
}

export type ReplyResult = { status: 'complete'; message: ChatMessage } | { status: 'cancelled' }

export interface StreamRequest {
  messageId: number
  completed: Promise<ReplyResult>
  cancel(): Promise<void>
}

export interface FailedReply {
  sessionId: string
  userMessageId: string
  assistantMessageId: string
  text: string
}

export interface ChatSessionView {
  messages: ChatMessage[]
  draft: string
  error: string
  retry: FailedReply | null
}

export interface TransportConnectionEvent {
  state: 'offline' | 'error'
  error: Error
}

export type TransportConnectionListener = (event: TransportConnectionEvent) => void

export interface ChatTransport {
  connect(): Promise<SessionSnapshot>
  createSession(): Promise<ChatSession>
  selectSession(sessionId: string): Promise<SessionSelection>
  sendMessage(
    input: { sessionId: string; text: string },
    onDelta: (delta: string) => void,
  ): StreamRequest
  subscribeConnection(listener: TransportConnectionListener): () => void
  close(): void
}
