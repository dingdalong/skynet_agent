import { RequestClient } from '../network/request-client'
import { WebSocketChannel, type BinaryChannel } from '../network/websocket-channel'
import { skynet } from '../protocol/generated/agent_gateway.js'
import { errorCode } from '../protocol/error-code'
import {
  checkResponse,
  requiredString,
  toChatMessage,
  toSessionSummary,
  toSnapshot,
} from '../protocol/chat-mapper'
import type {
  ChatTransport,
  SessionSnapshot,
  ChatSession,
  SessionSelection,
  StreamRequest,
  ReplyResult,
  TransportConnectionListener,
} from '../types/chat'

export class ChatClient implements ChatTransport {
  private readonly requests: RequestClient
  private ready = false
  private generation = 0

  constructor(
    channel: BinaryChannel = new WebSocketChannel(),
    private readonly timeoutMs = 10_000,
    private readonly streamTimeoutMs = 130_000,
  ) {
    this.requests = new RequestClient(channel, timeoutMs)
    this.requests.subscribeConnection(() => {
      this.ready = false
    })
  }

  async connect(): Promise<SessionSnapshot> {
    const generation = ++this.generation
    this.ready = false
    const deadline = Date.now() + this.timeoutMs
    try {
      await this.requests.connect()
      if (generation !== this.generation) throw new Error('连接已被替换')
      const response = await this.requests.request(
        'LoginReq',
        {},
        undefined,
        Math.max(1, deadline - Date.now()),
      ).completed
      if (generation !== this.generation) throw new Error('连接已被替换')
      if (response.name !== 'LoginRes') throw new Error('登录响应类型无效')
      checkResponse(response.payload)
      if (!response.payload.snapshot) throw new Error('Agent 未返回登录快照')
      const snapshot = toSnapshot(response.payload.snapshot)
      this.ready = true
      return snapshot
    } catch (error) {
      if (generation === this.generation) this.requests.close()
      throw error
    }
  }

  async createSession(): Promise<ChatSession> {
    this.assertReady()
    const response = await this.requests.request('SessionCreateReq', {}).completed
    if (response.name !== 'SessionCreateRes') throw new Error('创建会话响应类型无效')
    checkResponse(response.payload)
    if (!response.payload.session) throw new Error('Agent 未返回会话')
    return {
      ...toSessionSummary(response.payload.session),
      messages: (response.payload.messages ?? []).map(toChatMessage),
    }
  }

  async selectSession(sessionId: string): Promise<SessionSelection> {
    this.assertReady()
    const response = await this.requests.request('SessionSelectReq', { sessionId }).completed
    if (response.name !== 'SessionSelectRes') throw new Error('切换会话响应类型无效')
    checkResponse(response.payload)
    const selectedId = requiredString(response.payload.sessionId, 'sessionId')
    if (selectedId !== sessionId) throw new Error('Agent 返回了不同的会话')
    return { sessionId, messages: (response.payload.messages ?? []).map(toChatMessage) }
  }

  sendMessage(
    input: { sessionId: string; text: string },
    onDelta: (delta: string) => void,
  ): StreamRequest {
    this.assertReady()
    const request = this.requests.request(
      'MessageSendReq',
      input,
      (response) => {
        if (response.name !== 'MessageSendRes') throw new Error('生成响应类型无效')
        const payload = response.payload
        if (payload.ret !== errorCode.succ) return true
        if (payload.sessionId !== input.sessionId) throw new Error('生成响应会话不匹配')
        switch (payload.status) {
          case skynet.agent.v1.MessageStatus.MESSAGE_STATUS_STREAMING:
            onDelta(requiredString(payload.delta, 'delta'))
            return false
          case skynet.agent.v1.MessageStatus.MESSAGE_STATUS_COMPLETED:
          case skynet.agent.v1.MessageStatus.MESSAGE_STATUS_CANCELLED:
            return true
          default:
            throw new Error('Agent 返回未知消息状态')
        }
      },
      this.streamTimeoutMs,
    )
    let completed = false
    const result = request.completed.then(
      (response): ReplyResult => {
        completed = true
        if (response.name !== 'MessageSendRes') throw new Error('生成响应类型无效')
        checkResponse(response.payload)
        if (response.payload.status === skynet.agent.v1.MessageStatus.MESSAGE_STATUS_CANCELLED) {
          return { status: 'cancelled' }
        }
        if (!response.payload.message) throw new Error('Agent 未返回完整回答')
        return { status: 'complete', message: toChatMessage(response.payload.message) }
      },
      (error: unknown) => {
        completed = true
        throw error
      },
    )
    return {
      messageId: request.messageId,
      completed: result,
      cancel: async () => {
        if (completed) return
        const response = await this.requests.request('MessageCancelReq', {
          targetMessageId: request.messageId,
        }).completed
        checkResponse(response.payload)
      },
    }
  }

  subscribeConnection(listener: TransportConnectionListener): () => void {
    return this.requests.subscribeConnection(listener)
  }

  close(): void {
    this.generation++
    this.ready = false
    this.requests.close()
  }

  private assertReady(): void {
    if (!this.ready) throw new Error('Agent 尚未登录')
  }
}
