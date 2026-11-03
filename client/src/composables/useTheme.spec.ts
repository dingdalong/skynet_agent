import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('主题偏好', () => {
  const storage = { getItem: vi.fn(), setItem: vi.fn() }

  beforeEach(() => {
    vi.resetModules()
    storage.getItem.mockReset()
    storage.setItem.mockReset()
    vi.stubGlobal('localStorage', storage)
    delete document.documentElement.dataset.theme
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('导入不访问存储，首次使用读取偏好并在多个调用间共享', async () => {
    storage.getItem.mockReturnValue('dark')
    const { useTheme } = await import('./useTheme')
    expect(storage.getItem).not.toHaveBeenCalled()
    const first = useTheme()
    expect(first.theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    const second = useTheme()
    first.toggleTheme()
    expect(second.theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(storage.getItem).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('系统深色为 %s 时，每次点击都切换实际明暗', async (dark) => {
    const matchMedia = vi.fn().mockReturnValue({ matches: dark })
    vi.stubGlobal('matchMedia', matchMedia)
    const { useTheme } = await import('./useTheme')
    const state = useTheme()
    expect(state.theme.value).toBe('system')
    state.toggleTheme()
    expect(state.theme.value).toBe(dark ? 'light' : 'dark')
    state.toggleTheme()
    expect(state.theme.value).toBe(dark ? 'dark' : 'light')
    expect(document.documentElement.dataset.theme).toBe(state.theme.value)
  })

  it('系统主题变化后按最新的实际主题切换，手动偏好优先', async () => {
    const media = { matches: false }
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(media))
    const { useTheme } = await import('./useTheme')
    const state = useTheme()
    media.matches = true
    state.toggleTheme()
    expect(state.theme.value).toBe('light')
    state.toggleTheme()
    expect(state.theme.value).toBe('dark')
    state.setTheme('system')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    media.matches = false
    state.toggleTheme()
    expect(state.theme.value).toBe('dark')
  })

  it.each(['read', 'write'])('%s 失败仍能应用主题和切换', async (failure) => {
    storage.getItem.mockReturnValue('light')
    storage[failure === 'read' ? 'getItem' : 'setItem'].mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    const { useTheme } = await import('./useTheme')
    const state = useTheme()
    expect(state.theme.value).toBe(failure === 'read' ? 'system' : 'light')
    state.setTheme('dark')
    expect(state.theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(console.warn).toHaveBeenCalled()
  })
})
