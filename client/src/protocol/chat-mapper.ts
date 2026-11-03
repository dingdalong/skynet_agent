import { skynet } from './generated/agent_gateway.js'
import { errorCode, formatResponseError } from './error-code'
import type { ChatMessage, ChatSessionSummary, SessionSnapshot } from '../types/chat'

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
  const role =
    payload.role === skynet.agent.v1.MessageRole.MESSAGE_ROLE_USER
      ? 'user'
      : payload.role === skynet.agent.v1.MessageRole.MESSAGE_ROLE_ASSISTANT
        ? 'assistant'
        : null
  if (!role) throw new Error('Protobuf 消息角色无效')
  return {
    id: requiredString(payload.id, 'message.id'),
    role,
    content: requiredString(payload.content, 'message.content'),
    createdAt: timestamp(payload.createdAt),
    status: 'complete',
  }
}

export function toSessionSummary(
  payload: skynet.agent.v1.SessionSummary.$Properties,
): ChatSessionSummary {
  return {
    id: requiredString(payload.id, 'session.id'),
    title: requiredString(payload.title, 'session.title'),
    updatedAt: timestamp(payload.updatedAt),
  }
}

export function toSnapshot(payload: skynet.agent.v1.SessionSnapshot.$Properties): SessionSnapshot {
  const snapshot = {
    sessions: (payload.sessions ?? []).map(toSessionSummary),
    activeSessionId: requiredString(payload.activeSessionId, 'snapshot.activeSessionId'),
    messages: (payload.messages ?? []).map(toChatMessage),
  }
  if (!snapshot.sessions.some((session) => session.id === snapshot.activeSessionId)) {
    throw new Error('Agent 登录快照的当前会话无效')
  }
  return snapshot
}
