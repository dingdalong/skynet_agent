import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(packageRoot, 'src')
const colorLiteral = /(?:#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\()/gi
const ignoredFiles = new Set(['tokens.css', 'tokens.ts'])

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await filesBelow(filePath)))
    } else if (!ignoredFiles.has(entry.name)) {
      files.push(filePath)
    }
  }

  return files
}

const failures = []
for (const file of await filesBelow(sourceRoot)) {
  if (!/\.(css|ts|vue)$/.test(file)) {
    continue
  }
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(colorLiteral)) {
    const line = source.slice(0, match.index).split('\n').length
    failures.push(`${path.relative(packageRoot, file)}:${line}: ${match[0]}`)
  }
}

if (failures.length > 0) {
  throw new Error(`组件中存在原始颜色值：\n${failures.join('\n')}`)
}
