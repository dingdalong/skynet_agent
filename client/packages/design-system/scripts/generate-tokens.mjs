import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(packageRoot, 'tokens/tokens.json')
const cssPath = path.join(packageRoot, 'src/styles/tokens.css')
const tsPath = path.join(packageRoot, 'src/styles/tokens.ts')
const checkOnly = process.argv.includes('--check')

function flattenTokens(group, prefix = []) {
  const entries = []

  for (const [name, value] of Object.entries(group)) {
    if (name.startsWith('$')) {
      continue
    }

    const nextPath = [...prefix, name]
    if (value && typeof value === 'object' && '$value' in value) {
      entries.push({ path: nextPath, value: value.$value, type: value.$type })
      continue
    }

    if (value && typeof value === 'object') {
      entries.push(...flattenTokens(value, nextPath))
    }
  }

  return entries
}

function variableName(tokenPath) {
  const [group, ...rest] = tokenPath
  const prefix = group === 'primitive' ? '--sk-p' : group === 'component' ? '--sk-c' : '--sk'
  return `${prefix}-${rest.join('-')}`
}

function serializeValue(value, type) {
  if (type === 'cubicBezier' && Array.isArray(value)) {
    return `cubic-bezier(${value.join(', ')})`
  }
  if (typeof value === 'string') {
    return value.replace(/\{([^}]+)\}/g, (_, alias) => {
      const tokenPath = alias.split('.')
      return `var(${variableName(tokenPath)})`
    })
  }
  return String(value)
}

function declarations(entries) {
  return entries
    .map(({ path, value, type }) => `  ${variableName(path)}: ${serializeValue(value, type)};`)
    .join('\n')
}

const document = JSON.parse(await readFile(sourcePath, 'utf8'))
const primitiveTokens = flattenTokens(document.primitive, ['primitive'])
const semanticTokens = flattenTokens(document.semantic, ['semantic'])
const componentTokens = flattenTokens(document.component, ['component'])
const darkTokens = flattenTokens(document.themes.dark, ['semantic'])
const highContrastTokens = flattenTokens(document.themes['high-contrast'], ['semantic'])

const semanticKeys = new Set(semanticTokens.map(({ path }) => path.slice(1).join('.')))
for (const token of darkTokens) {
  const key = token.path.slice(1).join('.')
  if (!semanticKeys.has(key)) {
    throw new Error(`深色主题包含未定义的语义 Token：${key}`)
  }
}

// 浅色也显式声明语义色，避免 macOS WebView 在回退基础值时保留控件的旧主题颜色。
const css = `/* 此文件由 scripts/generate-tokens.mjs 生成，请修改 tokens/tokens.json。 */
:root {
${declarations(primitiveTokens)}

${declarations(semanticTokens)}

${declarations(componentTokens)}
}

:root[data-theme='light'] {
  color-scheme: light;

${declarations(semanticTokens)}
}

:root[data-theme='dark'] {
  color-scheme: dark;

${declarations(darkTokens)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;

${declarations(darkTokens).replace(/^/gm, '  ')}
  }
}

:root[data-contrast='more'] {
${declarations(highContrastTokens)}
}

@media (prefers-contrast: more) {
  :root,
  :root[data-theme] {
${declarations(highContrastTokens).replace(/^/gm, '  ')}
  }
}

@media (forced-colors: active) {
  :root,
  :root[data-theme] {
    --sk-focus: Highlight;
    --sk-border-default: ButtonText;
    --sk-border-strong: ButtonText;
    --sk-separator: ButtonText;
  }
}
`

const tokenEntries = [...primitiveTokens, ...semanticTokens, ...componentTokens]
  .map(({ path }) => `  '${variableName(path)}': 'var(${variableName(path)})',`)
  .join('\n')

const ts = `/* 此文件由 scripts/generate-tokens.mjs 生成，请修改 tokens/tokens.json。 */
export const tokens = {
${tokenEntries}
} as const

export type TokenName = keyof typeof tokens
`

if (checkOnly) {
  const [currentCss, currentTs] = await Promise.all([
    readFile(cssPath, 'utf8').catch(() => ''),
    readFile(tsPath, 'utf8').catch(() => ''),
  ])
  if (currentCss !== css || currentTs !== ts) {
    throw new Error('生成的 Token 与源文件不一致，请运行 pnpm tokens')
  }
} else {
  await Promise.all([writeFile(cssPath, css), writeFile(tsPath, ts)])
}
