import { ChatClient } from './chat-client'
import { MockAgentChannel } from './mock-agent-channel'
import type { ChatTransport } from '../types/chat'

export function createChatTransport(): ChatTransport {
  const mode = import.meta.env.VITE_CHAT_TRANSPORT ?? 'websocket'
  if (mode === 'mock') return new ChatClient(new MockAgentChannel())
  if (mode === 'websocket') return new ChatClient()
  throw new Error(`不支持的聊天传输模式: ${String(mode)}`)
}
