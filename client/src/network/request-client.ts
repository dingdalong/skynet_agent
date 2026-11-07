import { decodeServerMessage, encodeMessage } from '../protocol/agent-gateway-codec'
import { nextMessageId } from '../protocol/message-id'
import type { RequestPayloads, ServerMessage } from '../protocol/messages'
import type { TransportConnectionListener } from '../types/chat'
import type { BinaryChannel, BinaryFrame } from './websocket-channel'

interface PendingRequest {
  expectedName: string
  consume: (message: ServerMessage) => boolean
  resolve: (message: ServerMessage) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class RequestClient {
  private active = false
  private connected = false
  private generation = 0
  private nextId: number | null = 1
  private pending = new Map<number, PendingRequest>()
  private notifications = new Set<(message: ServerMessage) => void>()
  private listeners = new Set<TransportConnectionListener>()
  private rejectOpening: ((error: Error) => void) | null = null

  constructor(
    private readonly channel: BinaryChannel,
    private readonly timeoutMs = 10_000,
  ) {}

  async connect(): Promise<void> {
    this.close()
    const generation = ++this.generation
    this.active = true
    this.nextId = 1
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await new Promise<void>((resolve, reject) => {
        this.rejectOpening = reject
        timer = setTimeout(() => this.fail(new Error('Agent 连接超时')), this.timeoutMs)
        this.channel
          .open(
            (frame) => {
              if (this.generation === generation) this.receive(frame)
            },
            (error) => {
              if (this.generation === generation) this.fail(error)
            },
          )
          .then(resolve, reject)
      })
      if (!this.active || this.generation !== generation) throw new Error('Agent 连接已替换')
      this.connected = true
    } catch (error) {
      if (this.generation === generation) this.fail(asError(error))
      throw error
    } finally {
      clearTimeout(timer)
      if (this.generation === generation) this.rejectOpening = null
    }
  }

  request<Name extends keyof RequestPayloads>(
    name: Name,
    payload: RequestPayloads[Name],
    consume: (message: ServerMessage) => boolean = () => true,
    timeoutMs = this.timeoutMs,
  ): { messageId: number; completed: Promise<ServerMessage> } {
    if (!this.connected) throw new Error('Agent 尚未连接')
    if (this.nextId === null) {
      this.fail(new Error('Agent 消息 ID 已耗尽，请重新连接'))
      throw new Error('Agent 消息 ID 已耗尽，请重新连接')
    }
    const messageId = this.nextId
    this.nextId = nextMessageId(messageId)
    const frame = encodeMessage(messageId, name, payload as Record<string, unknown>)
    const completed = new Promise<ServerMessage>((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error(`Agent 请求超时: ${name}`)), timeoutMs)
      this.pending.set(messageId, {
        expectedName: `${name.slice(0, -3)}Res`,
        consume,
        resolve,
        reject,
        timer,
      })
      try {
        this.channel.send(frame)
      } catch (error) {
        this.fail(asError(error))
      }
    })
    return { messageId, completed }
  }

  subscribeNotifications(listener: (message: ServerMessage) => void): () => void {
    this.notifications.add(listener)
    return () => this.notifications.delete(listener)
  }

  subscribeConnection(listener: TransportConnectionListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close(): void {
    this.terminate(new Error('Agent 连接已关闭'), 'offline')
  }

  private fail(error: Error): void {
    this.terminate(error, 'error')
  }

  private terminate(error: Error, state: 'error' | 'offline'): void {
    const wasActive = this.active
    this.active = false
    this.connected = false
    this.rejectOpening?.(error)
    this.rejectOpening = null
    for (const request of this.pending.values()) {
      clearTimeout(request.timer)
      request.reject(error)
    }
    this.pending.clear()
    this.channel.close()
    if (wasActive) {
      for (const listener of this.listeners) listener({ state, error })
    }
  }

  private receive(frame: BinaryFrame): void {
    if (!this.active) return
    try {
      const message = decodeServerMessage(frame)
      if (message.messageId === 0) {
        for (const listener of this.notifications) listener(message)
        return
      }
      const request = this.pending.get(message.messageId)
      // 已完成请求和超时连接的迟到消息没有副作用。
      if (!request) return
      if (message.name !== request.expectedName) throw new Error('Agent 响应类型与请求不匹配')
      if (request.consume(message)) {
        clearTimeout(request.timer)
        this.pending.delete(message.messageId)
        request.resolve(message)
      }
    } catch (error) {
      this.fail(asError(error))
    }
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
