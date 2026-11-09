import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  createNativeChatRuntime,
  type NativeChatEvent,
  type NativeChatState,
} from './native-chat-runtime'

const channels = vi.hoisted(() => [] as Array<{ onmessage: (event: NativeChatEvent) => void }>)
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => false,
  invoke: vi.fn(),
  Channel: class {
    onmessage = () => {}
    constructor() {
      channels.push(this)
    }
  },
}))
const state = (): NativeChatState => ({
  username: 'alice',
  userId: 'u1',
  selection: { kind: 'session', sessionId: 's1' },
  localDraft: null,
  defaultModelId: 'flash',
  permissionModelId: '',
  connectionState: 'connected',
  connectionError: '',
  pendingSends: [],
  sessions: [
    {
      id: 's1',
      title: '会话',
      updatedAt: 1,
      revision: 1,
      messages: [],
      runId: '',
      cancelling: false,
      draft: '草稿',
      error: '',
    },
  ],
})
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
function publish(value = state(), channel = channels[0]!) {
  channel.onmessage({ type: 'state', state: value })
}
function draftState(): NativeChatState {
  return {
    ...state(),
    selection: { kind: 'draft', draftId: 'd1' },
    localDraft: { id: 'd1', text: '首条草稿', modelId: 'pro', error: '', sending: false },
  }
}

beforeEach(() => {
  channels.length = 0
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command) => (command === 'chat_attach' ? 'binding' : true))
})
afterEach(() => vi.unstubAllGlobals())

describe('Rust 客户端界面适配', () => {
  it('本地草稿使用独立target，迟到回显不覆盖输入，首发绑定后清理本地投影', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish(draftState())
    runtime.setDraft('本地新输入')
    publish(draftState())
    expect(runtime.state.localDraft?.text).toBe('本地新输入')
    await flush()
    expect(invoke).toHaveBeenCalledWith('chat_action', {
      subscription: 'binding',
      action: { type: 'setDraft', target: { kind: 'draft', draftId: 'd1' }, value: '本地新输入' },
    })
    publish(state())
    expect(runtime.state.localDraft).toBeNull()
    expect(runtime.state.selection).toEqual({ kind: 'session', sessionId: 's1' })
    runtime.detach()
  })
  it('首发立即冻结草稿且迟到状态不解除占用，其他会话仍可选择', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish(draftState())
    expect(runtime.sendMessage('首条草稿')).toBe(true)
    publish(draftState())
    expect(runtime.state.localDraft?.sending).toBe(true)
    expect(runtime.sendMessage('重复')).toBe(false)
    runtime.setDraft('被阻止')
    expect(runtime.state.localDraft?.text).toBe('首条草稿')
    expect(await runtime.setModel('flash')).toBe(false)
    await runtime.selectSession('s1')
    expect(runtime.state.selection).toEqual({ kind: 'session', sessionId: 's1' })
    publish({ ...state(), localDraft: { ...draftState().localDraft!, sending: true } })
    expect(runtime.state.localDraft?.sending).toBe(true)
    publish(state())
    expect(runtime.state.localDraft).toBeNull()
    expect(runtime.state.selection).toEqual({ kind: 'session', sessionId: 's1' })
    runtime.detach()
  })
  it('重新订阅直接恢复Rust中的待确认草稿，不发新的发送命令', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish({ ...draftState(), localDraft: { ...draftState().localDraft!, sending: true } })
    runtime.detach()
    await runtime.attach()
    publish(
      { ...draftState(), localDraft: { ...draftState().localDraft!, sending: true } },
      channels[1]!,
    )
    expect(runtime.state.localDraft?.text).toBe('首条草稿')
    expect(runtime.state.localDraft?.sending).toBe(true)
    expect(runtime.sendMessage('重复')).toBe(false)
    expect(
      vi.mocked(invoke).mock.calls.filter(([command]) => command === 'chat_action'),
    ).toHaveLength(0)
    runtime.detach()
  })
  it('核心拒绝首发时解除乐观占用，保留草稿', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish(draftState())
    vi.mocked(invoke).mockResolvedValueOnce(false)
    runtime.sendMessage('首条草稿')
    await flush()
    expect(runtime.state.localDraft?.sending).toBe(false)
    expect(runtime.state.localDraft?.text).toBe('首条草稿')
    runtime.detach()
  })
  it('同草稿旧发送的拒绝回包迟到，不解除下一次发送的占用', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish(draftState())
    let firstReply!: (value: boolean) => void
    vi.mocked(invoke).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          firstReply = resolve
        }),
    )
    runtime.sendMessage('第一次发送')
    await flush()
    publish({ ...draftState(), localDraft: { ...draftState().localDraft!, sending: true } })
    publish({ ...draftState(), localDraft: { ...draftState().localDraft!, error: '首次被拒绝' } })
    let secondReply!: (value: boolean) => void
    vi.mocked(invoke).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          secondReply = resolve
        }),
    )
    expect(runtime.sendMessage('再次发送')).toBe(true)
    await flush()
    firstReply(false)
    await flush()
    expect(runtime.state.localDraft?.sending).toBe(true)
    expect(runtime.sendMessage('重复发送')).toBe(false)
    secondReply(false)
    await flush()
    expect(runtime.state.localDraft?.sending).toBe(false)
    runtime.detach()
  })
  it('新建复用指定草稿，首发抢先完成时不会留下过期的乐观选择', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish({ ...draftState(), selection: { kind: 'session', sessionId: 's1' } })
    let reply!: (value: boolean) => void
    vi.mocked(invoke).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          reply = resolve
        }),
    )
    const create = runtime.createSession()
    expect(runtime.state.selection).toEqual({ kind: 'draft', draftId: 'd1' })
    await flush()
    expect(invoke).toHaveBeenLastCalledWith('chat_action', {
      subscription: 'binding',
      action: { type: 'createSession', draftId: 'd1' },
    })
    publish(state())
    reply(false)
    await create
    expect(runtime.state.selection).toEqual({ kind: 'session', sessionId: 's1' })
    expect(runtime.state.localDraft).toBeNull()
    runtime.detach()
  })
  it('合并重复挂载，只解除页面订阅，旧页面更新不会写入新页面', async () => {
    const runtime = createNativeChatRuntime()
    await Promise.all([runtime.attach(), runtime.attach()])
    publish()
    expect(runtime.state.userId).toBe('u1')
    expect(
      vi.mocked(invoke).mock.calls.filter(([command]) => command === 'chat_attach'),
    ).toHaveLength(1)
    runtime.detach()
    publish({ ...state(), username: 'old-page' })
    expect(runtime.state.username).toBe('alice')
    expect(invoke).toHaveBeenLastCalledWith('chat_detach', { subscription: 'binding' })
    await runtime.attach()
    publish({ ...state(), username: 'fresh' }, channels[1]!)
    expect(runtime.state.username).toBe('fresh')
    runtime.detach()
  })
  it('迟到的草稿回显不覆盖新输入，核心确认后采用新的权威状态', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish()
    runtime.setDraft('新输入一')
    runtime.setDraft('新输入二')
    publish({ ...state(), sessions: [{ ...state().sessions[0]!, draft: '新输入一' }] })
    expect(runtime.state.sessionViews.get('s1')?.draft).toBe('新输入二')
    publish({ ...state(), sessions: [{ ...state().sessions[0]!, draft: '新输入二' }] })
    publish({ ...state(), sessions: [{ ...state().sessions[0]!, draft: '' }] })
    expect(runtime.state.sessionViews.get('s1')?.draft).toBe('')
    await flush()
    expect(invoke).toHaveBeenCalledWith('chat_action', {
      subscription: 'binding',
      action: { type: 'setDraft', target: { kind: 'session', sessionId: 's1' }, value: '新输入二' },
    })
    runtime.detach()
  })
  it('发送前立即占用，连接命令交给核心，流增量只更新页面投影', async () => {
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish()
    expect(runtime.sendMessage('消息')).toBe(true)
    expect(runtime.sendMessage('重复')).toBe(false)
    await flush()
    const session = {
      ...state().sessions[0]!,
      runId: 'r1',
      messages: [
        {
          id: 'm1',
          role: 'assistant' as const,
          content: '',
          createdAt: 1,
          status: 'streaming' as const,
          runId: 'r1',
          error: '',
          retryable: false,
        },
      ],
    }
    publish({ ...state(), sessions: [session] })
    channels[0]!.onmessage({
      type: 'delta',
      update: {
        type: 'delta',
        sessionId: 's1',
        messageId: 'm1',
        runId: 'r1',
        revision: 2,
        delta: '回答',
      },
    })
    expect(runtime.state.sessionViews.get('s1')?.messages[0]?.content).toBe('回答')
    expect(runtime.state.sessionViews.get('s1')?.revision).toBe(2)
    channels[0]!.onmessage({
      type: 'reasoning',
      update: {
        type: 'reasoning',
        sessionId: 's1',
        messageId: 'm1',
        toolCallId: '',
        revision: 3,
        block: { id: 'b1', runId: 'r1', modelId: 'pro', text: '思考增量', status: 'streaming' },
      },
    })
    const message = runtime.state.sessionViews.get('s1')?.messages[0]
    expect(message?.content).toBe('回答')
    expect(message?.reasoning?.[0]?.text).toBe('思考增量')
    expect(runtime.state.sessionViews.get('s1')?.revision).toBe(3)
    runtime.detach()
  })
  it('挂载失败显示错误，下一次可重新挂载而不会遗留连接命令', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    expect(runtime.state.connectionState).toBe('error')
    await runtime.attach()
    publish(state(), channels[1]!)
    expect(runtime.state.connectionState).toBe('connected')
    runtime.detach()
    log.mockRestore()
  })
  it('旧命令拒绝不会覆盖随后到达的权威状态', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const runtime = createNativeChatRuntime()
    await runtime.attach()
    publish()
    let reject!: (error: Error) => void
    vi.mocked(invoke).mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        }),
    )
    runtime.sendMessage('消息')
    await flush()
    publish({ ...state(), pendingSends: ['s1'] })
    reject(new Error('旧连接已关闭'))
    await flush()
    expect(runtime.state.connectionError).toBe('')
    expect(runtime.state.pendingSends.has('s1')).toBe(true)
    runtime.detach()
    log.mockRestore()
  })
})
