import type { ServerMessage } from '../protocol/messages'
import type { BinaryChannel, BinaryFrame } from '../network/websocket-channel'
import { decodeMessage, encodeMessage } from '../protocol/agent-gateway-codec'
import { errorCode } from '../protocol/error-code'
import type { skynet } from '../protocol/generated/agent_gateway.js'

type Message = skynet.agent.v1.ChatMessage.$Properties
interface Session {
  id: string
  title: string
  updatedAt: number
  revision: number
  messages: Message[]
  runId: string
  cancelling: boolean
  modelId?: string
  permissionModelId?: string
}
interface MockUser {
  userId: string
  username: string
  sessions: Session[]
  channels: Set<MockAgentChannel>
  timers: Map<string, number>
}

// Mock 后端的寿命独立于通道；真实 reload 恢复由全链路测试验证。
const users = new Map<string, MockUser>()
const defaultModelId = 'deepseek-flash'
const models = [
  { id: 'deepseek-flash', name: 'DeepSeek Flash', model: 'deepseek-flash' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek Pro', model: 'deepseek-v4-pro' },
]

function validText(text: unknown): text is string {
  return (
    typeof text === 'string' && text !== '' && new TextEncoder().encode(text).byteLength <= 20_000
  )
}

export class MockAgentChannel implements BinaryChannel {
  private onMessage: ((frame: BinaryFrame) => void) | null = null
  private user: MockUser | null = null
  private generation = 0

  async open(onMessage: (frame: BinaryFrame) => void): Promise<void> {
    this.close()
    this.onMessage = onMessage
  }

  send(frame: Uint8Array): void {
    const request = decodeMessage(frame)
    const args = request.payload as {
      username: string
      sessionId: string
      text: string
      runId: string
      modelId?: string
      retryRunId?: string
    }
    const reply = (payload: Record<string, unknown>) =>
      this.emit({
        name: request.name.replace(/Req$/, 'Res'),
        messageId: request.messageId,
        payload,
      } as ServerMessage)
    const reject = (message: string) =>
      reply({
        ret: errorCode.invalid_param,
        error: { message, retryable: false },
      })
    if (request.name === 'LoginReq') {
      let user = users.get(args.username)
      if (!user) {
        user = {
          userId: crypto.randomUUID(),
          username: args.username,
          sessions: [],
          channels: new Set(),
          timers: new Map(),
        }
        users.set(args.username, user)
        this.user = user
      }
      this.user = user
      user.channels.add(this)
      reply({ ret: 1, snapshot: this.snapshot() })
      return
    }
    const user = this.user
    if (!user) throw new Error('尚未绑定用户')
    if (request.name === 'UserSnapshotReq') {
      reply({ ret: 1, snapshot: this.snapshot() })
      return
    }
    let session = user.sessions.find((item) => item.id === args.sessionId)
    if (request.name === 'ChatReq' && !args.sessionId) {
      if (args.retryRunId) return reject('新会话不能重试消息')
      if (!validText(args.text)) return reject('消息格式无效或内容过长')
      const modelId = args.modelId || defaultModelId
      if (!models.some((model) => model.id === modelId)) return reject('模型不在可选清单中')
      session = this.createSession(modelId)
    }
    if (!session) {
      reply({ ret: 2, error: { message: '会话不存在', retryable: false } })
      return
    }
    if (request.name === 'SessionModelSetReq') {
      if (!models.some((model) => model.id === args.modelId)) return reject('模型不在可选清单中')
      session.modelId = args.modelId
      session.permissionModelId = args.modelId
      this.publishSession(session)
      reply({ ret: 1, chatSession: this.chatSession(session) })
      return
    }
    if (request.name === 'MessageCancelReq') {
      if (session.runId === args.runId && session.runId) {
        window.clearInterval(user.timers.get(session.id))
        user.timers.delete(session.id)
        session.cancelling = true
        this.publishSession(session)
        const message = session.messages.at(-1)!
        message.status = 3
        session.runId = ''
        session.cancelling = false
        this.publishSession(session)
      }
      reply({ ret: 1 })
      return
    }
    if (request.name !== 'ChatReq') throw new Error('Mock 不支持的请求')
    if (session.runId) {
      reply({ ret: 4, error: { message: '该会话仍在生成', retryable: true } })
      return
    }
    let text = args.text
    if (args.retryRunId) {
      const previous = session.messages.at(-1)
      if (
        previous?.runId !== args.retryRunId ||
        previous.status !== 4 ||
        !previous.error?.retryable
      )
        return reject('该消息已不能重试')
      text = session.messages.at(-2)?.content ?? ''
    }
    if (!validText(text)) return reject('消息格式无效或内容过长')
    session.runId = crypto.randomUUID()
    if (!args.retryRunId)
      session.messages.push({
        id: crypto.randomUUID(),
        role: 1,
        content: text,
        createdAt: Date.now(),
        status: 2,
      })
    else session.messages.pop()
    session.title = text.slice(0, 24)
    const message: Message = {
      id: crypto.randomUUID(),
      role: 2,
      content: '',
      createdAt: Date.now(),
      status: 1,
      runId: session.runId,
    }
    session.messages.push(message)
    this.publishSession(session)
    reply({ ret: 1, chatSession: this.chatSession(session) })
    const answer = `这是模拟的 Agent 回复，用于验证界面。你刚才说：“${text}”。`
    let index = 0
    const timer = window.setInterval(() => {
      if (index < answer.length) {
        const delta = answer.slice(index, index + 2)
        index += 2
        message.content += delta
        session.revision++
        this.broadcast(
          {
            name: 'MessageDeltaNtf',
            messageId: 0,
            payload: {
              sessionId: session.id,
              runId: session.runId,
              messageId: message.id,
              delta,
              revision: session.revision,
            },
          },
          user,
        )
      } else {
        window.clearInterval(timer)
        user.timers.delete(session.id)
        message.status = 2
        session.runId = ''
        this.publishSession(session, user)
      }
    }, 32)
    user.timers.set(session.id, timer)
  }

  close(): void {
    this.generation++
    this.user?.channels.delete(this)
    this.user = null
    this.onMessage = null
  }

  private snapshot() {
    return {
      models,
      userId: this.user!.userId,
      username: this.user!.username,
      chatSessions: this.user!.sessions.map((session) => this.chatSession(session)),
      defaultModelId,
      permissionModelId: '',
    }
  }

  private chatSession(session: Session) {
    const { modelId, permissionModelId, ...state } = session
    return { session: state, modelId, permissionModelId }
  }

  private createSession(modelId: string): Session {
    const session: Session = {
      id: `mock-${crypto.randomUUID()}`,
      title: '新的会话',
      updatedAt: Date.now(),
      revision: 0,
      messages: [],
      runId: '',
      cancelling: false,
      modelId,
      permissionModelId: modelId,
    }
    this.user!.sessions.unshift(session)
    return session
  }

  private publishSession(session: Session, user = this.user) {
    session.revision++
    session.updatedAt = Date.now()
    this.broadcast(
      {
        name: 'SessionUpdatedNtf',
        messageId: 0,
        payload: { chatSession: this.chatSession(session) },
      },
      user,
    )
  }

  private broadcast(message: ServerMessage, user = this.user) {
    for (const channel of user?.channels ?? []) channel.emit(message)
  }

  private emit(message: ServerMessage) {
    const generation = this.generation
    const frame = encodeMessage(
      message.messageId,
      message.name,
      message.payload as Record<string, unknown>,
    )
    queueMicrotask(() => {
      if (generation === this.generation) this.onMessage?.(frame)
    })
  }
}
