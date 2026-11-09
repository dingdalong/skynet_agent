import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeMessage, encodeMessage } from '../protocol/agent-gateway-codec'
import { errorCode } from '../protocol/error-code'

import { ChatClient } from './chat-client'
import { WebSocketChannel } from '../network/websocket-channel'
import { MockAgentChannel } from './mock-agent-channel'

const OriginalWebSocket = globalThis.WebSocket

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeWebSocket[] = []

  binaryType = 'blob'
  readonly url: string
  readyState = FakeWebSocket.CONNECTING
  sent: Array<string | ArrayBufferLike | Blob | ArrayBufferView> = []
  private listeners = new Map<string, Set<EventListener>>()

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.sent.push(data)
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return
    }
    this.readyState = FakeWebSocket.CLOSED
    this.dispatch('close', new Event('close'))
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.dispatch('open', new Event('open'))
  }

  receive(data: string | ArrayBuffer | Uint8Array) {
    this.dispatch('message', new MessageEvent('message', { data }))
  }

  private dispatch(type: string, event: Event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

function currentSocket() {
  const socket = FakeWebSocket.instances.at(-1)
  if (!socket) {
    throw new Error('未创建 WebSocket')
  }
  return socket
}

function sentMessage(socket: FakeWebSocket, index: number) {
  return decodeMessage(socket.sent[index] as Uint8Array)
}

function receiveMessage(
  socket: FakeWebSocket,
  messageId: number,
  name: string,
  payload: Record<string, unknown>,
) {
  socket.receive(encodeMessage(messageId, name, payload))
}

function acceptLogin(socket: FakeWebSocket) {
  const login = sentMessage(socket, 0)
  expect(login).toMatchObject({
    messageId: 1,
    name: 'LoginReq',
  })
  receiveMessage(socket, login.messageId, 'LoginRes', {
    ret: errorCode.succ,
    snapshot: {
      userId: 'user-1',
      username: 'alice',
      chatSessions: [],
      models: [{ id: 'flash', name: 'Flash', model: 'flash' }],
      defaultModelId: 'flash',
      permissionModelId: '',
    },
  })
}

async function flush() {
  for (let index = 0; index < 5; index++) await Promise.resolve()
}

async function connectAndLogin(client: ChatClient) {
  const connected = client.connect('alice')
  const socket = currentSocket()
  socket.open()
  await flush()
  acceptLogin(socket)
  const snapshot = await connected
  return { socket, snapshot }
}

describe('ChatClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  })
  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket
    vi.useRealTimers()
  })

  it('按用户名绑定并接收没有关联请求的推送', async () => {
    const client = new ChatClient(new WebSocketChannel())
    const listener = vi.fn()
    client.subscribeUpdates(listener)
    const { socket, snapshot } = await connectAndLogin(client)
    expect(sentMessage(socket, 0)).toMatchObject({ payload: { username: 'alice' } })
    expect(snapshot.userId).toBe('user-1')
    receiveMessage(socket, 0, 'MessageDeltaNtf', {
      sessionId: 'session-1',
      runId: 'run-1',
      messageId: 'm1',
      delta: '回',
      revision: 2,
    })
    expect(listener).toHaveBeenCalledWith({
      type: 'delta',
      sessionId: 'session-1',
      runId: 'run-1',
      messageId: 'm1',
      delta: '回',
      revision: 2,
    })
    client.close()
  })

  it('消息命令只等待确认，取消使用稳定业务任务 ID', async () => {
    const client = new ChatClient(new WebSocketChannel())
    const { socket } = await connectAndLogin(client)
    const pending = client.sendMessage({ sessionId: 'session-1', text: '问题' })
    const sent = sentMessage(socket, 1)
    receiveMessage(socket, sent.messageId, 'ChatRes', {
      ret: 1,
      chatSession: {
        modelId: 'flash',
        permissionModelId: 'flash',
        session: {
          id: 'session-1',
          title: '问题',
          updatedAt: 1,
          revision: 2,
          runId: 'run-1',
          messages: [],
        },
      },
    })
    expect((await pending).runId).toBe('run-1')
    const cancel = client.cancelRun('session-1', 'run-1')
    expect(sentMessage(socket, 2)).toMatchObject({
      payload: { sessionId: 'session-1', runId: 'run-1' },
    })
    receiveMessage(socket, 3, 'MessageCancelRes', { ret: 1 })
    await cancel
    client.close()
  })

  it('空用户快照可登录，首次ChatReq省略会话ID并携带预选模型', async () => {
    const client = new ChatClient(new WebSocketChannel())
    const { socket, snapshot } = await connectAndLogin(client)
    expect(snapshot.chatSessions).toHaveLength(0)
    expect(snapshot.defaultModelId).toBe('flash')
    const pending = client.sendMessage({ text: '首次', modelId: 'pro' })
    const sent = sentMessage(socket, 1)
    expect(sent).toMatchObject({ name: 'ChatReq', payload: { text: '首次', modelId: 'pro' } })
    expect((sent.payload as { sessionId?: string }).sessionId ?? '').toBe('')
    receiveMessage(socket, sent.messageId, 'ChatRes', {
      ret: 1,
      chatSession: {
        session: { id: 'created', title: '首次', updatedAt: 1, revision: 1, messages: [] },
        modelId: 'pro',
        permissionModelId: 'judge',
      },
    })
    expect(await pending).toMatchObject({
      id: 'created',
      modelId: 'pro',
      permissionModelId: 'judge',
    })
    client.close()
  })

  it('按聊天会话包装解码通知和模型响应，缺少Agent会话时拒绝', async () => {
    const client = new ChatClient(new WebSocketChannel())
    const updates = vi.fn()
    client.subscribeUpdates(updates)
    const { socket } = await connectAndLogin(client)
    const chatSession = {
      session: { id: 's1', title: '已有', updatedAt: 1, revision: 1, messages: [] },
      modelId: 'pro',
      permissionModelId: 'judge',
    }
    receiveMessage(socket, 0, 'SessionUpdatedNtf', { chatSession })
    expect(updates).toHaveBeenCalledWith({
      type: 'session',
      session: expect.objectContaining({ id: 's1', modelId: 'pro', permissionModelId: 'judge' }),
    })
    const model = client.setModel('s1', 'pro')
    receiveMessage(socket, 2, 'SessionModelSetRes', { ret: 1, chatSession })
    expect(await model).toMatchObject({ id: 's1', modelId: 'pro', permissionModelId: 'judge' })
    const broken = client.sendMessage({ text: 'broken' })
    receiveMessage(socket, 3, 'ChatRes', { ret: 1, chatSession: { modelId: 'pro' } })
    await expect(broken).rejects.toThrow('聊天会话缺少 Agent 会话')
    client.close()
  })

  it('旧登录失败不能关闭新连接', async () => {
    const client = new ChatClient(new WebSocketChannel())
    const first = client.connect('alice').catch((error: unknown) => error)
    const old = currentSocket()
    old.open()
    await flush()
    const second = client.connect('alice')
    const next = currentSocket()
    next.open()
    await flush()
    acceptLogin(next)
    await second
    expect(await first).toBeInstanceOf(Error)
    old.receive(new Uint8Array([1]))
    expect(next.readyState).toBe(FakeWebSocket.OPEN)
    client.close()
  })

  it('连接超时释放通道，响应类型不匹配终止连接', async () => {
    vi.useFakeTimers()
    const client = new ChatClient(new WebSocketChannel(), 100)
    const rejected = expect(client.connect('alice')).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(101)
    await rejected
    expect(currentSocket().readyState).toBe(FakeWebSocket.CLOSED)
    const connected = client.connect('alice')
    currentSocket().open()
    await flush()
    acceptLogin(currentSocket())
    await connected
    const pending = client.sendMessage({ text: 'first' })
    receiveMessage(currentSocket(), 2, 'MessageCancelRes', { ret: 1 })
    await expect(pending).rejects.toThrow('不匹配')
    client.close()
  })

  it('Mock 后端断开连接保留用户及生成任务', async () => {
    vi.useFakeTimers()
    const name = crypto.randomUUID()
    const client = new ChatClient(new MockAgentChannel())
    const initial = await client.connect(name)
    expect(initial.chatSessions).toHaveLength(0)
    await client.sendMessage({ text: '继续生成', modelId: 'deepseek-flash' })
    client.close()
    await vi.advanceTimersByTimeAsync(3000)
    const other = new ChatClient(new MockAgentChannel())
    const restored = await other.connect(name)
    expect(restored.userId).toBe(initial.userId)
    expect(restored.chatSessions[0]!.messages.at(-1)?.status).toBe('complete')
    other.close()
  })

  it.each([undefined, ''])('Mock 首发模型缺省为 %j 时采用快照默认模型', async (modelId) => {
    vi.useFakeTimers()
    const client = new ChatClient(new MockAgentChannel())
    const initial = await client.connect(crypto.randomUUID())
    const session = await client.sendMessage({ text: '默认模型', modelId })
    expect(session.modelId).toBe(initial.defaultModelId)
    expect(session.permissionModelId).toBe(initial.defaultModelId)
    expect((await client.snapshot()).chatSessions).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(3000)
    client.close()
  })

  it.each([
    { text: '' },
    { text: '界'.repeat(6667) },
    { text: '首次', modelId: 'unknown' },
    { text: '首次', retryRunId: 'old' },
    { text: '首次', sessionId: 'unknown' },
  ])('Mock 拒绝无效首发且不登记会话 %#', async (input) => {
    const client = new ChatClient(new MockAgentChannel())
    const updates = vi.fn()
    client.subscribeUpdates(updates)
    await client.connect(crypto.randomUUID())
    await expect(client.sendMessage(input)).rejects.toMatchObject({
      code: 'sessionId' in input ? errorCode.fail : errorCode.invalid_param,
      retryable: false,
    })
    expect((await client.snapshot()).chatSessions).toHaveLength(0)
    expect(updates).not.toHaveBeenCalled()
    client.close()
  })
})
