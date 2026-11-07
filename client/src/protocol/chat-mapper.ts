import { skynet } from './generated/agent_gateway.js'
import { errorCode, formatResponseError } from './error-code'
import type { ChatMessage, ChatSession, UserSnapshot, ChatUpdate } from '../types/chat'

export class ResponseError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
  }
}

export function checkResponse(payload: {
  ret?: number | null
  error?: { message?: string | null; retryable?: boolean | null } | null
}): void {
  if (payload.ret !== errorCode.succ) {
    throw new ResponseError(
      payload.ret ?? 0,
      formatResponseError(payload.ret, payload.error, 'Agent 请求失败'),
      payload.error?.retryable === true,
    )
  }
}

export function requiredString(value: string | null | undefined, field: string): string {
  if (typeof value !== 'string') throw new Error(`Protobuf 缺少字段: ${field}`)
  return value
}

function timestamp(value: unknown): number {
  const number =
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
      ? value.toNumber()
      : Number(value)
  if (value == null || !Number.isSafeInteger(number) || number < 0) {
    throw new Error('Protobuf 时间字段无效')
  }
  return number
}

export function toChatMessage(payload: skynet.agent.v1.ChatMessage.$Properties): ChatMessage {
  const role = payload.role === 1 ? 'user' : payload.role === 2 ? 'assistant' : null
  const status = ({ 1: 'streaming', 2: 'complete', 3: 'cancelled', 4: 'error' } as const)[
    payload.status as 1 | 2 | 3 | 4
  ]
  if (!role || !status) throw new Error('Protobuf 消息角色或状态无效')
  return {
    id: requiredString(payload.id, 'message.id'),
    role,
    content: requiredString(payload.content, 'message.content'),
    createdAt: timestamp(payload.createdAt),
    status,
    runId: payload.runId ?? '',
    error: payload.error ? formatResponseError(payload.ret, payload.error, '生成失败') : '',
    retryable: payload.error?.retryable === true,
  }
}

export function toSession(payload: skynet.agent.v1.SessionState.$Properties): ChatSession {
  const revision = Number(payload.revision)
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('会话版本无效')
  return {
    id: requiredString(payload.id, 'session.id'),
    title: requiredString(payload.title, 'session.title'),
    updatedAt: timestamp(payload.updatedAt),
    revision,
    messages: (payload.messages ?? []).map(toChatMessage),
    runId: payload.runId ?? '',
    cancelling: payload.cancelling === true,
  }
}

export function toSnapshot(payload: skynet.agent.v1.UserSnapshot.$Properties): UserSnapshot {
  const sessions = (payload.sessions ?? []).map(toSession)
  if (!sessions.length) throw new Error('用户快照缺少会话')
  return {
    userId: requiredString(payload.userId, 'userId'),
    username: requiredString(payload.username, 'username'),
    sessions,
  }
}

export function toUpdate(message: import('./messages').ServerMessage): ChatUpdate {
  if (message.name === 'SessionUpdatedNtf' && message.payload.session) {
    return { type: 'session', session: toSession(message.payload.session) }
  }
  if (message.name === 'MessageDeltaNtf') {
    const payload = message.payload
    if (!Number.isSafeInteger(payload.revision) || Number(payload.revision) < 1)
      throw new Error('增量版本无效')
    return {
      type: 'delta',
      sessionId: requiredString(payload.sessionId, 'sessionId'),
      runId: requiredString(payload.runId, 'runId'),
      messageId: requiredString(payload.messageId, 'messageId'),
      delta: requiredString(payload.delta, 'delta'),
      revision: Number(payload.revision),
    }
  }
  throw new Error('未知用户更新')
}
