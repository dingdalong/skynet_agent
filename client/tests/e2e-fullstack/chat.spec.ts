import { expect, test, type Page } from '@playwright/test'
import { decodeMessage } from '../../src/protocol/agent-gateway-codec'

async function sendPrompt(page: Page, prompt: string) {
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await expect(composer).toBeEnabled()
  await composer.fill(prompt)
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(
    page.getByRole('region', { name: '消息' }).getByText(prompt, { exact: true }),
  ).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: '给 Agent 发送消息' })).toBeEnabled()
})

test('通过真实 WebSocket 网关接收流式回答', async ({ page }) => {
  await sendPrompt(page, '[e2e:success]')

  await expect(
    page.getByRole('region', { name: '消息' }).getByText('E2E 成功', { exact: true }),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('正在生成', { exact: true })).toHaveCount(0)
})

test('新建复用空会话，往返已有会话后不重复创建', async ({ page }) => {
  let creations = 0
  page.on('websocket', (socket) =>
    socket.on('framesent', ({ payload }) => {
      if (typeof payload !== 'string' && decodeMessage(payload).name === 'SessionCreateReq')
        creations++
    }),
  )
  await page.reload()
  const create = page.getByRole('button', { name: '新建会话', exact: true }).first()
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await expect(composer).toBeEnabled()
  await create.click()
  await create.click()
  expect(creations).toBe(0)
  await sendPrompt(page, '[e2e:success]')
  await expect(page.getByText('E2E 成功', { exact: true })).toBeVisible()
  await create.click()
  await expect(composer).toHaveValue('')
  await composer.fill('保留空会话草稿')
  const sessions = page.getByRole('navigation', { name: '会话列表' })
  await sessions.getByRole('button', { name: /\[e2e:success\]/ }).click()
  await expect(page.getByText('E2E 成功', { exact: true })).toBeVisible()
  await create.click()
  await expect(composer).toHaveValue('保留空会话草稿')
  await expect(sessions.getByRole('button')).toHaveCount(2)
  expect(creations).toBe(1)
})

test('可以停止生成并继续发送消息', async ({ page }) => {
  await sendPrompt(page, '[e2e:slow]')
  await expect(page.getByText('正在生成', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '停止' }).click()

  await expect(
    page.getByRole('region', { name: '消息' }).getByText('已停止', { exact: true }),
  ).toBeVisible()
  await sendPrompt(page, '[e2e:success]')
  await expect(page.getByText('E2E 成功', { exact: true })).toBeVisible()
})

test('供应商失败通过网关显示为生成失败', async ({ page }) => {
  await sendPrompt(page, '[e2e:error]')

  await expect(page.getByRole('alert')).toContainText('错误码 17')
  await expect(page.getByRole('alert')).toContainText('对话请求失败，请稍后重试')
  await expect(
    page.getByRole('region', { name: '消息' }).getByText('生成失败', { exact: true }),
  ).toBeVisible()
})

test('切换会话隔离失败，返回后重试创建新请求且保留唯一用户消息', async ({ page }) => {
  const requestIds: number[] = []
  page.on('websocket', (socket) =>
    socket.on('framesent', ({ payload }) => {
      if (typeof payload === 'string') return
      const frame = decodeMessage(payload)
      if (frame.name === 'MessageSendReq') requestIds.push(frame.messageId)
    }),
  )
  // 监听应覆盖重建连接后的整个真实请求链路。
  await page.reload()
  await sendPrompt(page, '[e2e:error]')
  await expect(page.getByRole('alert')).toContainText('错误码 17')
  await page.getByRole('button', { name: '新建会话' }).first().click()
  await expect(page.getByRole('main').getByRole('heading', { name: '新的会话' })).toBeVisible()
  await expect(page.getByRole('region', { name: '消息' })).toContainText('从一个清晰的问题开始')
  await page
    .getByRole('navigation', { name: '会话列表' })
    .getByRole('button', { name: /\[e2e:error\]/ })
    .click()
  await expect(page.getByRole('alert')).toContainText('错误码 17')
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect.poll(() => requestIds.length).toBe(2)
  expect(requestIds[1]).toBeGreaterThan(requestIds[0]!)
  await expect(
    page.getByRole('region', { name: '消息' }).getByText('生成失败', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: '消息' }).getByText('[e2e:error]', { exact: true }),
  ).toHaveCount(1)
})
