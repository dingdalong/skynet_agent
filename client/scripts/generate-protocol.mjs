import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = resolve(clientRoot, '..')
const protoDirectory = join(projectRoot, 'common', 'proto')
const generatedDirectory = join(clientRoot, 'src', 'protocol', 'generated')
const generatedBaseName = 'agent_gateway'
const checkOnly = process.argv.includes('--check')
const outputDirectory = checkOnly
  ? mkdtempSync(join(tmpdir(), 'skynet-protocol-'))
  : generatedDirectory
const outputPath = join(outputDirectory, `${generatedBaseName}.js`)
const declarationPath = join(outputDirectory, `${generatedBaseName}.d.ts`)
const pbjsPath = join(clientRoot, 'node_modules', 'protobufjs-cli', 'bin', 'pbjs')

function findProtoFiles() {
  const filenames = readdirSync(protoDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.proto'))
    .map((entry) => entry.name)
    .sort()
  if (filenames.length === 0) {
    throw new Error(`common/proto 中没有 .proto 文件: ${protoDirectory}`)
  }
  return filenames.map((filename) => join(protoDirectory, filename))
}

function generate() {
  const protoFiles = findProtoFiles()
  execFileSync(
    process.execPath,
    [
      pbjsPath,
      '-t',
      'static-module',
      '-w',
      'esm',
      '--force-number',
      '--no-typeurl',
      '--no-service',
      '-d',
      '-o',
      outputPath,
      ...protoFiles,
    ],
    { cwd: clientRoot, stdio: 'inherit' },
  )
}

function assertMatches(path) {
  const expectedPath = join(generatedDirectory, path.slice(outputDirectory.length + 1))
  if (!existsSync(expectedPath)) {
    throw new Error(`缺少生成文件: ${expectedPath}`)
  }
  if (!readFileSync(expectedPath).equals(readFileSync(path))) {
    throw new Error(`生成代码已过期: ${expectedPath}`)
  }
}

try {
  if (!checkOnly) {
    mkdirSync(generatedDirectory, { recursive: true })
  }
  generate()
  if (checkOnly) {
    assertMatches(outputPath)
    assertMatches(declarationPath)
    console.log('Protobuf 生成代码与 common/proto 一致')
  }
} catch (error) {
  if (checkOnly) {
    console.error(error instanceof Error ? error.message : error)
    console.error('请运行 `pnpm proto:generate` 更新客户端协议代码')
    process.exitCode = 1
  } else {
    throw error
  }
} finally {
  if (checkOnly) {
    rmSync(outputDirectory, { recursive: true, force: true })
  }
}
