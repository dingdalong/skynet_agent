import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ToolCallItem from '../../../src/features/chat/components/ToolCallItem.vue'
import type { ToolCall } from '../../../src/types/chat'

const tool: ToolCall = {
  id: 'example-call',
  name: 'exec_command',
  arguments: '{"cmd":"pnpm test"}',
  status: 'completed',
  permissionReason: '运行项目测试符合用户要求，写入范围限于当前会话。',
  permissionMode: 'use_default',
  output: 'Tests 24 passed (24)\n',
  exitCode: 0,
  truncated: false,
  changedFiles: [],
  error: '',
  processId: '',
  runId: 'example-run',
  workingDirectory: '/work_dir/user/session',
}
const meta = {
  id: 'design-system-tools',
  title: '规范/工具调用',
  component: ToolCallItem,
  args: { tool },
  render: (args) => ({
    components: { ToolCallItem },
    setup: () => ({ args }),
    template:
      '<main style="max-width: 48rem; padding: var(--sk-p-space-4)"><ToolCallItem v-bind="args" /></main>',
  }),
} satisfies Meta<typeof ToolCallItem>
export default meta
type Story = StoryObj<typeof meta>
export const Completed: Story = {}
export const Judging: Story = {
  args: { tool: { ...tool, status: 'judging', output: '', exitCode: undefined } },
}
export const Running: Story = {
  args: { tool: { ...tool, status: 'running', output: 'Running tests…', exitCode: undefined } },
}
export const Denied: Story = {
  args: {
    tool: {
      ...tool,
      status: 'denied',
      output: '',
      exitCode: undefined,
      permissionReason: '此操作会访问其他会话的文件，已阻止执行。',
    },
  },
}
export const Failed: Story = {
  args: { tool: { ...tool, status: 'failed', output: 'Test failed\n', exitCode: 1 } },
}
export const Cancelled: Story = { args: { tool: { ...tool, status: 'cancelled', exitCode: 143 } } }
export const Patch: Story = {
  args: {
    tool: {
      ...tool,
      name: 'apply_patch',
      arguments: JSON.stringify({
        patch: '*** Begin Patch\n*** Add File: hello.lua\n+return {}\n*** End Patch',
      }),
      changedFiles: ['hello.lua'],
      output: '',
    },
  },
}
