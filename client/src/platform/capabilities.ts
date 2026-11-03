import { isTauri } from '@tauri-apps/api/core'

export interface PlatformCapabilities {
  kind: 'web' | 'desktop' | 'mobile'
  layout: 'desktop' | 'mobile'
  usesNativeWindowChrome: boolean
  supportsKeyboard: boolean
  supportsTouch: boolean
  supportsNativeMenu: boolean
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const userAgent = navigator.userAgent.toLowerCase()
  // iPadOS 的桌面模式使用 Mac UA，仍应与移动 App 使用同一布局。
  const mobile =
    /iphone|ipad|ipod|android/.test(userAgent) ||
    (userAgent.includes('mac') && navigator.maxTouchPoints > 1)
  const native = isTauri()

  return {
    kind: native ? (mobile ? 'mobile' : 'desktop') : 'web',
    layout: mobile ? 'mobile' : 'desktop',
    usesNativeWindowChrome: native && !mobile,
    supportsKeyboard: !mobile || window.matchMedia('(pointer: fine)').matches,
    supportsTouch: window.matchMedia('(pointer: coarse)').matches,
    supportsNativeMenu: native,
  }
}
