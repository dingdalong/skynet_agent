import { RequestClient } from '../network/request-client'
import { WebSocketChannel, type BinaryChannel } from '../network/websocket-channel'
import { checkResponse, toSession, toSnapshot, toUpdate } from '../protocol/chat-mapper'
import type {
  ChatTransport,
  UserSnapshot,
  ChatSession,
  ChatUpdate,
  TransportConnectionListener,
} from '../types/chat'

export class ChatClient implements ChatTransport {
  private readonly requests: RequestClient
  private ready = false
  private generation = 0
  private updates = new Set<(update: ChatUpdate) => void>()
  private buffered: ChatUpdate[] = []

  constructor(
    channel: BinaryChannel = new WebSocketChannel(),
    private readonly timeoutMs = 10_000,
  ) {
    this.requests = new RequestClient(channel, timeoutMs)
    this.requests.subscribeConnection(() => {
      this.ready = false
    })
    this.requests.subscribeNotifications((message) => {
      const update = toUpdate(message)
      if (!this.ready) this.buffered.push(update)
      else for (const listener of this.updates) listener(update)
    })
  }

  async connect(username: string): Promise<UserSnapshot> {
    const generation = ++this.generation
    this.ready = false
    this.buffered = []
    const deadline = Date.now() + this.timeoutMs
    try {
      await this.requests.connect()
      if (generation !== this.generation) throw new Error('连接已被替换')
      const response = await this.requests.request(
        'LoginReq',
        { username },
        undefined,
        Math.max(1, deadline - Date.now()),
      ).completed
      if (generation !== this.generation) throw new Error('连接已被替换')
      if (response.name !== 'LoginRes') throw new Error('登录响应类型无效')
      checkResponse(response.payload)
      if (!response.payload.snapshot) throw new Error('Agent 未返回用户快照')
      const snapshot = toSnapshot(response.payload.snapshot)
      this.ready = true
      // 调用者缓冲基线安装前的更新，随后按会话版本合并。
      for (const update of this.buffered.splice(0))
        for (const listener of this.updates) listener(update)
      return snapshot
    } catch (error) {
      if (generation === this.generation) this.requests.close()
      throw error
    }
  }

  async snapshot(): Promise<UserSnapshot> {
    this.assertReady()
    const response = await this.requests.request('UserSnapshotReq', {}).completed
    if (response.name !== 'UserSnapshotRes') throw new Error('用户快照响应类型无效')
    checkResponse(response.payload)
    if (!response.payload.snapshot) throw new Error('Agent 未返回用户快照')
    return toSnapshot(response.payload.snapshot)
  }

  async createSession(): Promise<ChatSession> {
    this.assertReady()
    const response = await this.requests.request('SessionCreateReq', {}).completed
    if (response.name !== 'SessionCreateRes') throw new Error('创建会话响应类型无效')
    checkResponse(response.payload)
    if (!response.payload.session) throw new Error('Agent 未返回会话')
    return toSession(response.payload.session)
  }

  async setModel(sessionId: string, modelId: string): Promise<ChatSession> {
    this.assertReady()
    const response = await this.requests.request('SessionModelSetReq', { sessionId, modelId })
      .completed
    if (response.name !== 'SessionModelSetRes') throw new Error('模型切换响应类型无效')
    checkResponse(response.payload)
    if (!response.payload.session) throw new Error('Agent 未返回会话')
    return toSession(response.payload.session)
  }

  async sendMessage(input: {
    sessionId: string
    text: string
    retryRunId?: string
  }): Promise<ChatSession> {
    this.assertReady()
    const response = await this.requests.request('MessageSendReq', input).completed
    if (response.name !== 'MessageSendRes') throw new Error('生成响应类型无效')
    checkResponse(response.payload)
    if (!response.payload.session) throw new Error('Agent 未返回会话')
    return toSession(response.payload.session)
  }

  async cancelRun(sessionId: string, runId: string): Promise<void> {
    this.assertReady()
    const response = await this.requests.request('MessageCancelReq', { sessionId, runId }).completed
    if (response.name !== 'MessageCancelRes') throw new Error('取消响应类型无效')
    checkResponse(response.payload)
  }

  subscribeUpdates(listener: (update: ChatUpdate) => void): () => void {
    this.updates.add(listener)
    return () => {
      this.updates.delete(listener)
    }
  }

  subscribeConnection(listener: TransportConnectionListener): () => void {
    return this.requests.subscribeConnection(listener)
  }

  close(): void {
    this.generation++
    this.ready = false
    this.buffered = []
    this.requests.close()
  }

  private assertReady(): void {
    if (!this.ready) throw new Error('Agent 尚未连接用户')
  }
}
