import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ThinkingState from './ThinkingState.vue'

describe('供应商思考流', () => {
  it('增量与终态更新保持展开选择，安全保留取消前的文本', async () => {
    const block = {
      id: 'b1',
      runId: 'r1',
      modelId: 'flash',
      text: '先核对',
      status: 'streaming' as const,
    }
    const wrapper = mount(ThinkingState, { props: { blocks: [block] } })
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    await wrapper.get('button').trigger('click')
    await wrapper.setProps({
      blocks: [{ ...block, text: '先核对<script>data</script>', status: 'cancelled' }],
    })
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('思考已停止')
    expect(wrapper.get('[aria-label="思考内容"]').text()).toBe('先核对<script>data</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })
})
