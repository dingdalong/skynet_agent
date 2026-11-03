import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PromptBar from './PromptBar.vue'

function mountComposer() {
  return mount(PromptBar, {
    props: { modelValue: '未发送的草稿', canSend: true, runState: 'idle' },
  })
}

describe('PromptBar', () => {
  it('输入法组合与换行不会提交，普通 Enter 提交后由父级决定是否清空草稿', async () => {
    const wrapper = mountComposer()
    const input = wrapper.get('textarea')
    await input.trigger('keydown', { key: 'Enter', isComposing: true })
    await input.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('send')).toBeUndefined()
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toEqual([['未发送的草稿']])
    expect(input.element.value).toBe('未发送的草稿')
    await wrapper.setProps({ modelValue: '' })
    expect(input.element.value).toBe('')
  })

  it('断线、会话操作占用和空白草稿都不会发送，恢复后可以继续发送原稿', async () => {
    const wrapper = mountComposer()
    const input = wrapper.get('textarea')
    await wrapper.setProps({ disabled: true })
    await input.trigger('keydown', { key: 'Enter' })
    await wrapper.setProps({ disabled: false, canSend: false })
    await input.trigger('keydown', { key: 'Enter' })
    await wrapper.setProps({ canSend: true, modelValue: '  \n ' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
    await wrapper.setProps({ modelValue: '原会话草稿' })
    await wrapper.get('button[aria-label="发送消息"]').trigger('click')
    expect(wrapper.emitted('send')).toEqual([['原会话草稿']])
  })

  it('生成中保留下一条草稿，停止确认期间不能重复停止或发送', async () => {
    const wrapper = mountComposer()
    await wrapper.setProps({ runState: 'running', canSend: false })
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('stop')).toEqual([[]])
    await wrapper.setProps({ runState: 'cancelling' })
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('stop')).toHaveLength(1)
    expect(wrapper.emitted('send')).toBeUndefined()
    expect(wrapper.get('textarea').element.value).toBe('未发送的草稿')
  })
})
