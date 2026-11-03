import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeMessage, encodeMessage } from '../protocol/agent-gateway-codec'
import { skynet } from '../protocol/generated/agent_gateway.js'
import { errorCode } from '../protocol/error-code'
import { MAX_MESSAGE_ID } from '../protocol/message-id'

import { ChatClient } from './chat-client'
import { WebSocketChannel } from '../network/websocket-channel'
import { MockAgentChannel } from './mock-agent-channel'

const { MessageStatus } = skynet.agent.v1
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
      sessions: [{ id: 'session-1', title: '新的会话', updatedAt: 1 }],
      activeSessionId: 'session-1',
      messages: [],
    },
  })
}

async function flush() {
  for (let index = 0; index < 5; index++) await Promise.resolve()
}

async function connectAndLogin(client: ChatClient) {
  const connected = client.connect()
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

  it('登录返回业务快照，普通请求返回关联的 Promise', async () => {
    const client = new ChatClient()
    const { socket, snapshot } = await connectAndLogin(client)
    expect(snapshot.activeSessionId).toBe('session-1')
    const first = client.createSession()
    const second = client.createSession()
    receiveMessage(socket, 3, 'SessionCreateRes', {
      ret: 1,
      session: { id: 's3', title: '三', updatedAt: 3 },
      messages: [],
    })
    receiveMessage(socket, 2, 'SessionCreateRes', {
      ret: 1,
      session: { id: 's2', title: '二', updatedAt: 2 },
      messages: [],
    })
    expect((await first).id).toBe('s2')
    expect((await second).id).toBe('s3')
    client.close()
  })

  it('业务错误只拒绝当前请求，连接可以继续使用', async () => {
    const client = new ChatClient()
    const { socket } = await connectAndLogin(client)
    const selected = client.selectSession('missing')
    receiveMessage(socket, 2, 'SessionSelectRes', {
      ret: 2,
      error: { message: '会话不存在', retryable: false },
    })
    await expect(selected).rejects.toThrow('会话不存在')
    const next = client.selectSession('session-1')
    receiveMessage(socket, 3, 'SessionSelectRes', { ret: 1, sessionId: 'session-1', messages: [] })
    await expect(next).resolves.toMatchObject({ sessionId: 'session-1' })
    client.close()
  })

  it('流式增量与完成分离，取消确认后仍等待原请求终态', async () => {
    const client = new ChatClient()
    const { socket } = await connectAndLogin(client)
    const delta = vi.fn()
    const request = client.sendMessage({ sessionId: 'session-1', text: 'hello' }, delta)
    receiveMessage(socket, 2, 'MessageSendRes', {
      ret: 1,
      sessionId: 'session-1',
      status: MessageStatus.MESSAGE_STATUS_STREAMING,
      delta: '半截',
    })
    expect(delta).toHaveBeenCalledWith('半截')
    let done = false
    void request.completed.then(() => {
      done = true
    })
    const cancel = request.cancel()
    expect(sentMessage(socket, 2).payload).toMatchObject({ targetMessageId: 2 })
    receiveMessage(socket, 3, 'MessageCancelRes', { ret: 1 })
    await cancel
    expect(done).toBe(false)
    receiveMessage(socket, 2, 'MessageSendRes', {
      ret: 1,
      sessionId: 'session-1',
      status: MessageStatus.MESSAGE_STATUS_CANCELLED,
    })
    await expect(request.completed).resolves.toEqual({ status: 'cancelled' })
    client.close()
  })

  it('成功终态采用完整回答，重复终态没有副作用', async () => {
    const client = new ChatClient()
    const { socket } = await connectAndLogin(client)
    const delta = vi.fn()
    const request = client.sendMessage({ sessionId: 'session-1', text: 'hello' }, delta)
    receiveMessage(socket, 2, 'MessageSendRes', {
      ret: 1,
      sessionId: 'session-1',
      status: MessageStatus.MESSAGE_STATUS_COMPLETED,
      message: { id: 'm', role: 2, content: '完整回答', createdAt: 1 },
    })
    await expect(request.completed).resolves.toMatchObject({
      status: 'complete',
      message: { content: '完整回答' },
    })
    receiveMessage(socket, 2, 'MessageSendRes', {
      ret: 1,
      sessionId: 'session-1',
      status: MessageStatus.MESSAGE_STATUS_STREAMING,
      delta: '迟到',
    })
    expect(delta).not.toHaveBeenCalled()
    client.close()
  })

  it('主动关闭尚未打开的连接会结束 connect', async () => {
    const client = new ChatClient()
    const pending = client.connect()
    client.close()
    await expect(pending).rejects.toThrow('关闭')
  })

  it('重复 connect 结束旧请求，并忽略旧 socket 的 open、message 和 close', async () => {
    const client = new ChatClient()
    const first = client.connect()
    const firstResult = expect(first).rejects.toThrow()
    const old = currentSocket()
    const second = client.connect()
    const socket = currentSocket()
    old.open()
    old.close()
    socket.open()
    await flush()
    expect(old.sent).toHaveLength(0)
    acceptLogin(socket)
    await second
    await firstResult
    receiveMessage(old, 1, 'LoginRes', { ret: 2 })
    client.close()
  })

  it('替换正在登录的连接时，旧请求失败不会关闭新连接', async () => {
    const client = new ChatClient()
    const first = client.connect()
    const firstResult = expect(first).rejects.toThrow()
    const old = currentSocket()
    old.open()
    await flush()
    expect(sentMessage(old, 0).name).toBe('LoginReq')

    const second = client.connect()
    const socket = currentSocket()
    socket.open()
    await flush()
    await firstResult
    receiveMessage(old, 1, 'LoginRes', { ret: 2 })
    expect(socket.readyState).toBe(FakeWebSocket.OPEN)
    acceptLogin(socket)
    await expect(second).resolves.toMatchObject({ activeSessionId: 'session-1' })
    client.close()
  })

  it('登录中关闭以及协议损坏会拒绝等待中的请求', async () => {
    const client = new ChatClient()
    const connecting = client.connect()
    const socket = currentSocket()
    socket.open()
    await flush()
    socket.close()
    await expect(connecting).rejects.toThrow()
    const { socket: next } = await connectAndLogin(client)
    const pending = client.createSession()
    next.receive(new Uint8Array([1, 2]))
    await expect(pending).rejects.toThrow('9 字节')
    expect(next.readyState).toBe(FakeWebSocket.CLOSED)
  })

  it('响应类型错配关闭连接并拒绝全部 pending', async () => {
    const client = new ChatClient()
    const { socket } = await connectAndLogin(client)
    const first = client.createSession()
    const second = client.selectSession('session-1')
    receiveMessage(socket, 2, 'MessageCancelRes', { ret: 1 })
    await expect(first).rejects.toThrow('不匹配')
    await expect(second).rejects.toThrow('不匹配')
  })

  it('连接、普通请求和流式请求都有超时且清理定时器', async () => {
    vi.useFakeTimers()
    const client = new ChatClient(new WebSocketChannel(), 100, 200)
    const connecting = client.connect()
    const failure = expect(connecting).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(100)
    await failure
    await connectAndLogin(client)
    const pending = client.createSession()
    const timeout = expect(pending).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(100)
    await timeout
    await connectAndLogin(client)
    const stream = client.sendMessage({ sessionId: 'session-1', text: 'x' }, () => {})
    const streamTimeout = expect(stream.completed).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(200)
    await streamTimeout
    expect(vi.getTimerCount()).toBe(0)
  })

  it('消息 ID 耗尽后关闭连接，不回到 1', async () => {
    const client = new ChatClient()
    const { socket } = await connectAndLogin(client)
    const internal = client as unknown as { requests: { nextId: number | null } }
    internal.requests.nextId = MAX_MESSAGE_ID
    const last = client.createSession()
    expect(sentMessage(socket, 1).messageId).toBe(MAX_MESSAGE_ID)
    await expect(client.createSession()).rejects.toThrow('耗尽')
    await expect(last).rejects.toThrow('耗尽')
  })

  it('Mock 经过相同编解码和请求管理，重连创建新快照', async () => {
    const client = new ChatClient(new MockAgentChannel())
    const first = await client.connect()
    const created = await client.createSession()
    expect(created.id).not.toBe(first.activeSessionId)
    const second = await client.connect()
    expect(second.sessions).toHaveLength(1)
    expect(second.activeSessionId).not.toBe(created.id)
    client.close()
  })

  it('非回环地址必须使用 WSS', () => {
    expect(() => new WebSocketChannel('ws://example.com')).toThrow('wss://')
  })
})
