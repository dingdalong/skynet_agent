/* global fetch, window */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn, spawnSync } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'
import { chromium } from '@playwright/test'
const fixture = JSON.parse(process.env.AGENT_REAL_FIXTURE)
const root = path.resolve('..')
const directory = fs.mkdtempSync(path.join(fixture.evidenceDirectory, 'desktop-'))
// Only generated synthetic files are exposed to the model, outside the source checkout.
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'skynet-execution-synthetic-'))
fs.writeFileSync(path.join(directory, 'evidence.json'), '{}')
const app = path.join(directory, 'Skynet Execution Probe.app')
const executable = path.join(app, 'Contents/MacOS/chat_reload_probe')
fs.mkdirSync(path.dirname(executable), { recursive: true })
fs.mkdirSync(path.join(app, 'Contents/Resources'), { recursive: true })
fs.copyFileSync(
  path.join(root, 'client/src-tauri/target/debug/examples/chat_reload_probe'),
  executable,
)
fs.chmodSync(executable, 0o755)
fs.writeFileSync(
  path.join(app, 'Contents/Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.skynet.agent.chatprobe</string><key>CFBundleExecutable</key><string>chat_reload_probe</string><key>CFBundleName</key><string>Execution Probe</string><key>CFBundlePackageType</key><string>APPL</string><key>NSHighResolutionCapable</key><true/></dict></plist>`,
)
assert.equal(spawnSync('codesign', ['--force', '--deep', '--sign', '-', app]).status, 0)
const log = fs.openSync(path.join(directory, 'app.log'), 'w')
const child = spawn(executable, [], {
  env: {
    ...process.env,
    CHAT_PROBE_MODE: 'execution',
    CHAT_PROBE_DIR: directory,
    CHAT_EXECUTION_WORKSPACE: workspace,
  },
  stdio: ['ignore', log, log],
})
const vite = spawn('pnpm', ['dev', '--port', '15174'], {
  env: {
    ...process.env,
    VITE_AGENT_WS_URL: 'ws://127.0.0.1:18791/agent',
    VITE_CHAT_TRANSPORT: 'websocket',
  },
  stdio: ['ignore', log, log],
})
let browser
async function wait(check, description, timeout = 240000) {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (child.exitCode !== null || child.signalCode !== null) {
      const resultPath = path.join(directory, 'result.json')
      if (!fs.existsSync(resultPath)) throw new Error('原生夹具提前退出，详情见 app.log')
    }
    const report = path.join(directory, 'result.json')
    if (fs.existsSync(report) && JSON.parse(fs.readFileSync(report)).status === 'failed')
      throw new Error(fs.readFileSync(report, 'utf8'))
    if (await check()) return
    await pause(100)
  }
  throw new Error('等待超时：' + description)
}
try {
  await wait(() => fs.existsSync(path.join(directory, 'ready')), '本地执行与远程开启')
  assert.equal(
    fs.readFileSync(path.join(workspace, 'local.txt'), 'utf8'),
    `local:${fixture.token}\n`,
  )
  await wait(async () => {
    try {
      return (await fetch('http://127.0.0.1:15174')).ok
    } catch {
      return false
    }
  }, 'Web 启动')
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(
    (username) => window.localStorage.setItem('skynet.username', username),
    fixture.username,
  )
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:15174')
  const input = page.getByRole('textbox', { name: '给 Agent 发送消息', exact: true })
  await input.waitFor()
  await wait(async () => !(await input.isDisabled()), '远程客户端恢复会话')
  assert.equal(await page.locator('#execution-mode').inputValue(), 'remote')
  assert.equal(await page.locator('#execution-mode option[value="local"]').count(), 0)
  async function send(text) {
    await input.fill(text)
    await page.getByRole('button', { name: '发送消息', exact: true }).click()
  }
  async function completed() {
    await wait(
      async () => (await page.getByRole('button', { name: '停止', exact: true }).count()) > 0,
      '模型开始',
    )
    await wait(
      async () => (await page.getByRole('button', { name: '发送消息', exact: true }).count()) > 0,
      '模型完成',
    )
  }
  await send(
    `请仅用 exec_command 执行 printf 'remote:${fixture.token}' > remote.txt && cat remote.txt。`,
  )
  await completed()
  assert.equal(
    fs.readFileSync(path.join(workspace, 'remote.txt'), 'utf8'),
    `remote:${fixture.token}`,
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await send(
    `请仅用一次 exec_command 执行 printf started > remote-started.txt; sleep 30; printf forbidden > remote-completed.txt。设置 yield_time_ms 为 1000、timeout_ms 为 60000。这个任务用于验证从桌面关闭远程执行后停止进程，请不要拆开命令。`,
  )
  await wait(
    () => fs.existsSync(path.join(workspace, 'remote-started.txt')),
    '移动布局远程任务实际开始',
  )
  fs.writeFileSync(path.join(directory, 'disable'), 'disable')
  await wait(() => fs.existsSync(path.join(directory, 'disabled')), '桌面关闭远程执行')
  await wait(
    async () => (await page.getByRole('button', { name: '发送消息', exact: true }).count()) > 0,
    '远程任务停止',
  )
  await wait(async () => {
    const states = await page
      .locator('.tool-call')
      .filter({ hasText: 'remote-started.txt' })
      .locator('.tool-call__summary')
      .allTextContents()
    return (
      states.some((state) => state.includes('已停止')) &&
      states.every((state) => !state.includes('正在执行') && !state.includes('正在判断权限'))
    )
  }, '目标进程退出并同步取消终态')
  await send('请执行 printf forbidden > disabled.txt，验证当前执行能力。')
  await wait(
    async () => (await page.getByRole('alert').filter({ hasText: '未开启远程执行' }).count()) > 0,
    '关闭后拒绝新远程任务',
  )
  assert(!fs.existsSync(path.join(workspace, 'disabled.txt')))
  fs.writeFileSync(path.join(directory, 'remoteDone'), 'ready')
  await wait(() => fs.existsSync(path.join(directory, 'result.json')), '原生本机继续与切换目标')
  const result = JSON.parse(fs.readFileSync(path.join(directory, 'result.json')))
  assert.equal(result.status, 'passed', JSON.stringify(result))
  assert.equal(fs.readFileSync(path.join(workspace, 'owner.txt'), 'utf8'), `owner:${fixture.token}`)
  assert(!fs.existsSync(path.join(workspace, 'cloud-only.txt')))
  assert(!fs.existsSync(path.join(workspace, 'remote-completed.txt')))
  await wait(() => child.exitCode !== null, '原生退出')
  await page.setViewportSize({ width: 1440, height: 900 })
  await send('请执行 printf forbidden > offline.txt，验证桌面离线处理。')
  await wait(
    async () => (await page.getByRole('alert').filter({ hasText: '目标桌面离线' }).count()) > 0,
    '离线拒绝',
  )
  assert.equal(await page.getByRole('button', { name: '停止', exact: true }).count(), 0)
  assert(!fs.existsSync(path.join(workspace, 'offline.txt')))
  await page.screenshot({ path: path.join(directory, 'remote.png'), fullPage: true })
  fs.writeFileSync(
    path.join(fixture.evidenceDirectory, 'desktop-execution.json'),
    JSON.stringify(
      {
        status: 'passed',
        directory,
        workspace,
        scenarios: [
          'native-patch-and-shell',
          'web-remote',
          'mobile-layout-remote',
          'remote-off-cancels',
          'remote-off-rejects',
          'owner-continues',
          'switch-target-no-sync',
          'desktop-offline',
        ],
      },
      null,
      2,
    ) + '\n',
  )
  console.log('Desktop execution real-model E2E passed: ' + directory)
} catch (error) {
  console.error('执行验收证据：' + directory)
  console.error(fs.readFileSync(path.join(directory, 'app.log'), 'utf8').slice(-12000))
  throw error
} finally {
  child.kill('SIGTERM')
  vite.kill('SIGTERM')
  await browser?.close()
}
