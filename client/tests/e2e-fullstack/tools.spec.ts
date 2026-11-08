import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('真实供应商：工具、权限、沙盒、PTY、重载与取消', async ({ page }) => {
  const fixture = JSON.parse(process.env.AGENT_REAL_FIXTURE ?? '{}')
  expect(fixture.token, '必须通过真实模型验收入口启动').toBeTruthy()
  await page.addInitScript((value) => {
    Object.assign(window, { __AGENT_REAL_FIXTURE: value })
  }, fixture)
  await page.addInitScript({ path: path.resolve('tests/real-model/real-model-probe.js') })
  await page.goto('/')
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __AGENT_REAL_RESULT?: { status: string } }).__AGENT_REAL_RESULT
              ?.status,
        ),
      { timeout: 840000, message: '真实模型端到端必须完成或明确失败' },
    )
    .toMatch(/passed|failed/)
  const result = await page.evaluate(
    () =>
      (window as unknown as { __AGENT_REAL_RESULT: { status: string; error?: string } })
        .__AGENT_REAL_RESULT,
  )
  fs.writeFileSync(
    path.join(fixture.evidenceDirectory, 'web.json'),
    JSON.stringify(result, null, 2) + '\n',
  )
  expect(result.status, result.error).toBe('passed')
  await page.screenshot({ path: path.join(fixture.evidenceDirectory, 'web.png'), fullPage: true })
})
