import { computed, ref } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'skynet-theme'
const theme = ref<ThemePreference>('system')
let initialized = false

function applyTheme(nextTheme: ThemePreference) {
  theme.value = nextTheme
  if (nextTheme === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = nextTheme
  }
  try {
    localStorage.setItem(storageKey, nextTheme)
  } catch (error) {
    console.warn('[useTheme] 无法保存主题偏好', error)
  }
}

export function useTheme() {
  if (!initialized) {
    initialized = true
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') theme.value = stored
    } catch (error) {
      console.warn('[useTheme] 无法读取主题偏好，使用系统主题', error)
    }
    applyTheme(theme.value)
  }

  return {
    theme: computed(() => theme.value),
    setTheme: applyTheme,
    toggleTheme() {
      const dark =
        theme.value === 'dark' ||
        (theme.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      applyTheme(dark ? 'light' : 'dark')
    },
  }
}
