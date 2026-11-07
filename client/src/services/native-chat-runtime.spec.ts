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
  activeSessionId: 's1',
  connectionState: 'connected',
  connectionError: '',
  sessionOperations: 0,
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

beforeEach(() => {
  channels.length = 0
  vi.mocked(invoke)
    .mockReset()
    .mockImplementation(async (command) => (command === 'chat_attach' ? 'binding' : true))
})
afterEach(() => vi.unstubAllGlobals())

describe('Rust 客户端界面适配', () => {
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
      action: { type: 'setDraft', sessionId: 's1', value: '新输入二' },
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
