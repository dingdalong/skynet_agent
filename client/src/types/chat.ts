export interface ExecutionTarget {
  deviceId: string
  workspaceId: string
  directory: string
  platform: string
}
export interface DesktopDevice {
  id: string
  name: string
  online: boolean
  remoteEnabled: boolean
}
export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'complete' | 'streaming' | 'cancelled' | 'error'

export interface ModelOption {
  id: string
  name: string
  model: string
}

export interface ReasoningBlock {
  id: string
  runId: string
  modelId: string
  text: string
  status: 'streaming' | 'completed' | 'cancelled' | 'failed'
}

export interface ToolCall {
  id: string
  name: string
  arguments: string
  status: 'judging' | 'running' | 'denied' | 'completed' | 'failed' | 'cancelled'
  permissionReason: string
  permissionMode: string
  output: string
  exitCode?: number
  truncated: boolean
  changedFiles: string[]
  error: string
  processId: string
  runId: string
  workingDirectory: string
  reasoning?: ReasoningBlock[]
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  status: MessageStatus
  runId: string
  error: string
  retryable: boolean
  toolCalls?: ToolCall[]
  reasoning?: ReasoningBlock[]
}

export interface ChatSessionSummary {
  id: string
  title: string
  updatedAt: number
}

export interface ChatSession extends ChatSessionSummary {
  executionTarget?: ExecutionTarget | null
  revision: number
  messages: ChatMessage[]
  runId: string
  cancelling: boolean
  modelId?: string
  permissionModelId?: string
}

export type ConversationSelection =
  { kind: 'draft'; draftId: string } | { kind: 'session'; sessionId: string } | null

export interface LocalDraftSession {
  executionTarget?: ExecutionTarget | null
  id: string
  text: string
  modelId: string
  error: string
  sending: boolean
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'offline' | 'error'

export interface UserSnapshot {
  desktops?: DesktopDevice[]
  userId: string
  username: string
  chatSessions: ChatSession[]
  models?: ModelOption[]
  defaultModelId: string
  permissionModelId: string
}

export interface ChatSessionView extends ChatSession {
  draft: string
  error: string
}

export type ChatUpdate =
  | { type: 'desktop'; device: DesktopDevice }
  | {
      type: 'reasoning'
      sessionId: string
      messageId: string
      toolCallId: string
      block: ReasoningBlock
      revision: number
    }
  | { type: 'session'; session: ChatSession }
  | { type: 'tool'; sessionId: string; messageId: string; tool: ToolCall; revision: number }
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
  setExecution?(sessionId: string): Promise<ChatSession>
  setModel(sessionId: string, modelId: string): Promise<ChatSession>
  sendMessage(input: {
    sessionId?: string
    text: string
    retryRunId?: string
    modelId?: string
  }): Promise<ChatSession>
  cancelRun(sessionId: string, runId: string): Promise<void>
  subscribeUpdates(listener: (update: ChatUpdate) => void): () => void
  subscribeConnection(listener: TransportConnectionListener): () => void
  close(): void
}
