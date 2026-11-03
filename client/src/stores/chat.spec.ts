import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from './chat'
import { ResponseError } from '../protocol/chat-mapper'
import { ChatClient } from '../services/chat-client'
import { decodeMessage, encodeMessage } from '../protocol/agent-gateway-codec'
import type { BinaryChannel, BinaryFrame } from '../network/websocket-channel'
import type {
  ChatTransport,
  ReplyResult,
  SessionSnapshot,
  TransportConnectionListener,
} from '../types/chat'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function fakeTransport() {
  const streams: Array<
    ReturnType<typeof deferred<ReplyResult>> & {
      delta: (text: string) => void
      cancel: ReturnType<typeof vi.fn<() => Promise<void>>>
    }
  > = []
  let connectionListener: TransportConnectionListener | null = null
  const snapshot: SessionSnapshot = {
    sessions: [
      { id: 's1', title: '新的会话', updatedAt: 1 },
      { id: 's2', title: '二', updatedAt: 2 },
    ],
    activeSessionId: 's1',
    messages: [],
  }
  const transport = {
    connect: vi
      .fn<ChatTransport['connect']>()
      .mockImplementation(async () => structuredClone(snapshot)),
    createSession: vi
      .fn<ChatTransport['createSession']>()
      .mockResolvedValue({ id: 's3', title: '新会话', updatedAt: 3, messages: [] }),
    selectSession: vi
      .fn<ChatTransport['selectSession']>()
      .mockImplementation(async (sessionId) => ({ sessionId, messages: [] })),
    sendMessage: vi.fn<ChatTransport['sendMessage']>().mockImplementation((_, delta) => {
      const current = {
        ...deferred<ReplyResult>(),
        delta,
        cancel: vi.fn<() => Promise<void>>().mockResolvedValue(),
      }
      streams.push(current)
      return { messageId: streams.length + 1, completed: current.promise, cancel: current.cancel }
    }),
    close: vi.fn(),
    subscribeConnection: vi
      .fn<ChatTransport['subscribeConnection']>()
      .mockImplementation((listener) => {
        connectionListener = listener
        return () => {
          connectionListener = null
        }
      }),
  }
  return {
    transport,
    streams,
    emit: (state: 'offline' | 'error', error = new Error('连接已断开')) =>
      connectionListener?.({ state, error }),
  }
}

async function flush() {
  for (let index = 0; index < 8; index++) await Promise.resolve()
}

describe('chat store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('展示快照、增量和完整终态，结束后立即允许发送', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    expect(store.canSend).toBe(true)
    expect(store.sendMessage('你好')).toBe(true)
    fake.streams[0]!.delta('半截')
    expect(store.messages.at(-1)?.content).toBe('半截')
    fake.streams[0]!.resolve({
      status: 'complete',
      message: {
        id: 'm',
        role: 'assistant',
        content: '完整回答',
        createdAt: 1,
        status: 'complete',
      },
    })
    await flush()
    expect(store.messages.at(-1)?.content).toBe('完整回答')
    expect(store.canSend).toBe(true)
    store.disconnect()
  })

  it('可重试失败保留用户消息，重试不重复插入用户消息', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('重试我')
    fake.streams[0]!.reject(new ResponseError(17, '供应商失败', true))
    await flush()
    expect(store.canRetry).toBe(true)
    expect(store.messages.at(-1)?.status).toBe('error')
    store.retryLastMessage()
    expect(fake.streams).toHaveLength(2)
    expect(store.messages.filter((item) => item.role === 'user')).toHaveLength(1)
    store.disconnect()
    await flush()
  })

  it('取消确认后维持正在停止，清理终态后才可发送', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('停止我')
    await store.cancelRun()
    expect(store.runState).toBe('cancelling')
    expect(store.canSend).toBe(false)
    expect(store.sendMessage('过早')).toBe(false)
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    expect(store.messages.at(-1)?.status).toBe('cancelled')
    expect(store.canSend).toBe(true)
    expect(store.sendMessage('立即继续')).toBe(true)
    store.disconnect()
  })

  it('会话操作按序执行，期间不能发送聊天', async () => {
    const fake = fakeTransport()
    const first = deferred<{ id: string; title: string; updatedAt: number; messages: [] }>()
    fake.transport.createSession.mockReturnValueOnce(first.promise)
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('已有消息')
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    const create = store.createSession()
    const select = store.selectSession('s2')
    await flush()
    expect(fake.transport.selectSession).not.toHaveBeenCalled()
    expect(store.canSend).toBe(false)
    first.resolve({ id: 's3', title: '三', updatedAt: 3, messages: [] })
    await create
    await select
    expect(store.activeSessionId).toBe('s2')
    expect(store.canSend).toBe(true)
    store.disconnect()
  })

  it('断线结束正在显示的生成，迟到增量及终态不覆盖界面', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('断线')
    fake.emit('offline')
    fake.streams[0]!.delta('迟到')
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    expect(store.connectionState).toBe('offline')
    expect(store.runState).toBe('idle')
    expect(store.messages.at(-1)).toMatchObject({ content: '', status: 'error' })
  })

  it('重连前的会话结果不能覆盖新快照', async () => {
    const fake = fakeTransport()
    const old = deferred<{ sessionId: string; messages: [] }>()
    fake.transport.selectSession.mockReturnValueOnce(old.promise)
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    const selection = store.selectSession('s2')
    await flush()
    await store.connect()
    old.resolve({ sessionId: 's2', messages: [] })
    await selection
    expect(store.activeSessionId).toBe('s1')
    expect(store.canSend).toBe(true)
    store.disconnect()
  })

  it('尚未连接时拒绝发送', () => {
    const store = useChatStore()
    expect(store.sendMessage('测试')).toBe(false)
  })

  it('连续新建复用当前空会话并保留草稿', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.draft = '未发送草稿'
    expect(await store.createSession()).toBe(true)
    expect(await store.createSession()).toBe(true)
    expect(store.activeSessionId).toBe('s1')
    expect(store.draft).toBe('未发送草稿')
    expect(store.sessions).toHaveLength(2)
    expect(fake.transport.createSession).not.toHaveBeenCalled()
    expect(fake.transport.selectSession).not.toHaveBeenCalled()
    store.disconnect()
  })

  it('从有消息的会话新建时切回已有空会话，切换失败不额外创建', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.draft = '空会话草稿'
    await store.selectSession('s2')
    store.sendMessage('二的消息')
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    fake.transport.selectSession.mockRejectedValueOnce(new Error('切换失败'))
    expect(await store.createSession()).toBe(false)
    expect(store.activeSessionId).toBe('s2')
    expect(store.errorMessage).toBe('切换失败')
    expect(await store.createSession()).toBe(true)
    expect(store.activeSessionId).toBe('s1')
    expect(store.draft).toBe('空会话草稿')
    expect(store.messages).toHaveLength(0)
    expect(fake.transport.createSession).not.toHaveBeenCalled()
    store.disconnect()
  })

  it('没有空会话时排队的新建只创建一次，失败消息仍算已有内容', async () => {
    const fake = fakeTransport()
    const first = deferred<{ id: string; title: string; updatedAt: number; messages: [] }>()
    fake.transport.createSession.mockReturnValueOnce(first.promise)
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('失败消息')
    fake.streams[0]!.reject(new ResponseError(17, '供应商失败', true))
    await flush()
    const create = store.createSession()
    const duplicate = store.createSession()
    await flush()
    expect(fake.transport.createSession).toHaveBeenCalledTimes(1)
    first.resolve({ id: 's3', title: '新的会话', updatedAt: 3, messages: [] })
    expect(await create).toBe(true)
    expect(await duplicate).toBe(true)
    expect(fake.transport.createSession).toHaveBeenCalledTimes(1)
    expect(store.activeSessionId).toBe('s3')
    expect(store.messages).toHaveLength(0)
    store.disconnect()
  })

  it('失败记录与重试绑定原会话，返回后只替换对应回答', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('只发送到一')
    fake.streams[0]!.delta('半截失败回答')
    fake.streams[0]!.reject(new ResponseError(17, '一的错误', true))
    await flush()
    const userId = store.messages[0]!.id
    expect(await store.selectSession('s2')).toBe(true)
    expect(store.errorMessage).toBe('')
    expect(store.canRetry).toBe(false)
    store.retryLastMessage()
    expect(fake.transport.sendMessage).toHaveBeenCalledTimes(1)
    expect(await store.selectSession('s1')).toBe(true)
    expect(store.errorMessage).toBe('一的错误')
    expect(store.messages.at(-1)?.content).toBe('半截失败回答')
    store.retryLastMessage()
    expect(fake.transport.sendMessage).toHaveBeenLastCalledWith(
      { sessionId: 's1', text: '只发送到一' },
      expect.any(Function),
    )
    expect(store.messages).toHaveLength(2)
    expect(store.messages[0]!.id).toBe(userId)
    expect(store.messages.at(-1)).toMatchObject({ content: '', status: 'streaming' })
    store.disconnect()
  })

  it('草稿按会话恢复，新建和重连使用空草稿', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('一的消息')
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    store.draft = '一的草稿'
    await store.selectSession('s2')
    expect(store.draft).toBe('')
    store.sendMessage('二的消息')
    fake.streams[1]!.resolve({ status: 'cancelled' })
    await flush()
    store.draft = '二的草稿'
    await store.selectSession('s1')
    expect(store.draft).toBe('一的草稿')
    await store.createSession()
    expect(store.draft).toBe('')
    await store.selectSession('s2')
    expect(store.draft).toBe('二的草稿')
    await store.connect()
    expect(store.draft).toBe('')
    expect(store.sessionViews.size).toBe(1)
    store.disconnect()
  })

  it('同步发送异常保留草稿并回滚占位消息，下一次发送不重复用户消息', async () => {
    const fake = fakeTransport()
    fake.transport.sendMessage.mockImplementationOnce(() => {
      throw new Error('同步发送失败')
    })
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.draft = '保留输入'
    expect(store.sendMessage(store.draft)).toBe(false)
    expect(store.draft).toBe('保留输入')
    expect(store.messages).toHaveLength(0)
    expect(store.runState).toBe('idle')
    expect(store.errorMessage).toBe('同步发送失败')
    expect(store.sendMessage(store.draft)).toBe(true)
    expect(store.draft).toBe('')
    expect(store.messages.filter((message) => message.role === 'user')).toHaveLength(1)
    store.disconnect()
  })

  it('真实请求层同步写入失败时保留原因，不留下运行对象或流式消息', async () => {
    let receive: (frame: BinaryFrame) => void
    const channel: BinaryChannel = {
      async open(onMessage) {
        receive = onMessage
      },
      send(frame) {
        const request = decodeMessage(frame)
        if (request.name !== 'LoginReq') throw new Error('socket 写入失败')
        queueMicrotask(() =>
          receive(
            encodeMessage(request.messageId, 'LoginRes', {
              ret: 1,
              snapshot: {
                sessions: [{ id: 's1', title: '新的会话', updatedAt: 1 }],
                activeSessionId: 's1',
                messages: [],
              },
            }),
          ),
        )
      },
      close() {},
    }
    const store = useChatStore()
    store.setTransport(new ChatClient(channel))
    await store.connect()
    store.draft = '写入失败'
    expect(store.sendMessage(store.draft)).toBe(false)
    await flush()
    expect(store.connectionState).toBe('error')
    expect(store.errorMessage).toBe('socket 写入失败')
    expect(store.messages).toHaveLength(0)
    expect(store.draft).toBe('写入失败')
    expect(store.runState).toBe('idle')
    store.disconnect()
  })

  it('不可重试错误保留原文，后续新发送保留之前的失败记录', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('不能重试')
    fake.streams[0]!.reject(new ResponseError(12, '内容过长', false))
    await flush()
    expect(store.canRetry).toBe(false)
    expect(store.messages[0]?.content).toBe('不能重试')
    store.sendMessage('新消息')
    fake.streams[1]!.reject(new ResponseError(17, '可重试', true))
    await flush()
    store.retryLastMessage()
    expect(store.messages).toHaveLength(4)
    expect(store.messages[1]?.status).toBe('error')
    expect(store.messages[3]?.status).toBe('streaming')
    store.disconnect()
  })

  it('会话操作失败保留原会话，后续操作仍可执行', async () => {
    const fake = fakeTransport()
    fake.transport.createSession.mockRejectedValueOnce(new Error('创建失败'))
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('已有消息')
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    expect(await store.createSession()).toBe(false)
    expect(store.activeSessionId).toBe('s1')
    expect(store.errorMessage).toBe('创建失败')
    expect(store.sessionBusy).toBe(false)
    expect(await store.selectSession('s2')).toBe(true)
    store.disconnect()
  })

  it('取消失败恢复运行，仍接受原回答终态', async () => {
    const fake = fakeTransport()
    const store = useChatStore()
    store.setTransport(fake.transport)
    await store.connect()
    store.sendMessage('继续运行')
    fake.streams[0]!.cancel.mockRejectedValueOnce(new Error('取消失败'))
    await store.cancelRun()
    expect(store.runState).toBe('running')
    expect(store.errorMessage).toBe('取消失败')
    fake.streams[0]!.resolve({ status: 'cancelled' })
    await flush()
    expect(store.messages.at(-1)?.status).toBe('cancelled')
    expect(store.errorMessage).toBe('')
    expect(store.canSend).toBe(true)
    store.disconnect()
  })
})
