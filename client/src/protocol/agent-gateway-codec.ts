import type { ServerMessage } from './messages'
import { isValidWireMessageId } from './message-id'
import { skynet } from './generated/agent_gateway.js'

export const WIRE_HEADER_SIZE = 9

interface WireType {
  create(properties: Record<string, unknown>): unknown
  encode(message: unknown): { finish(): Uint8Array }
  decode(data: Uint8Array): unknown
}

interface WireMessage {
  messageId: number
  name: string
  payload: unknown
}

function discoverWireTypes(): Map<string, WireType> {
  const types = new Map<string, WireType>()
  const namespace = skynet.agent.v1 as unknown as Record<string, unknown>

  for (const [name, candidate] of Object.entries(namespace)) {
    if (
      (typeof candidate === 'object' || typeof candidate === 'function') &&
      candidate !== null &&
      'create' in candidate &&
      'encode' in candidate &&
      'decode' in candidate &&
      typeof candidate.create === 'function' &&
      typeof candidate.encode === 'function' &&
      typeof candidate.decode === 'function'
    ) {
      types.set(name, candidate as unknown as WireType)
    }
  }

  return types
}

const WIRE_TYPES = discoverWireTypes()

export function fnv1a32(value: string): number {
  let hash = 0x811c9dc5
  const bytes = new TextEncoder().encode(value)
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

function fullTypeName(name: string): string {
  return `skynet.agent.v1.${name}`
}

function resolveWireType(name: string): WireType {
  const type = WIRE_TYPES.get(name)
  if (!type) {
    throw new Error(`未知 protobuf 消息类型: ${name}`)
  }
  return type
}

const TYPE_BY_HASH = new Map<number, { name: string; type: WireType }>()
for (const [name, type] of WIRE_TYPES) {
  const hash = fnv1a32(fullTypeName(name))
  const existing = TYPE_BY_HASH.get(hash)
  if (existing) {
    throw new Error(`protobuf 消息哈希冲突: ${existing.name} 和 ${name}`)
  }
  TYPE_BY_HASH.set(hash, { name, type })
}

function toUint8Array(frame: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (frame instanceof ArrayBuffer) {
    return new Uint8Array(frame)
  }
  return new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength)
}

export function encodeMessage(
  messageId: number,
  name: string,
  payload: Record<string, unknown>,
): Uint8Array {
  if (!isValidWireMessageId(messageId) || (messageId === 0) !== name.endsWith('Ntf')) {
    throw new Error('主动推送使用 messageId 0，请求响应使用非零 messageId')
  }
  const type = resolveWireType(name)
  const args = type.encode(type.create(payload)).finish()
  const frame = new Uint8Array(WIRE_HEADER_SIZE + args.length)
  const view = new DataView(frame.buffer)
  view.setUint8(0, 0)
  view.setUint32(1, messageId, false)
  view.setUint32(5, fnv1a32(fullTypeName(name)), false)
  frame.set(args, WIRE_HEADER_SIZE)
  return frame
}

export function decodeMessage(frame: ArrayBuffer | ArrayBufferView): WireMessage {
  const data = toUint8Array(frame)
  if (data.length < WIRE_HEADER_SIZE) {
    throw new Error('Agent 二进制消息短于 9 字节头')
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const compression = view.getUint8(0)
  if (compression !== 0) {
    throw new Error(`MVP 不支持压缩 protobuf 消息: ${compression}`)
  }

  const messageId = view.getUint32(1, false)
  if (!isValidWireMessageId(messageId)) {
    throw new Error(`Agent 消息 ID 无效: ${messageId}`)
  }

  const typeHash = view.getUint32(5, false)
  const messageType = TYPE_BY_HASH.get(typeHash)
  if (!messageType) {
    throw new Error(`未知 Agent 消息哈希: ${typeHash}`)
  }

  return {
    messageId,
    name: messageType.name,
    payload: messageType.type.decode(data.subarray(WIRE_HEADER_SIZE)),
  }
}

export function decodeServerMessage(frame: ArrayBuffer | ArrayBufferView): ServerMessage {
  const message = decodeMessage(frame)
  if (
    !(message.name.endsWith('Res') && message.messageId > 0) &&
    !(message.name.endsWith('Ntf') && message.messageId === 0)
  ) {
    throw new Error(`Agent 返回了非响应消息: ${message.name}`)
  }
  return message as ServerMessage
}
