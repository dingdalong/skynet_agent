import { spawn } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const mode = args.includes('dev') ? 'development' : 'production'
// 让 Cargo 与 Vite 使用相同的 .env 配置和进程环境覆盖规则。
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/@tauri-apps/cli/tauri.js', import.meta.url)), ...args],
  { cwd: root, env: { ...process.env, ...loadEnv(mode, root, 'VITE_') }, stdio: 'inherit' },
)
child.once('error', (error) => {
  console.error('[run-desktop]', error)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
