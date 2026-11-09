import assert from 'node:assert/strict'
import { AgentSocket, proto, encodeFrame, login, request, sendMessage, waitRun } from './gateway_socket.mjs'
const url = process.env.AGENT_WS_URL
if (!url) throw new Error('AGENT_WS_URL 未设置')
const last = (session) => session.messages.at(-1)

async function chatFlow() {
  const { socket, snapshot, username } = await login(url)
  try {
    assert.equal(snapshot.chatSessions.length, 0)
    const first = await sendMessage(socket, undefined, '[e2e:success]')
    const sessionId = first.id
    assert.equal(last(first).content, 'E2E 成功')
    await sendMessage(socket, sessionId, '[e2e:history-set]')
    socket.close()
    await socket.waitForClose()
    const restored = await login(url, username)
    try {
      assert.equal(restored.snapshot.userId, snapshot.userId)
      assert.equal(restored.snapshot.chatSessions[0].session.messages.length, 4)
      assert.equal(last(await sendMessage(restored.socket, sessionId, '[e2e:history-check]')).content, 'E2E 历史通过')
      const failed = await sendMessage(restored.socket, sessionId, '[e2e:error]')
      assert.equal(last(failed).status, 4)
      assert.equal(last(failed).ret, 17)
      const retry = await request(restored.socket, 'ChatReq', { sessionId, retryRunId: last(failed).runId })
      assert.equal(retry.chatSession.session.messages.length, failed.messages.length)
      assert.equal(last(retry.chatSession.session).id, last(failed).id)
      assert.equal(last(await waitRun(restored.socket, retry.chatSession.session.runId)).status, 4)
      const timeout = await sendMessage(restored.socket, sessionId, '[e2e:stall]', 10000)
      assert.equal(last(timeout).status, 4)
      assert.equal(last(await sendMessage(restored.socket, sessionId, '[e2e:success]')).content, 'E2E 成功')
    } finally { restored.socket.close() }
  } finally { socket.close() }
}

async function multiUserFlow() {
  const a = await login(url)
  const b = await login(url, a.username)
  const other = await login(url)
  try {
    assert.equal(a.snapshot.chatSessions.length, 0)
    assert.equal(b.snapshot.chatSessions.length, 0)
    const ack = await request(a.socket, 'ChatReq', { text: '[e2e:slow]' })
    const sessionId = ack.chatSession.session.id
    const runId = ack.chatSession.session.runId
    const started = await b.socket.waitFor((event) => event.name === 'SessionUpdatedNtf' && event.payload.chatSession.session.runId === runId)
    assert.equal(started.payload.chatSession.session.id, sessionId)
    assert.equal((await request(b.socket, 'ChatReq', { sessionId, text: '竞争' })).ret, 4)
    assert.equal((await request(other.socket, 'MessageCancelReq', { sessionId, runId })).ret, 2)
    assert.equal(last(await sendMessage(b.socket, undefined, '[e2e:success]')).status, 2)
    assert.equal((await request(b.socket, 'MessageCancelReq', { sessionId, runId })).ret, 1)
    assert.equal(last(await waitRun(a.socket, runId)).status, 3)
    assert.equal(last(await waitRun(b.socket, runId)).status, 3)
    // 生成任务脱离全部连接，稍后按用户名取回完成结果。
    const offline = await request(a.socket, 'ChatReq', { sessionId, text: '[e2e:slow]' })
    a.socket.close(); b.socket.close()
    await Promise.all([a.socket.waitForClose(), b.socket.waitForClose()])
    const restored = await login(url, a.username)
    try {
      const state = restored.snapshot.chatSessions.find((item) => item.session.id === sessionId).session
      const complete = state.runId ? await waitRun(restored.socket, offline.chatSession.session.runId) : state
      assert.equal(last(complete).status, 2)
      assert.equal(last(complete).content, 'E2E 慢速完成')
    } finally { restored.socket.close() }
    assert.equal((await request(other.socket, 'UserSnapshotReq')).snapshot.chatSessions.length, 0)
  } finally { a.socket.close(); b.socket.close(); other.socket.close() }
}

function expectRejected(payload, expectedCode) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timer = setTimeout(() => { socket.close(); reject(new Error('等待非法帧关闭超时')) }, 5000)
    socket.addEventListener('open', () => socket.send(payload))
    socket.addEventListener('close', (event) => {
      clearTimeout(timer)
      try { assert.equal(event.code, expectedCode); resolve() } catch (error) { reject(error) }
    })
  })
}
async function protocolFlow() {
  await expectRejected('invalid', 1003)
  await expectRejected(new Uint8Array([0, 1]), 1007)
  const compressed = encodeFrame(1, 'skynet.agent.v1.LoginReq', proto.LoginReq, { username: 'alice' })
  compressed[0] = 1
  await expectRejected(compressed, 1007)
  await expectRejected(new Uint8Array(256 * 1024 + 1), 1006)
  const empty = new AgentSocket(url)
  await empty.connect()
  assert.equal((await request(empty, 'LoginReq', { username: '' })).ret, 12)
  assert.equal(await empty.waitForClose(), 1008)
  const prelogin = new AgentSocket(url)
  await prelogin.connect()
  prelogin.sendRequest(1, 'skynet.agent.v1.ChatReq', proto.ChatReq, {})
  assert.equal((await prelogin.waitFor((event) => event.name === 'LoginRes')).payload.ret, 12)
  assert.equal(await prelogin.waitForClose(), 1008)
  const ordered = new AgentSocket(url)
  await ordered.connect()
  ordered.sendRequest(1, 'skynet.agent.v1.LoginReq', proto.LoginReq, { username: crypto.randomUUID().slice(0, 24) })
  ordered.sendRequest(2, 'skynet.agent.v1.ChatReq', proto.ChatReq, { text: '[e2e:success]' })
  assert.equal((await ordered.waitFor((event) => event.messageId === 1)).payload.ret, 1)
  assert.equal((await ordered.waitFor((event) => event.messageId === 2)).payload.ret, 1)
  ordered.sendRequest(3, 'skynet.agent.v1.LoginReq', proto.LoginReq, { username: 'second' })
  assert.equal(await ordered.waitForClose(), 1008)
}

async function main() {
  if (process.argv.includes('--ready')) { const { socket } = await login(url); socket.close(); return }
  if (process.argv.includes('--live')) {
    const { socket, snapshot } = await login(url)
    try { console.log(last(await sendMessage(socket, undefined, process.env.AGENT_LIVE_PROMPT ?? '请只回复：live-ok', 120000)).content) }
    finally { socket.close() }
    return
  }
  await protocolFlow()
  await chatFlow()
  await multiUserFlow()
  console.log('用户路由、离线恢复、多端同步、会话并发、上下文、取消、失败重试与协议边界测试通过')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
