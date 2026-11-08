import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { login } from './gateway_socket.mjs'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const args = process.argv.slice(2)
assert.ok(args.length, '用法: node run_with_real_gateway.mjs <command> [args...]')
const configuredEnv = process.env.SKYNET_ENV_FILE ?? path.join(root, 'server/.env')
if (fs.existsSync(configuredEnv)) loadEnvFile(configuredEnv)
assert.ok(process.env.DEEPSEEK_API_KEY, '真实模型验收缺少 DEEPSEEK_API_KEY，不允许跳过或回退假模型')
const key = process.env.DEEPSEEK_API_KEY
const redact = (value) => String(value).replaceAll(key, '[redacted]')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'skynet-real-model-'))
const evidenceDirectory = path.join(
  root,
  'client/test-artifacts/real-model',
  path.basename(temporary),
)
fs.mkdirSync(evidenceDirectory, { recursive: true })
fs.mkdirSync(path.join(temporary, 'outside'))
const fixture = {
  username: `real-${Date.now().toString(36)}`,
  token: `verified-${Date.now().toString(36)}`,
  workspaceRoot: path.join(temporary, 'work_dir'),
  outsideFile: path.join(temporary, 'outside', 'authorized.txt'),
  credentialFile: path.join(temporary, 'outside', 'credential-fixture.txt'),
  permissionEvidence: path.join(evidenceDirectory, 'permission.json'),
  evidenceDirectory,
}
fs.writeFileSync(fixture.outsideFile, 'unchanged')
fs.writeFileSync(fixture.credentialFile, 'synthetic-credential-do-not-read')
const envFile = path.join(temporary, 'env')
fs.writeFileSync(envFile, 'SKYNET_CFG_CHANNEL=e2e\n', { mode: 0o600 })
const env = {
  ...process.env,
  SKYNET_CFG_CHANNEL: 'e2e',
  SKYNET_ENV_FILE: envFile,
  AGENT_WORKSPACE_ROOT: fixture.workspaceRoot,
  AGENT_REAL_FIXTURE: JSON.stringify(fixture),
  AGENT_WS_URL: 'ws://127.0.0.1:18791/agent',
}
const metadata = {
  startedAt: new Date().toISOString(),
  supplier: new URL(env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').hostname,
  model: env.DEEPSEEK_MODEL ?? 'deepseek-flash',
  status: 'running',
  fixture: temporary,
}
const logs = new Map()
const children = new Set()
let upstream
let network
let succeeded = false
function start(command, parameters, name, childEnv = env, cwd = path.join(root, 'server')) {
  const child = spawn(command, parameters, {
    cwd,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.add(child)
  logs.set(name, '')
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      logs.set(name, logs.get(name) + chunk.toString())
      if (name === 'client') process.stdout.write(redact(chunk.toString()))
    })
  child.completion = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      children.delete(child)
      resolve({ code, signal })
    })
  })
  return child
}
async function requireSuccess(child, name) {
  const result = await child.completion
  assert.equal(result.code, 0, `${name}失败，详情见 ${evidenceDirectory}`)
}
async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      reject(new Error(`验收端口 ${port} 已占用，保留现有进程并停止测试`))
    })
    socket.once('error', (error) => (error.code === 'ECONNREFUSED' ? resolve() : reject(error)))
  })
}
const stop = () => {
  for (const child of children) child.kill('SIGTERM')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
try {
  await assertPortAvailable(18791)
  await assertPortAvailable(18001)
  network = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.end(`network:${fixture.token}`)
  })
  await new Promise((resolve) => network.listen(0, '127.0.0.1', resolve))
  fixture.networkUrl = `http://127.0.0.1:${network.address().port}/probe`
  env.AGENT_REAL_FIXTURE = JSON.stringify(fixture)
  await requireSuccess(
    start('./3rd/skynet/skynet', ['tests/integration/real_permission.config'], 'permission'),
    'permission',
  )
  upstream = start('./start.sh', [], 'server')
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    assert.equal(upstream.exitCode, null, '真实模型网关提前退出')
    try {
      const connected = await login(env.AGENT_WS_URL)
      connected.socket.close()
      ready = true
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  assert.ok(ready, '真实模型网关启动超时')
  const clientEnv = { ...env }
  delete clientEnv.DEEPSEEK_API_KEY
  await requireSuccess(start(args[0], args.slice(1), 'client', clientEnv, process.cwd()), 'client')
  assert.equal(fs.readFileSync(fixture.outsideFile, 'utf8'), `outside:${fixture.token}`)
  assert.equal(fs.readFileSync(fixture.credentialFile, 'utf8'), 'synthetic-credential-do-not-read')
  const userDirectory = path.join(
    fixture.workspaceRoot,
    Buffer.from(fixture.username).toString('hex'),
  )
  const sessions = fs.readdirSync(userDirectory).map((name) => path.join(userDirectory, name))
  const directory = sessions.find((entry) => fs.existsSync(path.join(entry, 'result.txt')))
  assert.ok(directory, '真实模型没有生成任务文件')
  assert.equal(
    fs.readFileSync(path.join(directory, 'result.txt'), 'utf8'),
    `updated:${fixture.token}\n`,
  )
  assert.ok(!fs.existsSync(path.join(directory, 'note.txt')), '补丁没有移动原文件')
  assert.equal(fs.readFileSync(path.join(directory, 'pty.txt'), 'utf8'), fixture.token)
  assert.equal(fs.readFileSync(path.join(directory, 'model-pro.txt'), 'utf8'), fixture.token)
  assert.equal(fs.readFileSync(path.join(directory, 'resumed.txt'), 'utf8'), fixture.token)
  assert.ok(!fs.existsSync(path.join(directory, 'cancel-completed.txt')), '取消后命令仍然继续执行')
  const steps = fs.readFileSync(path.join(directory, 'steps.txt'), 'utf8').trim().split(/\r?\n/)
  assert.deepEqual(
    steps,
    Array.from({ length: 40 }, (_, index) => String(index + 1)),
    '四十次工具调用的文件结果不正确',
  )
  const pid = Number(fs.readFileSync(path.join(directory, 'cancel.pid'), 'utf8').trim())
  assert.ok(Number.isSafeInteger(pid) && pid > 0, '缺少取消进程 PID')
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }, '取消进程仍然存活')
  const verified = await login(env.AGENT_WS_URL, fixture.username)
  try {
    fs.writeFileSync(
      path.join(evidenceDirectory, 'snapshot.json'),
      redact(JSON.stringify(verified.snapshot, null, 2)) + '\n',
    )
    const messages = verified.snapshot.sessions.flatMap((session) => session.messages)
    assert.ok(
      messages.every((message) => message.status !== 4),
      '真实模型出现了生成错误',
    )
    const tools = messages.flatMap((message) => message.toolCalls ?? [])
    assert.ok(
      tools.every(
        (tool) =>
          tool.permissionReason !== '权限模型请求失败，已阻止执行' &&
          tool.permissionReason !== '权限模型响应无效，已阻止执行',
      ),
      '供应商或响应格式失败不能作为权限拒绝通过验收',
    )
    assert.ok(tools.some((tool) => tool.name === 'apply_patch' && tool.status === 'completed'))
    assert.ok(
      tools.some((tool) => tool.permissionMode === 'require_escalated' && tool.exitCode === 0),
    )
    assert.ok(tools.some((tool) => tool.name === 'write_stdin' && tool.exitCode === 0))
    assert.ok(tools.some((tool) => tool.status === 'cancelled'))
    assert.ok(
      tools.some((tool) => tool.reasoning?.some((block) => block.modelId === 'deepseek-v4-pro')),
      '权限模型未跟随切换',
    )
    const mainReasoning = messages.flatMap((message) => message.reasoning ?? [])
    const permissionReasoning = tools.flatMap((tool) => tool.reasoning ?? [])
    assert.ok(mainReasoning.some((block) => block.modelId === 'deepseek-flash' && block.text))
    assert.ok(mainReasoning.some((block) => block.modelId === 'deepseek-v4-pro' && block.text))
    assert.ok(
      permissionReasoning.some((block) => block.text),
      '缺少权限模型实际思考',
    )
    assert.equal(
      verified.snapshot.sessions.find((session) => session.id === path.basename(directory))
        ?.modelId,
      'deepseek-flash',
    )
    const usage = [
      ...(logs.get('server') ?? '').matchAll(
        /purpose=(main|permission).*?model=(\S+).*?input_tokens=(\d+).*?cached_tokens=(\d+).*?output_tokens=(\d+)/g,
      ),
    ].map((match) => ({
      purpose: match[1],
      model: match[2],
      inputTokens: Number(match[3]),
      cachedTokens: Number(match[4]),
      outputTokens: Number(match[5]),
    }))
    assert.ok(
      usage.some((item) => item.purpose === 'main' && item.model === 'deepseek-v4-pro'),
      '实际 Pro 请求缺少用量证据',
    )
    for (const purpose of ['main', 'permission'])
      assert.ok(
        usage.some((item) => item.purpose === purpose && item.cachedTokens > 0),
        purpose + ' 没有观测到真实缓存命中',
      )
    fs.writeFileSync(
      path.join(evidenceDirectory, 'usage.json'),
      JSON.stringify(usage, null, 2) + '\n',
    )
  } finally {
    verified.socket.close()
  }
  fs.writeFileSync(
    path.join(evidenceDirectory, 'files.json'),
    JSON.stringify(
      {
        result: fs.readFileSync(path.join(directory, 'result.txt'), 'utf8'),
        outside: fs.readFileSync(fixture.outsideFile, 'utf8'),
        pty: fs.readFileSync(path.join(directory, 'pty.txt'), 'utf8'),
        resumed: fs.readFileSync(path.join(directory, 'resumed.txt'), 'utf8'),
        steps,
        cancelledProcessExited: true,
        cancelledSideEffectAbsent: true,
      },
      null,
      2,
    ) + '\n',
  )
  succeeded = true
  console.log(`真实模型端到端验收通过，证据：${evidenceDirectory}`)
} catch (error) {
  metadata.error = redact(error?.stack ?? error)
  console.error(metadata.error)
  process.exitCode = 1
} finally {
  stop()
  await Promise.allSettled([...children].map((child) => child.completion))
  if (network) await new Promise((resolve) => network.close(resolve))
  for (const [name, content] of logs)
    fs.writeFileSync(path.join(evidenceDirectory, `${name}.log`), redact(content))
  metadata.status = succeeded ? 'passed' : 'failed'
  metadata.finishedAt = new Date().toISOString()
  fs.writeFileSync(
    path.join(evidenceDirectory, 'run.json'),
    JSON.stringify(metadata, null, 2) + '\n',
  )
  if (succeeded) fs.rmSync(temporary, { recursive: true })
  else console.error(`真实模型验收证据：${evidenceDirectory}`)
}
