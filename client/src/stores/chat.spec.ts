import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from './chat'
import { createBrowserChatRuntime } from '../services/browser-chat-runtime'
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
  defaultModelId: 'flash',
  permissionModelId: '',
  models: [
    { id: 'flash', name: 'Flash', model: 'flash' },
    { id: 'pro', name: 'Pro', model: 'pro' },
  ],
  chatSessions: [session(), session('s2')],
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
    setModel: vi.fn<ChatTransport['setModel']>(),
    connect: vi.fn<ChatTransport['connect']>().mockImplementation(async () => snapshot()),
    snapshot: vi.fn<ChatTransport['snapshot']>().mockImplementation(async () => snapshot()),
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
  store.setRuntime(createBrowserChatRuntime(transport))
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

  it('空快照可编辑本地草稿，重复新建和预选模型不请求服务器', async () => {
    const { store, transport } = fixture()
    transport.connect.mockResolvedValue({ ...snapshot(), chatSessions: [] })
    await store.connect('alice')
    expect(store.canSend).toBe(true)
    expect(store.sessions).toHaveLength(0)
    expect(store.modelId).toBe('flash')
    expect(store.permissionModelId).toBe('flash')
    store.draft = '首条消息'
    const id = store.localDraft?.id
    await store.createSession()
    await store.createSession()
    await store.setModel('pro')
    expect(store.localDraft?.id).toBe(id)
    expect(store.draft).toBe('首条消息')
    expect(store.modelId).toBe('pro')
    expect(store.activeSessionId).toBeNull()
    expect(transport.setModel).not.toHaveBeenCalled()
    expect(transport.sendMessage).not.toHaveBeenCalled()
    store.disconnect()
  })

  it('首发无会话ID，等待确认时冻结草稿和模型，通知早到不回滚版本', async () => {
    const { store, transport, update } = fixture()
    transport.connect.mockResolvedValue({ ...snapshot(), chatSessions: [] })
    await store.connect('alice')
    await store.setModel('pro')
    store.draft = '首条消息'
    const pending = deferred<ChatSession>()
    transport.sendMessage.mockReturnValue(pending.promise)
    expect(store.sendMessage('首条消息')).toBe(true)
    expect(store.sendMessage('重复')).toBe(false)
    expect(store.sending).toBe(true)
    expect(store.canOperateSessions).toBe(true)
    store.draft = '被阻止的编辑'
    expect(await store.setModel('flash')).toBe(false)
    await store.createSession()
    expect(store.draft).toBe('首条消息')
    expect(store.modelId).toBe('pro')
    expect(transport.sendMessage).toHaveBeenCalledWith({ text: '首条消息', modelId: 'pro' })
    update({
      type: 'session',
      session: { ...session('created', 3), title: '较新状态', modelId: 'pro' },
    })
    expect(store.activeSessionId).toBeNull()
    pending.resolve({ ...session('created', 2), title: '旧确认', modelId: 'pro' })
    await flush()
    expect(store.activeSessionId).toBe('created')
    expect(store.activeSession?.title).toBe('较新状态')
    expect(store.localDraft).toBeNull()
    expect(store.draft).toBe('')
    store.disconnect()
  })

  it('首发确认不抢走已切换的会话，既有会话仍可并发发送', async () => {
    const { store, transport } = fixture()
    await store.connect('alice')
    await store.createSession()
    store.draft = '新问题'
    const pending = deferred<ChatSession>()
    transport.sendMessage.mockReturnValueOnce(pending.promise)
    store.sendMessage('新问题')
    await store.selectSession('s2')
    expect(store.sendMessage('另一个问题')).toBe(true)
    await flush()
    pending.resolve(session('created'))
    await flush()
    expect(store.activeSessionId).toBe('s2')
    expect(store.localDraft).toBeNull()
    expect(store.sessions).toHaveLength(3)
    await store.createSession()
    expect(store.draft).toBe('')
    expect(store.modelId).toBe('flash')
    store.disconnect()
  })

  it('首发拒绝保留草稿和模型，错误只属于该草稿', async () => {
    const { store, transport } = fixture()
    await store.connect('alice')
    await store.createSession()
    await store.setModel('pro')
    store.draft = '保留内容'
    transport.sendMessage.mockRejectedValueOnce(new Error('创建被拒绝'))
    store.sendMessage('保留内容')
    await flush()
    expect(store.sending).toBe(false)
    expect(store.canSend).toBe(true)
    expect(store.errorMessage).toBe('创建被拒绝')
    await store.selectSession('s1')
    expect(store.errorMessage).toBe('')
    await store.createSession()
    expect(store.draft).toBe('保留内容')
    expect(store.modelId).toBe('pro')
    store.dismissError()
    expect(store.errorMessage).toBe('')
    store.disconnect()
  })

  it('本地草稿跨同用户重连保留，首发确认丢失不猜测关联或重放', async () => {
    vi.useFakeTimers()
    const { store, transport, offline } = fixture()
    await store.connect('alice')
    await store.createSession()
    store.draft = '确认丢失'
    const pending = deferred<ChatSession>()
    transport.sendMessage.mockReturnValueOnce(pending.promise)
    store.sendMessage('确认丢失')
    offline()
    transport.connect.mockResolvedValue({
      ...snapshot(),
      chatSessions: [session('server-created')],
    })
    await vi.advanceTimersByTimeAsync(1000)
    pending.resolve(session('server-created', 99))
    await flush()
    expect(store.activeSessionId).toBeNull()
    expect(store.draft).toBe('确认丢失')
    expect(store.sending).toBe(false)
    expect(store.sessionViews.get('server-created')?.revision).toBe(1)
    expect(transport.sendMessage).toHaveBeenCalledTimes(1)
    store.switchUser()
    expect(store.localDraft).toBeNull()
  })

  it('Web页面的新运行时从快照恢复真实会话，不恢复页面内草稿', async () => {
    const { store, transport } = fixture()
    await store.connect('alice')
    await store.selectSession('s1')
    await store.createSession()
    store.draft = '仅页面内保存'
    store.setRuntime(createBrowserChatRuntime(transport))
    await store.connect('alice')
    expect(store.activeSessionId).toBe('s1')
    expect(store.localDraft).toBeNull()
    expect(store.draft).toBe('')
    store.disconnect()
  })

  it('回答结束后的后台工具更新仍按消息定位，重复版本不覆盖', async () => {
    const { store, update } = fixture()
    await store.connect('alice')
    await store.selectSession('s1')
    update({ type: 'session', session: { ...session('s1', 2), messages: [assistant('complete')] } })
    const tool = {
      id: 't1',
      name: 'exec_command',
      arguments: '{}',
      status: 'running' as const,
      permissionReason: '允许',
      permissionMode: 'use_default',
      output: 'background',
      truncated: false,
      changedFiles: [],
      error: '',
      processId: 'p1',
      runId: 'r1',
      workingDirectory: '/work',
    }
    update({ type: 'tool', sessionId: 's1', messageId: 'm1', tool, revision: 3 })
    update({
      type: 'tool',
      sessionId: 's1',
      messageId: 'm1',
      tool: { ...tool, output: 'stale' },
      revision: 3,
    })
    expect(store.messages[0]?.toolCalls?.[0]?.output).toBe('background')
    expect(store.runState).toBe('idle')
    update({
      type: 'tool',
      sessionId: 's1',
      messageId: 'm1',
      tool: { ...tool, status: 'completed' },
      revision: 4,
    })
    expect(store.messages[0]?.toolCalls?.[0]?.status).toBe('completed')
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
      chatSessions: [
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
      chatSessions: [{ ...session(), messages: [assistant('error')] }],
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
      ...snapshot(),
      userId: 'u2',
      username: 'alice',
      chatSessions: [session('fresh')],
    })
    await store.connect()
    expect(store.sessions.map((item) => item.id)).toEqual(['fresh'])
    await store.connect('')
    expect(transport.connect).toHaveBeenCalledTimes(2)
    expect(store.connectionError).toContain('用户名')
    store.disconnect()
  })
})
