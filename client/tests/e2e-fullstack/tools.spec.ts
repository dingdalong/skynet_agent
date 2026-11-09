import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { decodeMessage } from '../../src/protocol/agent-gateway-codec'

test('真实供应商：工具、权限、沙盒、PTY、重载与取消', async ({ page }) => {
  const fixture = JSON.parse(process.env.AGENT_REAL_FIXTURE ?? '{}')
  expect(fixture.token, '必须通过真实模型验收入口启动').toBeTruthy()
  const requests: { name: string; sessionId?: string; modelId?: string }[] = []
  page.on('websocket', (socket) =>
    socket.on('framesent', ({ payload }) => {
      if (typeof payload === 'string') return
      const frame = decodeMessage(payload)
      const chat =
        frame.name === 'ChatReq'
          ? (frame.payload as { sessionId?: string; modelId?: string })
          : null
      requests.push({
        name: frame.name,
        ...(chat ? { sessionId: chat.sessionId ?? '', modelId: chat.modelId } : {}),
      })
    }),
  )
  await page.addInitScript((value) => {
    Object.assign(window, { __AGENT_REAL_FIXTURE: value })
  }, fixture)
  await page.addInitScript({ path: path.resolve('tests/real-model/real-model-probe.js') })
  await page.goto('/')
  const resultHandle = await page.waitForFunction(
    () => {
      const result = (
        window as unknown as { __AGENT_REAL_RESULT?: { status: string; error?: string } }
      ).__AGENT_REAL_RESULT
      return result?.status === 'passed' || result?.status === 'failed' ? result : null
    },
    undefined,
    { timeout: 840000 },
  )
  const result = (await resultHandle.jsonValue())!
  await resultHandle.dispose()
  const firstChat = requests.findIndex((request) => request.name === 'ChatReq')
  expect(firstChat, '没有实际发送首次聊天请求').toBeGreaterThan(0)
  expect(requests.slice(0, firstChat).map((request) => request.name)).toEqual(['LoginReq'])
  const chats = requests.filter((request) => request.name === 'ChatReq')
  expect(chats[0]!.sessionId).toBe('')
  expect(chats[0]!.modelId).toBeTruthy()
  expect(chats[1]!.sessionId).toBeTruthy()
  expect(chats.slice(1).every((request) => request.sessionId === chats[1]!.sessionId)).toBe(true)
  fs.writeFileSync(
    path.join(fixture.evidenceDirectory, 'web.json'),
    JSON.stringify({ ...result, requests }, null, 2) + '\n',
  )
  expect(result.status, result.error).toBe('passed')
  await page.screenshot({ path: path.join(fixture.evidenceDirectory, 'web.png'), fullPage: true })
})
