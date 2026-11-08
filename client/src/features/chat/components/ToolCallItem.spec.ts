import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ToolCallItem from './ToolCallItem.vue'
import type { ToolCall } from '../../../types/chat'

const tool: ToolCall = {
  id: 'c1',
  name: 'exec_command',
  arguments: '{"cmd":"printf hello"}',
  status: 'judging',
  permissionReason: '',
  permissionMode: 'use_default',
  output: '',
  truncated: false,
  changedFiles: [],
  error: '',
  processId: '',
  runId: 'r1',
  workingDirectory: '/work/session',
}
describe('工具调用卡片', () => {
  it('真实状态更新保留用户展开选择，并安全展示终端文本', async () => {
    const wrapper = mount(ToolCallItem, { props: { tool } })
    expect(wrapper.text()).toContain('正在判断权限')
    const details = wrapper.get('details').element as HTMLDetailsElement
    details.open = true
    await wrapper.setProps({
      tool: { ...tool, status: 'running', output: '<script>alert(1)</script>' },
    })
    expect(details.open).toBe(true)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    await wrapper.setProps({ tool: { ...tool, status: 'completed', exitCode: 0 } })
    expect(wrapper.text()).toContain('退出码 0')
    expect(wrapper.text()).toContain('已完成')
  })
  it('拒绝时展开原因，沙盒外权限与错误明确展示', () => {
    const wrapper = mount(ToolCallItem, {
      props: {
        tool: {
          ...tool,
          status: 'denied',
          permissionMode: 'require_escalated',
          permissionReason: '授权不足',
          truncated: true,
        },
      },
    })
    expect((wrapper.get('details').element as HTMLDetailsElement).open).toBe(true)
    expect(wrapper.text()).toContain('已阻止')
    expect(wrapper.text()).toContain('沙盒外执行')
    expect(wrapper.text()).toContain('授权不足')
    expect(wrapper.text()).toContain('已截断')
  })
})
