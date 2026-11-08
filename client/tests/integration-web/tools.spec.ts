import { expect, test, type Page } from '@playwright/test'

async function send(page: Page, prompt: string) {
  const input = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await expect(input).toBeEnabled()
  await input.fill(prompt)
  await page.getByRole('button', { name: '发送消息' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('textbox', { name: '用户名', exact: true })
    .fill(`tools-${crypto.randomUUID().slice(0, 20)}`)
  await page.getByRole('button', { name: '进入', exact: true }).click()
})

test('工具：主模型和权限思考流保留，重载后可以展开', async ({ page }) => {
  await send(page, '[e2e:reasoning]')
  await expect(page.getByText('E2E reasoning通过', { exact: true })).toBeVisible()
  const main = page.getByRole('button', { name: '思考过程 · 思考完成', exact: true })
  await main.click()
  await expect(page.getByLabel('思考内容').first()).toContainText('主模型思考')
  await page.locator('.tool-call summary').click()
  await page.getByRole('button', { name: '权限思考 · 思考完成', exact: true }).click()
  await expect(page.getByLabel('思考内容').last()).toContainText('权限思考')
  await page.reload()
  await expect(main).toBeVisible()
  await main.click()
  await expect(page.getByLabel('思考内容').first()).toContainText('逐步执行任务')
})

test('工具：运行中切换模型，后续主模型和权限请求采用新配置', async ({ page }) => {
  await send(page, '[e2e:model-switch]')
  await expect(page.locator('.thinking-block[data-model-id="e2e-test-model"]')).toHaveCount(1)
  await page.getByRole('button', { name: /^切换会话模型/ }).click()
  await page.getByRole('option', { name: /测试 Pro/ }).click()
  await expect(page.getByText('E2E model-switch通过', { exact: true })).toBeVisible()
  await expect(page.locator('.thinking-block[data-model-id="e2e-second-model"]')).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('button', { name: /^切换会话模型/ })).toContainText('测试 Pro')
})

test('工具：单轮连续执行四十次调用', async ({ page }) => {
  await send(page, '[e2e:unlimited]')
  await expect(page.getByText('E2E unlimited通过', { exact: true })).toBeVisible({ timeout: 90000 })
  await expect(page.locator('.tool-call')).toHaveCount(40)
})

test('工具：补丁增改移动与 bash 读取形成完整调用循环，刷新后保留', async ({ page }) => {
  await send(page, '[e2e:tools]')
  await expect(page.getByText('E2E tools通过', { exact: true })).toBeVisible()
  await expect(page.locator('.tool-call')).toHaveCount(4)
  await page.locator('.tool-call').last().locator('summary').click()
  await expect(page.locator('.tool-call').last()).toContainText('补丁移动成功')
  await page.reload()
  await expect(page.locator('.tool-call')).toHaveCount(4)
  await expect(page.getByText('E2E tools通过', { exact: true })).toBeVisible()
})

for (const [scenario, expected] of [
  ['denied', 'E2E 权限阻止成功'],
  ['rules-denied', 'E2E 规则阻止成功'],
  ['sandbox-denied', 'E2E 沙盒阻止成功'],
  ['outside', 'E2E outside通过'],
  ['pty', 'E2E pty通过'],
  ['network', 'E2E network通过'],
  ['permission-timeout', 'E2E permission-timeout通过'],
  ['permission-invalid', 'E2E permission-invalid通过'],
  ['env', 'E2E env通过'],
]) {
  test(`工具：${scenario}`, async ({ page }) => {
    await send(page, `[e2e:${scenario}]`)
    await expect(page.getByText(expected, { exact: true })).toBeVisible()
    if (scenario.includes('denied') && scenario !== 'sandbox-denied')
      await expect(page.locator('.tool-call')).toContainText('已阻止')
    if (scenario === 'outside') {
      await page.locator('.tool-call summary').click()
      await expect(page.locator('.tool-call')).toContainText('沙盒外执行')
    }
  })
}

test('工具：执行后的模型失败可以重试且不重复写文件', async ({ page }) => {
  await send(page, '[e2e:tool-retry]')
  await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.getByText('E2E tool-retry通过', { exact: true })).toBeVisible()
  await expect(page.locator('.tool-call')).toHaveCount(1)
})

test('工具：运行中重载恢复，停止会终止进程并允许继续发送', async ({ page }) => {
  await send(page, '[e2e:tool-slow]')
  await expect(page.locator('.tool-call')).toContainText('正在执行')
  await page.reload()
  await expect(page.locator('.tool-call')).toContainText('正在执行')
  await page.getByRole('button', { name: '停止', exact: true }).click()
  await expect(page.locator('.tool-call')).toContainText('已停止')
  await send(page, '[e2e:success]')
  await expect(page.getByText('E2E 成功', { exact: true })).toBeVisible()
})

test('工具：交互进程跨聊天轮次保留并继续输入', async ({ page }) => {
  await send(page, '[e2e:terminal-open]')
  await expect(page.getByText('E2E terminal-open通过', { exact: true })).toBeVisible()
  await expect(page.locator('.tool-call')).toContainText('正在执行')
  await send(page, '[e2e:terminal-input]')
  await expect(page.getByText('E2E terminal-input通过', { exact: true })).toBeVisible()
  await expect(page.locator('.tool-call').first()).toContainText('已完成')
})
