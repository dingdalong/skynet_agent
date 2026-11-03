import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTauri } from '@tauri-apps/api/core'
import { getPlatformCapabilities } from './capabilities'

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe.each([false, true])('原生宿主为 %s', (native) => {
  it.each([
    ['Macintosh; Intel Mac OS X', 0, 'desktop'],
    ['Windows NT 10.0', 10, 'desktop'],
    ['X11; Linux x86_64', 0, 'desktop'],
    ['iPhone; CPU iPhone OS', 5, 'mobile'],
    ['iPad; CPU OS', 5, 'mobile'],
    ['Linux; Android', 5, 'mobile'],
    ['Macintosh; Intel Mac OS X', 5, 'mobile'],
  ] as const)('%s 触点数 %s 使用 %s 布局', (userAgent, maxTouchPoints, layout) => {
    vi.mocked(isTauri).mockReturnValue(native)
    vi.stubGlobal('navigator', { userAgent, maxTouchPoints })
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    expect(getPlatformCapabilities()).toMatchObject({
      kind: native ? layout : 'web',
      layout,
      usesNativeWindowChrome: native && layout === 'desktop',
    })
  })
})
