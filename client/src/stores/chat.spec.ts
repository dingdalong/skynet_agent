import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from './chat'
import type {
  ChatSession,
  ChatTransport,
  ChatUpdate,
  TransportConnectionListener,
  UserSnapshot,
} from '../types/chat'

const session = (id = 's1', revision = 1): ChatSession => ({
  id,
  revision,
  title: '会话',
  updatedAt: 1,
  messages: [],
  runId: '',
  cancelling: false,
})
const snapshot = (): UserSnapshot => ({
  userId: 'u1',
  username: 'alice',
  sessions: [session(), session('s2')],
})
const assistant = (status: 'streaming' | 'complete' | 'error' = 'streaming') => ({
  id: 'm1',
  role: 'assistant' as const,
  content: '',
  createdAt: 1,
  status,
  runId: 'r1',
  error: status === 'error' ? '失败' : '',
  retryable: true,
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
function fixture() {
  let update: ((value: ChatUpdate) => void) | null = null
  let connection: TransportConnectionListener | null = null
  const transport = {
    connect: vi.fn<ChatTransport['connect']>().mockImplementation(async () => snapshot()),
    snapshot: vi.fn<ChatTransport['snapshot']>().mockImplementation(async () => snapshot()),
    createSession: vi.fn<ChatTransport['createSession']>().mockResolvedValue(session('s3')),
    sendMessage: vi.fn<ChatTransport['sendMessage']>().mockResolvedValue(session('s1', 2)),
    cancelRun: vi.fn<ChatTransport['cancelRun']>().mockResolvedValue(),
    close: vi.fn(),
    subscribeUpdates: vi.fn<ChatTransport['subscribeUpdates']>().mockImplementation((listener) => {
      update = listener
      return () => {
        update = null
      }
    }),
    subscribeConnection: vi
      .fn<ChatTransport['subscribeConnection']>()
      .mockImplementation((listener) => {
        connection = listener
        return () => {
          connection = null
        }
      }),
  }
  const store = useChatStore()
  store.setTransport(transport)
  return {
    store,
    transport,
    update: (value: ChatUpdate) => update?.(value),
    offline: () => connection?.({ state: 'error', error: new Error('断线') }),
  }
}

describe('用户聊天状态', () => {
  beforeEach(() => {
    const storage = () => {
      const data = new Map<string, string>()
      return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
      }
    }
    vi.stubGlobal('localStorage', storage())
    vi.stubGlobal('sessionStorage', storage())
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('按用户名恢复快照并保存本页会话选择', async () => {
    const { store, transport } = fixture()
    await store.connect(' alice ')
    expect(transport.connect).toHaveBeenCalledWith('alice')
    await store.selectSession('s2')
    await store.connect()
    expect(store.activeSessionId).toBe('s2')
    expect(localStorage.getItem('skynet.username')).toBe('alice')
    store.disconnect()
  })

  it('多端创建不改变本端选择，草稿按会话独立', async () => {
    const { store, update } = fixture()
    await store.connect('alice')
    await store.selectSession('s1')
    store.draft = '本端草稿'
    update({ type: 'session', session: session('new') })
    expect(store.activeSessionId).toBe('s1')
    await store.selectSession('s2')
    store.draft = '另一草稿'
    await store.selectSession('s1')
    expect(store.draft).toBe('本端草稿')
    store.disconnect()
  })

  it('同步生成进度，忽略重复与迟到版本，完整状态可跨版本恢复', async () => {
    const { store, update } = fixture()
    await store.connect('alice')
    await store.selectSession('s1')
    update({
      type: 'session',
      session: { ...session('s1', 2), runId: 'r1', messages: [assistant()] },
    })
    const delta: ChatUpdate = {
      type: 'delta',
      sessionId: 's1',
      runId: 'r1',
      messageId: 'm1',
      revision: 3,
      delta: '回答',
    }
    update(delta)
    update(delta)
    expect(store.messages[0]?.content).toBe('回答')
    expect(store.runState).toBe('running')
    update({
      type: 'session',
      session: { ...session('s1', 5), messages: [{ ...assistant('complete'), content: '完整' }] },
    })
    update({ type: 'session', session: session('s1', 2) })
    expect(store.messages[0]?.content).toBe('完整')
    expect(store.runState).toBe('idle')
    store.disconnect()
  })

  it('增量缺口拉取快照，期间继续缓冲并按版本合并', async () => {
    const { store, transport, update } = fixture()
    await store.connect('alice')
    await store.selectSession('s1')
    const pending = deferred<UserSnapshot>()
    transport.snapshot.mockReturnValue(pending.promise)
    update({
      type: 'delta',
      sessionId: 's1',
      runId: 'r1',
      messageId: 'm1',
      revision: 4,
      delta: '四',
    })
    update({
      type: 'delta',
      sessionId: 's1',
      runId: 'r1',
      messageId: 'm1',
      revision: 5,
      delta: '五',
    })
    pending.resolve({
      ...snapshot(),
      sessions: [
        { ...session('s1', 4), runId: 'r1', messages: [{ ...assistant(), content: '四' }] },
      ],
    })
    await flush()
    expect(transport.snapshot).toHaveBeenCalledTimes(1)
    expect(store.messages[0]?.content).toBe('四五')
    store.disconnect()
  })

  it('登录阶段先安装快照，再合并收到的更新', async () => {
    const { store, transport, update } = fixture()
    const pending = deferred<UserSnapshot>()
    transport.connect.mockReturnValue(pending.promise)
    const connecting = store.connect('alice')
    update({ type: 'session', session: { ...session('s1', 2), title: '更新标题' } })
    pending.resolve(snapshot())
    await connecting
    expect(store.sessionViews.get('s1')?.title).toBe('更新标题')
    store.disconnect()
  })

  it('某会话生成期间可以切换到其他会话并发送', async () => {
    const { store, update, transport } = fixture()
    await store.connect('alice')
    update({
      type: 'session',
      session: { ...session('s1', 2), runId: 'r1', messages: [assistant()] },
    })
    await store.selectSession('s1')
    expect(store.canSend).toBe(false)
    await store.selectSession('s2')
    expect(store.sendMessage('第二个会话')).toBe(true)
    await flush()
    expect(transport.sendMessage).toHaveBeenCalledWith({
      sessionId: 's2',
      text: '第二个会话',
      retryRunId: undefined,
    })
    store.disconnect()
  })

  it('取消任务使用恢复的 run_id，确认不提前改变生成状态', async () => {
    const { store, update, transport } = fixture()
    await store.connect('alice')
    await store.selectSession('s1')
    update({
      type: 'session',
      session: { ...session('s1', 2), runId: 'r1', messages: [assistant()] },
    })
    await store.cancelRun()
    expect(transport.cancelRun).toHaveBeenCalledWith('s1', 'r1')
    expect(store.runState).toBe('running')
    update({
      type: 'session',
      session: { ...session('s1', 3), runId: 'r1', cancelling: true, messages: [assistant()] },
    })
    expect(store.runState).toBe('cancelling')
    store.disconnect()
  })

  it('恢复失败状态后重试绑定该会话和失败任务', async () => {
    const { store, transport } = fixture()
    transport.connect.mockResolvedValue({
      ...snapshot(),
      sessions: [{ ...session(), messages: [assistant('error')] }],
    })
    await store.connect('alice')
    expect(store.errorMessage).toBe('失败')
    store.retryLastMessage()
    await flush()
    expect(transport.sendMessage).toHaveBeenCalledWith({
      sessionId: 's1',
      text: '',
      retryRunId: 'r1',
    })
    store.disconnect()
  })

  it('发送前登记占用，同步失败保留草稿且可再次发送', async () => {
    const { store, transport } = fixture()
    await store.connect('alice')
    store.draft = '草稿'
    transport.sendMessage.mockImplementation(() => {
      throw new Error('同步错误')
    })
    expect(store.sendMessage('草稿')).toBe(true)
    await flush()
    expect(store.draft).toBe('草稿')
    expect(store.runState).toBe('idle')
    expect(store.errorMessage).toBe('同步错误')
    store.disconnect()
  })

  it('断线自动恢复，不自动重放命令；切换用户取消重连', async () => {
    vi.useFakeTimers()
    const { store, transport, offline } = fixture()
    await store.connect('alice')
    offline()
    expect(store.sessions).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1000)
    expect(transport.connect).toHaveBeenCalledTimes(2)
    expect(transport.sendMessage).not.toHaveBeenCalled()
    offline()
    store.switchUser()
    await vi.advanceTimersByTimeAsync(20000)
    expect(transport.connect).toHaveBeenCalledTimes(2)
  })

  it('旧命令迟到结果不能污染重新绑定后的用户', async () => {
    const { store, transport } = fixture()
    await store.connect('alice')
    const pending = deferred<ChatSession>()
    transport.sendMessage.mockReturnValue(pending.promise)
    store.sendMessage('旧问题')
    await store.connect('alice')
    pending.resolve({ ...session('s1', 99), title: '迟到' })
    await flush()
    expect(store.sessionViews.get('s1')?.title).toBe('会话')
    store.disconnect()
  })

  it('服务器重启得到新 user_id 时丢弃旧缓存，非法用户名不连接', async () => {
    const { store, transport } = fixture()
    await store.connect('alice')
    transport.connect.mockResolvedValue({
      userId: 'u2',
      username: 'alice',
      sessions: [session('fresh')],
    })
    await store.connect()
    expect(store.sessions.map((item) => item.id)).toEqual(['fresh'])
    await store.connect('')
    expect(transport.connect).toHaveBeenCalledTimes(2)
    expect(store.connectionError).toContain('用户名')
    store.disconnect()
  })
})
