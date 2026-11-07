import { skynet } from '../../../client/src/protocol/generated/agent_gateway.js'
export const proto = skynet.agent.v1
const DEFAULT_TIMEOUT_MS = 5000
export function fnv1a32(value) {
  let hash = 2166136261
  for (const byte of new TextEncoder().encode(value)) hash = Math.imul(hash ^ byte, 16777619) >>> 0
  return hash
}
export function encodeFrame(messageId, typeName, wireType, message) {
  const args = wireType.encode(wireType.create(message)).finish()
  const frame = new Uint8Array(9 + args.length)
  const view = new DataView(frame.buffer)
  view.setUint32(1, messageId)
  view.setUint32(5, fnv1a32(typeName))
  frame.set(args, 9)
  return frame
}
const types = new Map(Object.entries(proto).filter(([name]) => /Res$|Ntf$/.test(name)).map(([name, type]) => [fnv1a32('skynet.agent.v1.' + name), { name, type }]))
function decodeFrame(data) {
  if (data.length < 9 || data[0] !== 0) throw new Error('无效消息头')
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const entry = types.get(view.getUint32(5))
  if (!entry) throw new Error('未知消息类型')
  return { name: entry.name, messageId: view.getUint32(1), payload: entry.type.decode(data.subarray(9)) }
}
function binaryData(data) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  return null
}
export class AgentSocket {
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

export async function request(socket, name, args = {}) {
  const id = socket.allocateMessageId()
  socket.sendRequest(id, 'skynet.agent.v1.' + name, proto[name], args)
  return (await socket.waitFor((event) => event.messageId === id && event.name === name.replace(/Req$/, 'Res'))).payload
}
export async function login(url, username = 'probe-' + crypto.randomUUID().slice(0, 20)) {
  const socket = new AgentSocket(url)
  await socket.connect()
  const result = await request(socket, 'LoginReq', { username })
  if (result.ret !== 1) throw new Error('登录失败: ' + JSON.stringify(result))
  return { socket, snapshot: result.snapshot, username }
}
export async function waitRun(socket, runId, timeout = 5000) {
  return (await socket.waitFor((event) => event.name === 'SessionUpdatedNtf' && !event.payload.session.runId && event.payload.session.messages.at(-1)?.runId === runId, timeout)).payload.session
}
export async function sendMessage(socket, sessionId, text, timeout = 5000) {
  const ack = await request(socket, 'MessageSendReq', { sessionId, text })
  if (ack.ret !== 1) throw new Error('发送失败: ' + JSON.stringify(ack))
  return waitRun(socket, ack.session.runId, timeout)
}
