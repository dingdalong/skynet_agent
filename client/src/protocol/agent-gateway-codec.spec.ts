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
import { skynet } from './generated/agent_gateway.js'
import { errorCode } from './error-code'
import { MAX_MESSAGE_ID, nextMessageId } from './message-id'

const { MessageRole, MessageStatus } = skynet.agent.v1

const protocolVectors = JSON.parse(
  readFileSync(resolve(process.cwd(), '../common/proto/testdata/protocol_vectors.json'), 'utf8'),
) as {
  hashes: {
    login_req: number
    message_send_req: number
  }
  frames: {
    login_request: string
    message_send: string
    login_success: string
    message_streaming: string
    message_completed: string
    message_cancelled: string
    message_failed: string
  }
}

function decodeHex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

describe('agent gateway binary codec', () => {
  it('与 Lua 共享 FNV-1a 哈希和二进制帧向量', () => {
    expect(fnv1a32('skynet.agent.v1.LoginReq')).toBe(protocolVectors.hashes.login_req)
    expect(fnv1a32('skynet.agent.v1.MessageSendReq')).toBe(protocolVectors.hashes.message_send_req)

    expect(decodeMessage(decodeHex(protocolVectors.frames.login_request))).toMatchObject({
      messageId: 1,
      name: 'LoginReq',
      payload: {},
    })
    expect(decodeMessage(decodeHex(protocolVectors.frames.message_send))).toMatchObject({
      messageId: 2,
      name: 'MessageSendReq',
      payload: {
        sessionId: 'session-1',
        text: '你好',
      },
    })
    expect(decodeServerMessage(decodeHex(protocolVectors.frames.login_success))).toMatchObject({
      messageId: 1,
      name: 'LoginRes',
      payload: {
        ret: errorCode.succ,
        snapshot: {
          activeSessionId: 'session-1',
        },
      },
    })
    expect(decodeServerMessage(decodeHex(protocolVectors.frames.message_streaming))).toMatchObject({
      messageId: 2,
      name: 'MessageSendRes',
      payload: {
        ret: errorCode.succ,
        status: MessageStatus.MESSAGE_STATUS_STREAMING,
        sessionId: 'session-1',
        delta: '你好',
      },
    })
    expect(decodeServerMessage(decodeHex(protocolVectors.frames.message_completed))).toMatchObject({
      messageId: 2,
      name: 'MessageSendRes',
      payload: {
        ret: errorCode.succ,
        status: MessageStatus.MESSAGE_STATUS_COMPLETED,
        message: {
          content: '你好',
        },
      },
    })
    expect(decodeServerMessage(decodeHex(protocolVectors.frames.message_cancelled))).toMatchObject({
      messageId: 2,
      name: 'MessageSendRes',
      payload: {
        ret: errorCode.succ,
        status: MessageStatus.MESSAGE_STATUS_CANCELLED,
        sessionId: 'session-1',
      },
    })
    expect(decodeServerMessage(decodeHex(protocolVectors.frames.message_failed))).toMatchObject({
      messageId: 2,
      name: 'MessageSendRes',
      payload: {
        ret: errorCode.call_fail,
        sessionId: 'session-1',
        error: {
          message: '上游失败',
          retryable: true,
        },
      },
    })
  })

  it.each([
    ['LoginReq', 1, {}],
    ['SessionCreateReq', 2, {}],
    ['SessionSelectReq', 3, { sessionId: 'session-1' }],
    ['MessageSendReq', 4, { sessionId: 'session-1', text: '你好' }],
    ['MessageCancelReq', 5, { targetMessageId: 4 }],
  ])('编码并解码客户端请求 %s', (name, messageId, payload) => {
    const frame = encodeMessage(messageId, name, payload)

    expect(frame.length).toBeGreaterThanOrEqual(WIRE_HEADER_SIZE)
    expect(frame[0]).toBe(0)
    expect(decodeMessage(frame)).toMatchObject({
      messageId,
      name,
      payload,
    })
  })

  it('直接解码全部服务端响应而不生成业务事件', () => {
    const message = {
      id: 'message-1',
      role: MessageRole.MESSAGE_ROLE_ASSISTANT,
      content: '回答',
      createdAt: 1_700_000_000_000,
    }
    const snapshot = {
      sessions: [{ id: 'session-1', title: '会话', updatedAt: 1_700_000_000_000 }],
      activeSessionId: 'session-1',
      messages: [message],
    }
    const responses = [
      decodeServerMessage(
        encodeMessage(1, 'LoginRes', {
          ret: errorCode.succ,
          snapshot,
        }),
      ),
      decodeServerMessage(
        encodeMessage(2, 'SessionCreateRes', {
          ret: errorCode.succ,
          session: { id: 'session-2', title: '新会话', updatedAt: 1 },
        }),
      ),
      decodeServerMessage(
        encodeMessage(3, 'SessionSelectRes', {
          ret: errorCode.succ,
          sessionId: 'session-1',
          messages: [message],
        }),
      ),
      decodeServerMessage(
        encodeMessage(4, 'MessageSendRes', {
          ret: errorCode.succ,
          status: MessageStatus.MESSAGE_STATUS_STREAMING,
          sessionId: 'session-1',
          delta: '片段',
        }),
      ),
      decodeServerMessage(
        encodeMessage(5, 'MessageCancelRes', {
          ret: errorCode.succ,
        }),
      ),
    ]

    expect(responses.map((response) => [response.name, response.messageId])).toEqual([
      ['LoginRes', 1],
      ['SessionCreateRes', 2],
      ['SessionSelectRes', 3],
      ['MessageSendRes', 4],
      ['MessageCancelRes', 5],
    ])
    expect(responses[0].payload).toMatchObject({
      ret: errorCode.succ,
      snapshot: { activeSessionId: 'session-1' },
    })
    expect(responses[3].payload).toMatchObject({
      ret: errorCode.succ,
      status: MessageStatus.MESSAGE_STATUS_STREAMING,
      delta: '片段',
    })
  })

  it('拒绝短帧、压缩帧、未知哈希和非响应消息', () => {
    expect(() => decodeMessage(new Uint8Array(WIRE_HEADER_SIZE - 1))).toThrow('短于 9 字节')

    const compressed = encodeMessage(1, 'LoginReq', {})
    compressed[0] = 1
    expect(() => decodeMessage(compressed)).toThrow('不支持压缩')

    const unknownHash = encodeMessage(1, 'LoginReq', {})
    new DataView(unknownHash.buffer).setUint32(5, 123, false)
    expect(() => decodeMessage(unknownHash)).toThrow('未知 Agent 消息哈希')

    expect(() => decodeServerMessage(encodeMessage(1, 'LoginReq', {}))).toThrow('非响应消息')
  })

  it('请求消息 ID 不接受 0 或 uint32 上限之后的值', () => {
    expect(() => encodeMessage(0, 'LoginReq', {})).toThrow('messageId')
    expect(() => encodeMessage(MAX_MESSAGE_ID + 1, 'LoginReq', {})).toThrow('messageId')
  })

  it('消息 ID 到达 uint32 上限后不再回绕', () => {
    expect(nextMessageId(MAX_MESSAGE_ID - 1)).toBe(MAX_MESSAGE_ID)
    expect(nextMessageId(MAX_MESSAGE_ID)).toBeNull()
  })
})
