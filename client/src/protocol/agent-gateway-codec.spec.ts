import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  decodeMessage,
  decodeServerMessage,
  encodeMessage,
  fnv1a32,
  WIRE_HEADER_SIZE,
} from './agent-gateway-codec'
import { MAX_MESSAGE_ID, nextMessageId } from './message-id'

const vectors = JSON.parse(
  readFileSync(resolve(process.cwd(), '../common/proto/testdata/protocol_vectors.json'), 'utf8'),
) as { hashes: Record<string, number>; frames: Record<string, string> }
const fromHex = (text: string) => Uint8Array.from(text.match(/../g) ?? [], (v) => parseInt(v, 16))

describe('agent gateway binary codec', () => {
  it('与 Lua 共享请求、快照、推送及各终态二进制向量', () => {
    expect(fnv1a32('skynet.agent.v1.LoginReq')).toBe(vectors.hashes.login_req)
    expect(fnv1a32('skynet.agent.v1.MessageSendReq')).toBe(vectors.hashes.message_send_req)
    expect(decodeMessage(fromHex(vectors.frames.login_request!))).toMatchObject({
      name: 'LoginReq',
      messageId: 1,
      payload: { username: 'alice' },
    })
    expect(decodeMessage(fromHex(vectors.frames.message_send!))).toMatchObject({
      name: 'MessageSendReq',
      payload: { sessionId: 'session-1', text: '你好' },
    })
    expect(decodeServerMessage(fromHex(vectors.frames.login_success!))).toMatchObject({
      name: 'LoginRes',
      payload: { snapshot: { userId: 'user-1', username: 'alice' } },
    })
    expect(decodeServerMessage(fromHex(vectors.frames.message_streaming!))).toMatchObject({
      name: 'MessageDeltaNtf',
      messageId: 0,
      payload: { delta: '你好', runId: 'run-1' },
    })
    for (const [key, status] of [
      ['message_completed', 2],
      ['message_cancelled', 3],
      ['message_failed', 4],
    ] as const) {
      expect(decodeServerMessage(fromHex(vectors.frames[key]!))).toMatchObject({
        name: 'SessionUpdatedNtf',
        messageId: 0,
        payload: { session: { messages: [{ status }] } },
      })
    }
  })
  it.each([
    ['LoginReq', 1, { username: '用户' }],
    ['SessionCreateReq', 2, {}],
    ['UserSnapshotReq', 3, {}],
    ['MessageSendReq', 4, { sessionId: 's1', text: '你好', retryRunId: 'r1' }],
    ['MessageCancelReq', 5, { sessionId: 's1', runId: 'r1' }],
    ['MessageDeltaNtf', 0, { delta: '片段' }],
  ])('编码解码 %s', (name, messageId, payload) => {
    expect(decodeMessage(encodeMessage(messageId, name, payload))).toMatchObject({
      name,
      messageId,
      payload,
    })
  })
  it('拒绝损坏帧、未知类型和方向编号错误', () => {
    expect(() => decodeMessage(new Uint8Array(WIRE_HEADER_SIZE - 1))).toThrow('短于 9 字节')
    const compressed = encodeMessage(1, 'LoginReq', {})
    compressed[0] = 1
    expect(() => decodeMessage(compressed)).toThrow('不支持压缩')
    const unknown = encodeMessage(1, 'LoginReq', {})
    new DataView(unknown.buffer).setUint32(5, 123, false)
    expect(() => decodeMessage(unknown)).toThrow('未知 Agent 消息哈希')
    expect(() => decodeServerMessage(encodeMessage(1, 'LoginReq', {}))).toThrow('非响应消息')
    expect(() => encodeMessage(0, 'LoginReq', {})).toThrow('messageId')
    expect(() => encodeMessage(2, 'MessageDeltaNtf', {})).toThrow('messageId')
    expect(() => encodeMessage(MAX_MESSAGE_ID + 1, 'LoginReq', {})).toThrow('messageId')
    expect(nextMessageId(MAX_MESSAGE_ID)).toBeNull()
  })
})
