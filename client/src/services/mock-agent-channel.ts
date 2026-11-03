import type { ChatSessionSummary } from '../types/chat'
import type { ServerMessage } from '../protocol/messages'
import type { BinaryChannel, BinaryFrame } from '../network/websocket-channel'
import { decodeMessage, encodeMessage } from '../protocol/agent-gateway-codec'
import { skynet } from '../protocol/generated/agent_gateway.js'
import { errorCode } from '../protocol/error-code'

const { MessageRole, MessageStatus } = skynet.agent.v1
const now = () => Date.now()

export class MockAgentChannel implements BinaryChannel {
  private onMessage: ((frame: BinaryFrame) => void) | null = null
  private generation = 0
  private sessions: ChatSessionSummary[] = []
  private activeSessionId = ''
  private messages = new Map<string, skynet.agent.v1.ChatMessage.$Properties[]>()
  private timers = new Map<number, { timer: number; sessionId: string; userId: string }>()

  async open(onMessage: (frame: BinaryFrame) => void): Promise<void> {
    this.close()
    this.onMessage = onMessage
    this.sessions = []
    this.messages.clear()
    this.createSessionState()
  }

  send(frame: Uint8Array): void {
    const request = decodeMessage(frame)
    const args = request.payload as { sessionId: string; text: string; targetMessageId: number }
    switch (request.name) {
      case 'LoginReq':
        this.emit({
          name: 'LoginRes',
          messageId: request.messageId,
          payload: {
            ret: errorCode.succ,
            snapshot: {
              sessions: this.sessions,
              activeSessionId: this.activeSessionId,
              messages: this.currentMessages(),
            },
          },
        })
        return
      case 'SessionCreateReq':
        this.createSession(request.messageId)
        return
      case 'SessionSelectReq':
        this.selectSession(request.messageId, args.sessionId)
        return
      case 'MessageSendReq':
        this.sendMessage(request.messageId, args)
        return
      case 'MessageCancelReq':
        this.cancel(request.messageId, args.targetMessageId)
        return
      default:
        throw new Error('Mock 不支持的请求')
    }
  }

  private createSession(messageId: number): void {
    const session = this.createSessionState()
    this.emit({
      name: 'SessionCreateRes',
      messageId,
      payload: {
        ret: errorCode.succ,
        session,
        messages: [],
      },
    })
    return
  }

  private selectSession(messageId: number, sessionId: string): void {
    const session = this.sessions.find((item) => item.id === sessionId)
    if (!session) {
      this.emit({
        name: 'SessionSelectRes',
        messageId,
        payload: {
          ret: errorCode.fail,
          sessionId,
          error: {
            message: '会话不存在或已经失效',
            retryable: false,
          },
        },
      })
      return
    }

    this.activeSessionId = sessionId
    this.emit({
      name: 'SessionSelectRes',
      messageId,
      payload: {
        ret: errorCode.succ,
        sessionId,
        messages: this.currentMessages(),
      },
    })
    return
  }

  private sendMessage(messageId: number, input: { sessionId: string; text: string }): void {
    const userMessage = {
      id: crypto.randomUUID(),
      role: MessageRole.MESSAGE_ROLE_USER,
      content: input.text,
      createdAt: now(),
    }
    const history = this.messages.get(input.sessionId) ?? []
    this.messages.set(input.sessionId, [...history, userMessage])
    this.updateTitle(input.sessionId, input.text)

    const answer = `这是模拟的 Agent 回复，用于验证界面。你刚才说：“${input.text}”。`
    let index = 0
    const timer = window.setInterval(() => {
      if (!this.timers.has(messageId)) {
        return
      }
      if (index < answer.length) {
        this.emit({
          name: 'MessageSendRes',
          messageId,
          payload: {
            ret: errorCode.succ,
            status: MessageStatus.MESSAGE_STATUS_STREAMING,
            sessionId: input.sessionId,
            delta: answer.slice(index, index + 2),
          },
        })
        index += 2
        return
      }

      window.clearInterval(timer)
      this.timers.delete(messageId)
      const message = {
        id: crypto.randomUUID(),
        role: MessageRole.MESSAGE_ROLE_ASSISTANT,
        content: answer,
        createdAt: now(),
      }
      const current = this.messages.get(input.sessionId) ?? []
      this.messages.set(input.sessionId, [...current, message])
      this.emit({
        name: 'MessageSendRes',
        messageId,
        payload: {
          ret: errorCode.succ,
          status: MessageStatus.MESSAGE_STATUS_COMPLETED,
          sessionId: input.sessionId,
          message,
        },
      })
    }, 32)
    this.timers.set(messageId, { timer, sessionId: input.sessionId, userId: userMessage.id })
    return
  }

  private cancel(cancelMessageId: number, targetMessageId: number): void {
    const request = this.timers.get(targetMessageId)
    if (request !== undefined) {
      window.clearInterval(request.timer)
      this.timers.delete(targetMessageId)
      const history = this.messages.get(request.sessionId) ?? []
      this.messages.set(
        request.sessionId,
        history.filter((item) => item.id !== request.userId),
      )
    }

    this.emit({
      name: 'MessageCancelRes',
      messageId: cancelMessageId,
      payload: { ret: errorCode.succ },
    })
    if (!request) return
    this.emit({
      name: 'MessageSendRes',
      messageId: targetMessageId,
      payload: {
        ret: errorCode.succ,
        status: MessageStatus.MESSAGE_STATUS_CANCELLED,
        sessionId: request.sessionId,
      },
    })
    return
  }

  close(): void {
    this.generation++
    this.onMessage = null
    for (const request of this.timers.values()) window.clearInterval(request.timer)
    this.timers.clear()
  }

  private createSessionState(): ChatSessionSummary {
    const session = {
      id: `mock-${crypto.randomUUID()}`,
      title: '新的会话',
      updatedAt: now(),
    }
    this.sessions = [session, ...this.sessions]
    this.activeSessionId = session.id
    this.messages.set(session.id, [])
    return session
  }

  private currentMessages() {
    return this.messages.get(this.activeSessionId) ?? []
  }

  private updateTitle(sessionId: string, text: string) {
    this.sessions = this.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            title: text.slice(0, 24) || '新的会话',
            updatedAt: now(),
          }
        : session,
    )
  }

  private emit(message: ServerMessage) {
    const generation = this.generation
    queueMicrotask(() => {
      if (generation === this.generation) {
        this.onMessage?.(
          encodeMessage(
            message.messageId,
            message.name,
            message.payload as Record<string, unknown>,
          ),
        )
      }
    })
  }
}
