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
  fs.writeFileSync(
    path.join(fixture.evidenceDirectory, 'web.json'),
    JSON.stringify(result, null, 2) + '\n',
  )
  expect(result.status, result.error).toBe('passed')
  await page.screenshot({ path: path.join(fixture.evidenceDirectory, 'web.png'), fullPage: true })
})
