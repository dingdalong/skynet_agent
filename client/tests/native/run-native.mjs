import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { Buffer } from 'node:buffer'
import { setInterval, clearInterval } from 'node:timers'
import { fileURLToPath, URL } from 'node:url'
import { fnv1a32 } from '../../../server/tests/integration/gateway_socket.mjs'

if (process.platform !== 'darwin') throw new Error('原生重载夹具当前在 macOS 验证')
const root = fileURLToPath(new URL('../../..', import.meta.url))
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skynet-native-chat-'))
const evidence = { connections: 0, closes: 0, requests: [] }
const save = () => fs.writeFileSync(path.join(directory, 'evidence.json'), JSON.stringify(evidence))
const names = new Map(
  ['LoginReq', 'UserSnapshotReq', 'MessageSendReq', 'MessageCancelReq', 'SessionCreateReq'].map(
    (name) => [fnv1a32(`skynet.agent.v1.${name}`), name],
  ),
)
const sockets = new Set()
const server = net.createServer((client) => {
  const connection = ++evidence.connections
  save()
  const upstream = net.connect(18791, '127.0.0.1')
  sockets.add(client)
  sockets.add(upstream)
  let buffered = Buffer.alloc(0)
  let handshake = false
  client.on('data', (chunk) => {
    buffered = Buffer.concat([buffered, chunk])
    if (!handshake) {
      const end = buffered.indexOf('\r\n\r\n')
      if (end < 0) return
      buffered = buffered.subarray(end + 4)
      handshake = true
    }
    while (buffered.length >= 2) {
      const opcode = buffered[0] & 15
      const masked = Boolean(buffered[1] & 128)
      let length = buffered[1] & 127
      let offset = 2
      if (length === 126) {
        if (buffered.length < 4) return
        length = buffered.readUInt16BE(2)
        offset = 4
      } else if (length === 127) {
        if (buffered.length < 10) return
        length = Number(buffered.readBigUInt64BE(2))
        offset = 10
      }
      const mask = offset
      if (masked) offset += 4
      if (buffered.length < offset + length) return
      const payload = Buffer.from(buffered.subarray(offset, offset + length))
      if (masked) for (let i = 0; i < length; i++) payload[i] ^= buffered[mask + (i % 4)]
      if (opcode === 2 && payload.length >= 9) {
        evidence.requests.push({
          connection,
          messageId: payload.readUInt32BE(1),
          name: names.get(payload.readUInt32BE(5)) ?? 'unknown',
        })
        save()
      }
      buffered = buffered.subarray(offset + length)
    }
  })
  client.pipe(upstream)
  upstream.pipe(client)
  client.on('close', () => {
    evidence.closes++
    sockets.delete(client)
    upstream.destroy()
    save()
  })
  upstream.on('close', () => sockets.delete(upstream))
  client.on('error', () => upstream.destroy())
  upstream.on('error', () => client.destroy())
})
let child
let timer
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(18793, '127.0.0.1', resolve)
  })
  save()
  const app = path.join(directory, 'Skynet Chat Probe.app')
  const executable = path.join(app, 'Contents', 'MacOS', 'chat_reload_probe')
  fs.mkdirSync(path.dirname(executable), { recursive: true })
  fs.copyFileSync(
    path.join(root, 'client/src-tauri/target/debug/examples/chat_reload_probe'),
    executable,
  )
  fs.chmodSync(executable, 0o755)
  fs.writeFileSync(
    path.join(app, 'Contents/Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.skynet.agent.chatprobe</string><key>CFBundleExecutable</key><string>chat_reload_probe</string><key>CFBundleName</key><string>Skynet Chat Probe</string><key>CFBundlePackageType</key><string>APPL</string><key>NSHighResolutionCapable</key><true/></dict></plist>`,
  )
  const signed = spawnSync('codesign', ['--force', '--deep', '--sign', '-', app], {
    encoding: 'utf8',
  })
  if (signed.status !== 0) throw new Error(signed.stderr)
  const log = fs.openSync(path.join(directory, 'app.log'), 'w')
  child = spawn(executable, [], {
    env: { ...process.env, CHAT_PROBE_DIR: directory },
    stdio: ['ignore', log, log],
  })
  fs.writeFileSync(path.join(directory, 'pid'), String(child.pid))
  timer = setInterval(() => {
    const marker = path.join(directory, 'drop')
    if (fs.existsSync(marker)) {
      fs.unlinkSync(marker)
      for (const socket of sockets) socket.destroy()
    }
  }, 20)
  let result
  for (let attempt = 0; attempt < 600; attempt++) {
    const report = path.join(directory, 'result.json')
    if (fs.existsSync(report)) {
      try {
        result = JSON.parse(fs.readFileSync(report, 'utf8'))
        break
      } catch {
        /* 等待完整报告。 */
      }
    }
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('原生夹具提前退出')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.equal(
    result?.status,
    'passed',
    JSON.stringify(result ?? { error: '原生夹具未在时限内完成' }),
  )
  const navigations = Number(fs.readFileSync(path.join(directory, 'navigations'), 'utf8'))
  assert.ok(navigations >= 5, `没有执行足够的实际文档重载: ${navigations}`)
  assert.equal(evidence.connections, 3)
  assert.equal(evidence.requests.filter((request) => request.name === 'UserSnapshotReq').length, 0)
  for (const connection of [1, 2, 3]) {
    const requests = evidence.requests.filter((request) => request.connection === connection)
    assert.equal(requests[0].name, 'LoginReq')
    assert.equal(requests[0].messageId, 1)
    assert.equal(requests.filter((request) => request.name === 'LoginReq').length, 1)
    requests.forEach((request, index) => assert.equal(request.messageId, index + 1))
  }
  console.log(
    `Native reload probe passed: ${navigations} documents, one WS across reloads, reconnect and switch-user verified`,
  )
} catch (error) {
  console.error(`原生夹具证据：${directory}`)
  const log = path.join(directory, 'app.log')
  if (fs.existsSync(log)) console.error(fs.readFileSync(log, 'utf8').slice(-8000))
  throw error
} finally {
  clearInterval(timer)
  child?.kill('SIGTERM')
  for (const socket of sockets) socket.destroy()
  await new Promise((resolve) => server.close(resolve))
}
