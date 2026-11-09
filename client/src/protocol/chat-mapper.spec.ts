import { describe, expect, it } from 'vitest'
import { toSnapshot } from './chat-mapper'

const snapshot = () => ({
  userId: 'u1',
  username: 'alice',
  chatSessions: [],
  models: [
    { id: 'pro', name: 'Pro', model: 'pro' },
    { id: 'flash', name: 'Flash', model: 'flash' },
  ],
  defaultModelId: 'flash',
  permissionModelId: '',
})

describe('聊天快照模型配置', () => {
  it('空会话快照保留显式默认模型，不依赖清单顺序，权限模型可跟随', () => {
    const value = toSnapshot(snapshot())
    expect(value.chatSessions).toEqual([])
    expect(value.defaultModelId).toBe('flash')
    expect(value.permissionModelId).toBe('')
    expect(toSnapshot({ ...snapshot(), permissionModelId: 'pro' }).permissionModelId).toBe('pro')
  })

  it.each([
    { defaultModelId: '' },
    { defaultModelId: 'unknown' },
    { permissionModelId: 'unknown' },
    { models: [] },
  ])('拒绝无法解析草稿模型的配置 %j', (override) => {
    expect(() => toSnapshot({ ...snapshot(), ...override })).toThrow('用户快照模型配置无效')
  })
})
