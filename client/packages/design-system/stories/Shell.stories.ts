import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ChatPage from '../../../src/features/chat/ChatPage.vue'
import { createBrowserChatRuntime } from '../../../src/services/browser-chat-runtime'
import { useChatStore } from '../../../src/stores/chat'
import { useTheme } from '../../../src/composables/useTheme'
import { ChatClient } from '../../../src/services/chat-client'
import { MockAgentChannel } from '../../../src/services/mock-agent-channel'

const meta = {
  title: '规范/聊天页面',
  component: ChatPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChatPage>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  render: (_args, context) => ({
    components: { ChatPage },
    setup() {
      useChatStore().setRuntime(createBrowserChatRuntime(new ChatClient(new MockAgentChannel())))
      useTheme().setTheme(context.globals.theme === 'dark' ? 'dark' : 'light')
    },
    template: '<ChatPage />',
  }),
}
