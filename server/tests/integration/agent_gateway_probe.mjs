import assert from 'node:assert/strict'
import { skynet } from '../../../client/src/protocol/generated/agent_gateway.js'

const {
  LoginReq,
  LoginRes,
  MessageCancelReq,
  MessageCancelRes,
  MessageSendReq,
  MessageSendRes,
  MessageStatus,
  SessionCreateReq,
  SessionCreateRes,
} = skynet.agent.v1

const errorCode = {
  succ: 1,
  fail: 2,
  server_busy: 4,
  invalid_param: 12,
  call_fail: 17,
}
const WIRE_HEADER_SIZE = 9
const RESPONSE_TYPES = new Map([
  [
    fnv1a32('skynet.agent.v1.LoginRes'),
    { name: 'LoginRes', decode: (args) => LoginRes.decode(args) },
  ],
  [
    fnv1a32('skynet.agent.v1.SessionCreateRes'),
    { name: 'SessionCreateRes', decode: (args) => SessionCreateRes.decode(args) },
  ],
  [
    fnv1a32('skynet.agent.v1.MessageSendRes'),
    { name: 'MessageSendRes', decode: (args) => MessageSendRes.decode(args) },
  ],
  [
    fnv1a32('skynet.agent.v1.MessageCancelRes'),
    { name: 'MessageCancelRes', decode: (args) => MessageCancelRes.decode(args) },
  ],
])

const url = process.env.AGENT_WS_URL
if (!url) {
  throw new Error('AGENT_WS_URL 未设置')
}
if (typeof WebSocket !== 'function') {
  throw new Error('当前 Node 版本不支持全局 WebSocket')
}

const mode = process.argv.includes('--live')
  ? 'live'
  : process.argv.includes('--ready')
    ? 'ready'
    : 'deterministic'
const DEFAULT_TIMEOUT_MS = 5000
const LIVE_TIMEOUT_MS = 120000

function fnv1a32(value) {
  let hash = 0x811c9dc5
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

function encodeFrame(messageId, typeName, wireType, message) {
  const args = wireType.encode(wireType.create(message)).finish()
  const frame = new Uint8Array(WIRE_HEADER_SIZE + args.length)
  const view = new DataView(frame.buffer)
  view.setUint8(0, 0)
  view.setUint32(1, messageId, false)
  view.setUint32(5, fnv1a32(typeName), false)
  frame.set(args, WIRE_HEADER_SIZE)
  return frame
}

function decodeFrame(data) {
  if (data.length < WIRE_HEADER_SIZE) {
    throw new Error('Agent 响应短于 9 字节头')
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const compression = view.getUint8(0)
  if (compression !== 0) {
    throw new Error(`Agent 返回了不支持的压缩标志: ${compression}`)
  }
  const messageId = view.getUint32(1, false)
  const typeHash = view.getUint32(5, false)
  const responseType = RESPONSE_TYPES.get(typeHash)
  if (!responseType) {
    throw new Error(`未知 Agent 响应哈希: ${typeHash}`)
  }
  return {
    name: responseType.name,
    messageId,
    payload: responseType.decode(data.subarray(WIRE_HEADER_SIZE)),
  }
}


function binaryData(data) {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  return null
}

class AgentSocket {
  constructor(connectUrl) {
    this.connectUrl = connectUrl
    this.socket = null
    this.events = []
    this.waiters = new Set()
    this.closed = false
    this.closeCode = null
    this.closePromise = null
    this.nextMessageId = 1
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.connectUrl)
      this.socket = socket
      socket.binaryType = 'arraybuffer'
      let opened = false

      socket.addEventListener('open', () => {
        opened = true
        resolve()
      })
      socket.addEventListener('message', (message) => {
        const data = binaryData(message.data)
        if (!data) {
          this.rejectWaiters(new Error('Agent 返回了非二进制 WebSocket 消息'))
          return
        }
        try {
          this.dispatch(decodeFrame(data))
        } catch (error) {
          this.rejectWaiters(
            error instanceof Error ? error : new Error('无法解析 Agent 二进制响应'),
          )
        }
      })
      socket.addEventListener('error', () => {
        if (!opened) {
          reject(new Error('无法连接 Agent WebSocket'))
        }
      })
      this.closePromise = new Promise((resolve) => {
        socket.addEventListener('close', (event) => {
          this.closed = true
          this.closeCode = event.code
          this.rejectWaiters(new Error('Agent WebSocket 已关闭'))
          resolve(event.code)
        })
      })
    })
  }

  allocateMessageId() {
    if (this.nextMessageId === null || this.nextMessageId > 0xffffffff) {
      throw new Error('Agent 消息 ID 已耗尽')
    }
    const messageId = this.nextMessageId
    this.nextMessageId = messageId === 0xffffffff ? null : messageId + 1
    return messageId
  }

  sendRequest(messageId, typeName, wireType, message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Agent WebSocket 尚未连接')
    }
    this.socket.send(encodeFrame(messageId, typeName, wireType, message))
  }

  waitFor(predicate, timeoutMilliseconds = DEFAULT_TIMEOUT_MS) {
    const eventIndex = this.events.findIndex(predicate)
    if (eventIndex >= 0) {
      return Promise.resolve(this.events.splice(eventIndex, 1)[0])
    }
    if (this.closed) {
      return Promise.reject(new Error('等待 Agent 响应时连接已经关闭'))
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve: (event) => {
          clearTimeout(waiter.timer)
          this.waiters.delete(waiter)
          resolve(event)
        },
        reject: (error) => {
          clearTimeout(waiter.timer)
          this.waiters.delete(waiter)
          reject(error)
        },
        timer: setTimeout(() => {
          this.waiters.delete(waiter)
          const events = this.events.map(
            (event) =>
              `${event.name}#${event.messageId}` +
              `(ret=${event.payload.ret},status=${event.payload.status})`,
          )
          reject(
            new Error(
              `等待 Agent 响应超时，事件数=${this.events.length}` +
                (events.length ? `，事件=${events.join(',')}` : ''),
            ),
          )
        }, timeoutMilliseconds),
      }
      this.waiters.add(waiter)
    })
  }

  waitForClose(timeoutMilliseconds = DEFAULT_TIMEOUT_MS) {
    if (this.closed) {
      return Promise.resolve(this.closeCode)
    }
    if (!this.closePromise) {
      return Promise.reject(new Error('Agent WebSocket 尚未开始连接'))
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('等待 Agent WebSocket 关闭超时'))
      }, timeoutMilliseconds)
      this.closePromise.then((code) => {
        clearTimeout(timer)
        resolve(code)
      })
    })
  }

  close() {
    this.socket?.close()
  }

  dispatch(event) {
    for (const waiter of this.waiters) {
      if (waiter.predicate(event)) {
        waiter.resolve(event)
        return
      }
    }
    this.events.push(event)
  }

  rejectWaiters(error) {
    for (const waiter of [...this.waiters]) {
      waiter.reject(error)
    }
  }
}

function responseIs(name, messageId, ret, status) {
  return (event) =>
    event.name === name &&
    event.messageId === messageId &&
    (ret === undefined || event.payload.ret === ret) &&
    (status === undefined || event.payload.status === status)
}

async function login() {
  const socket = new AgentSocket(url)
  await socket.connect()
  const messageId = socket.allocateMessageId()
  socket.sendRequest(messageId, 'skynet.agent.v1.LoginReq', LoginReq, {})
  const response = await socket.waitFor(responseIs('LoginRes', messageId))
  assert.equal(response.payload.ret, errorCode.succ)
  assert.ok(response.payload.snapshot?.activeSessionId)
  return {
    socket,
    snapshot: response.payload.snapshot,
  }
}

async function createSession(socket) {
  const messageId = socket.allocateMessageId()
  socket.sendRequest(messageId, 'skynet.agent.v1.SessionCreateReq', SessionCreateReq, {})
  const response = await socket.waitFor(responseIs('SessionCreateRes', messageId))
  assert.equal(response.payload.ret, errorCode.succ)
  assert.ok(response.payload.session?.id)
  return response.payload.session.id
}

function isMessageResponse(messageId) {
  return (event) => event.name === 'MessageSendRes' && event.messageId === messageId
}

async function sendMessage(socket, sessionId, prompt, timeoutMilliseconds = DEFAULT_TIMEOUT_MS) {
  const messageId = socket.allocateMessageId()
  socket.sendRequest(messageId, 'skynet.agent.v1.MessageSendReq', MessageSendReq, {
    sessionId,
    text: prompt,
  })

  const deltas = []
  while (true) {
    const response = await socket.waitFor(isMessageResponse(messageId), timeoutMilliseconds)
    if (
      response.payload.ret === errorCode.succ &&
      response.payload.status === MessageStatus.MESSAGE_STATUS_STREAMING
    ) {
      deltas.push(response.payload.delta)
      continue
    }
    return {
      messageId,
      deltas,
      response,
    }
  }
}

function assertCompleted(result, expectedText) {
  assert.equal(result.response.payload.ret, errorCode.succ)
  assert.equal(result.response.payload.status, MessageStatus.MESSAGE_STATUS_COMPLETED)
  assert.equal(result.response.payload.message.content, expectedText)
  assert.equal(result.deltas.join(''), expectedText)
}

async function exerciseChatFlow() {
  const { socket, snapshot } = await login()
  try {
    const sessionId = await createSession(socket)
    assert.notEqual(sessionId, snapshot.activeSessionId)

    assertCompleted(await sendMessage(socket, sessionId, '[e2e:success]'), 'E2E 成功')
    assertCompleted(
      await sendMessage(socket, sessionId, '[e2e:history-set]'),
      'E2E 历史已保存',
    )
    assertCompleted(
      await sendMessage(socket, sessionId, '[e2e:history-check]'),
      'E2E 历史通过',
    )

    const failed = await sendMessage(socket, sessionId, '[e2e:error]')
    assert.equal(failed.response.payload.ret, errorCode.call_fail)
    assert.equal(failed.response.payload.error.code, undefined)
    assert.equal(failed.response.payload.error.retryable, true)
  } finally {
    socket.close()
  }
}

async function exerciseModelTimeout() {
  const { socket } = await login()
  try {
    const sessionId = await createSession(socket)
    const result = await sendMessage(socket, sessionId, '[e2e:stall]', 10_000)
    assert.equal(result.response.payload.ret, errorCode.call_fail)
    assert.equal(result.response.payload.error.message, '对话请求失败，请稍后重试')
    assertCompleted(await sendMessage(socket, sessionId, '[e2e:success]'), 'E2E 成功')
  } finally {
    socket.close()
  }
}

async function exerciseCancellation() {
  const { socket } = await login()
  try {
    const activeSessionId = await createSession(socket)
    const messageId = socket.allocateMessageId()
    socket.sendRequest(messageId, 'skynet.agent.v1.MessageSendReq', MessageSendReq, {
      sessionId: activeSessionId,
      text: '[e2e:slow]',
    })

    const firstDelta = await socket.waitFor(
      (event) =>
        isMessageResponse(messageId)(event) &&
        event.payload.ret === errorCode.succ &&
        event.payload.status === MessageStatus.MESSAGE_STATUS_STREAMING,
    )
    assert.equal(firstDelta.payload.delta, 'E2E ')

    const cancelMessageId = socket.allocateMessageId()
    socket.sendRequest(
      cancelMessageId,
      'skynet.agent.v1.MessageCancelReq',
      MessageCancelReq,
      {
        targetMessageId: messageId,
      },
    )
    const cancelResponse = await socket.waitFor(
      responseIs('MessageCancelRes', cancelMessageId),
    )
    assert.equal(cancelResponse.payload.ret, errorCode.succ)

    const cancelled = await socket.waitFor(
      responseIs(
        'MessageSendRes',
        messageId,
        errorCode.succ,
        MessageStatus.MESSAGE_STATUS_CANCELLED,
      ),
    )
    assert.equal(cancelled.payload.status, MessageStatus.MESSAGE_STATUS_CANCELLED)

    const finalEvent = socket.events.find(
      (event) =>
        isMessageResponse(messageId)(event) &&
        event.payload.status !== MessageStatus.MESSAGE_STATUS_STREAMING,
    )
    assert.equal(finalEvent, undefined)

    assertCompleted(await sendMessage(socket, activeSessionId, '[e2e:success]'), 'E2E 成功')
  } finally {
    socket.close()
  }
}

function expectRejected(payload, expectedCode) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error(`等待连接关闭超时，期望关闭码 ${expectedCode}`))
    }, DEFAULT_TIMEOUT_MS)

    socket.addEventListener('open', () => {
      socket.send(payload)
    })
    socket.addEventListener('close', (event) => {
      clearTimeout(timer)
      if (event.code !== expectedCode) {
        reject(new Error(`连接关闭码错误: ${event.code}，期望 ${expectedCode}`))
        return
      }
      resolve()
    })
  })
}

async function exerciseProtocolErrors() {
  await expectRejected('{"type":"session.create"}', 1003)
  await expectRejected(new Uint8Array([0x0a, 0xff]), 1007)
  const compressed = encodeFrame(1, 'skynet.agent.v1.LoginReq', LoginReq, {})
  compressed[0] = 1
  await expectRejected(compressed, 1007)
  await expectRejected(new Uint8Array(256 * 1024 + 1), 1006)
}

async function exercisePreloginRejection() {
  const socket = new AgentSocket(url)
  await socket.connect()
  try {
    const messageId = socket.allocateMessageId()
    socket.sendRequest(
      messageId,
      'skynet.agent.v1.SessionCreateReq',
      SessionCreateReq,
      {},
    )
    // 首帧失败后，已经缓冲的登录帧也不能重新打开连接。
    socket.sendRequest(socket.allocateMessageId(), 'skynet.agent.v1.LoginReq', LoginReq, {})
    const response = await socket.waitFor(
      responseIs('LoginRes', messageId, errorCode.invalid_param),
    )
    assert.equal(response.payload.error.message, '连接尚未登录')
    assert.equal(response.payload.error.retryable, false)
    assert.equal(await socket.waitForClose(), 1008)
  } finally {
    socket.close()
  }
}

async function exerciseOrderedLoginRouting() {
  const socket = new AgentSocket(url)
  await socket.connect()
  try {
    const loginMessageId = socket.allocateMessageId()
    socket.sendRequest(loginMessageId, 'skynet.agent.v1.LoginReq', LoginReq, {})
    const createMessageId = socket.allocateMessageId()
    socket.sendRequest(createMessageId, 'skynet.agent.v1.SessionCreateReq', SessionCreateReq, {})

    const loginResponse = await socket.waitFor(
      responseIs('LoginRes', loginMessageId, errorCode.succ),
    )
    assert.ok(loginResponse.payload.snapshot?.activeSessionId)
    const createResponse = await socket.waitFor(
      responseIs('SessionCreateRes', createMessageId, errorCode.succ),
    )
    assert.ok(createResponse.payload.session?.id)
    assert.notEqual(
      createResponse.payload.session.id,
      loginResponse.payload.snapshot.activeSessionId,
    )
    assert.ok(await createSession(socket))
  } finally {
    socket.close()
  }
}

async function exerciseDuplicateLoginRequest() {
  const socket = new AgentSocket(url)
  await socket.connect()
  try {
    const firstMessageId = socket.allocateMessageId()
    socket.sendRequest(firstMessageId, 'skynet.agent.v1.LoginReq', LoginReq, {})
    const duplicateMessageId = socket.allocateMessageId()
    socket.sendRequest(duplicateMessageId, 'skynet.agent.v1.LoginReq', LoginReq, {})

    const response = await socket.waitFor(responseIs('LoginRes', firstMessageId))
    assert.equal(response.payload.ret, errorCode.succ)
    assert.ok(response.payload.snapshot?.activeSessionId)
    assert.equal(await socket.waitForClose(), 1008)
  } finally {
    socket.close()
  }
}

async function exerciseOnlineRouting() {
  const { socket } = await login()
  try {
    const cancelMessageId = socket.allocateMessageId()
    socket.sendRequest(
      cancelMessageId,
      'skynet.agent.v1.MessageCancelReq',
      MessageCancelReq,
      {
        targetMessageId: 0,
      },
    )
    const cancelResponse = await socket.waitFor(
      responseIs('MessageCancelRes', cancelMessageId, errorCode.invalid_param),
    )
    assert.equal(cancelResponse.payload.error.message, '目标消息 ID 无效')
    assert.ok(await createSession(socket))
  } finally {
    socket.close()
  }
}

async function waitUntilReady() {
  const { socket } = await login()
  socket.close()
}

async function runLive() {
  const { socket } = await login()
  try {
    const activeSessionId = await createSession(socket)
    const prompt = process.env.AGENT_LIVE_PROMPT ?? '请只回复：live-ok'
    const result = await sendMessage(socket, activeSessionId, prompt, LIVE_TIMEOUT_MS)
    if (
      result.response.payload.ret !== errorCode.succ ||
      result.response.payload.status !== MessageStatus.MESSAGE_STATUS_COMPLETED
    ) {
      throw new Error(`真实模型聊天失败: ${JSON.stringify(result.response.payload)}`)
    }
    const content = result.response.payload.message.content
    assert.ok(content)
    console.log(content)
  } finally {
    socket.close()
  }
}

async function runDeterministic() {
  await exerciseProtocolErrors()
  await exercisePreloginRejection()
  await exerciseOrderedLoginRouting()
  await exerciseDuplicateLoginRequest()
  await exerciseOnlineRouting()
  await exerciseChatFlow()
  await exerciseCancellation()
  await exerciseModelTimeout()
  console.log('Agent WebSocket 路由、聊天、历史、取消、失败与协议边界测试通过')
}

async function main() {
  if (mode === 'ready') {
    await waitUntilReady()
    return
  }
  if (mode === 'live') {
    await runLive()
    return
  }
  await runDeterministic()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
