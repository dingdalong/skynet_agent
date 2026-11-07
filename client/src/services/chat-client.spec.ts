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
      sessions: [{ id: 'session-1', title: '新的会话', updatedAt: 1, revision: 1, messages: [] }],
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
    receiveMessage(socket, sent.messageId, 'MessageSendRes', {
      ret: 1,
      session: {
        id: 'session-1',
        title: '问题',
        updatedAt: 1,
        revision: 2,
        runId: 'run-1',
        messages: [],
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
    const pending = client.createSession()
    receiveMessage(currentSocket(), 2, 'MessageCancelRes', { ret: 1 })
    await expect(pending).rejects.toThrow('不匹配')
    client.close()
  })

  it('Mock 后端断开连接保留用户及生成任务', async () => {
    vi.useFakeTimers()
    const name = crypto.randomUUID()
    const client = new ChatClient(new MockAgentChannel())
    const initial = await client.connect(name)
    const id = initial.sessions[0]!.id
    await client.sendMessage({ sessionId: id, text: '继续生成' })
    client.close()
    await vi.advanceTimersByTimeAsync(3000)
    const other = new ChatClient(new MockAgentChannel())
    const restored = await other.connect(name)
    expect(restored.userId).toBe(initial.userId)
    expect(restored.sessions[0]!.messages.at(-1)?.status).toBe('complete')
    other.close()
  })
})
