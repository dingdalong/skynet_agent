import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeUsername,
  readUsername,
  saveUsername,
  readSelectedSession,
  saveSelectedSession,
} from './user-preferences'

afterEach(() => vi.unstubAllGlobals())
describe('用户偏好', () => {
  it.each(['用户', 'Alice', 'alice', '😀'.repeat(32)])(
    '接受 Unicode 用户名并按字符计数：%s',
    (name) => {
      expect(normalizeUsername(` \t${name}\n`)).toBe(name)
    },
  )
  it.each(['', ' \n', '😀'.repeat(33), 'a\nb', 'a\0b', '\ud800'])(
    '拒绝空名、超长与无效字符',
    (name) => {
      expect(() => normalizeUsername(name)).toThrow('用户名')
    },
  )
  it('存储属性访问及读写失败不阻止本次连接', () => {
    const failed = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    vi.stubGlobal('localStorage', failed)
    vi.stubGlobal('sessionStorage', failed)
    expect(readUsername()).toBe('')
    expect(readSelectedSession('alice')).toBe('')
    expect(() => saveUsername('alice')).not.toThrow()
    expect(() => saveUsername('')).not.toThrow()
    expect(() => saveSelectedSession('alice', 's1')).not.toThrow()
  })
})
