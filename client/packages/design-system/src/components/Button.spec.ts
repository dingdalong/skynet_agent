import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SkButton from './SkButton.vue'

describe('SkButton', () => {
  it('在加载时禁用操作并暴露忙碌状态', () => {
    const wrapper = mount(SkButton, {
      props: {
        loading: true,
      },
      slots: {
        default: '发送',
      },
    })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
  })

  it('保留按钮类型和可访问名称', () => {
    const wrapper = mount(SkButton, {
      props: {
        type: 'submit',
      },
      slots: {
        default: '保存',
      },
    })

    expect(wrapper.get('button').attributes('type')).toBe('submit')
    expect(wrapper.text()).toContain('保存')
  })
})
