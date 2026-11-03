import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Plus, Send } from 'lucide-vue-next'
import { ref } from 'vue'
import SkButton from '../src/components/SkButton.vue'
import SkEmptyState from '../src/components/SkEmptyState.vue'
import SkIconButton from '../src/components/SkIconButton.vue'
import SkStatusBadge from '../src/components/SkStatusBadge.vue'
import SkTextField from '../src/components/SkTextField.vue'

const meta = {
  title: '规范/组件',
  id: 'design-system-components',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Buttons: Story = {
  render: () => ({
    components: { Plus, Send, SkButton, SkIconButton },
    setup() {
      return { loading: ref(true) }
    },
    template: `
      <main class="story-page">
        <p class="eyebrow">INTERACTION</p>
        <h1>操作层级</h1>
        <section class="component-section">
          <div class="button-row">
            <SkButton><template #leading><Send :size="16" aria-hidden="true" /></template>发送消息</SkButton>
            <SkButton variant="secondary"><template #leading><Plus :size="16" aria-hidden="true" /></template>新建会话</SkButton>
            <SkButton variant="ghost">了解详情</SkButton>
            <SkButton variant="danger">删除</SkButton>
          </div>
          <div class="button-row">
            <SkButton size="small">小尺寸</SkButton>
            <SkButton size="large">大尺寸</SkButton>
            <SkButton :loading="loading">异步操作</SkButton>
            <SkButton disabled>不可用</SkButton>
            <SkIconButton label="图标发送消息" variant="primary"><Send :size="18" aria-hidden="true" /></SkIconButton>
            <SkIconButton label="新建会话图标" variant="bordered"><Plus :size="18" aria-hidden="true" /></SkIconButton>
            <SkIconButton label="显示上下文" pressed><Plus :size="18" aria-hidden="true" /></SkIconButton>
          </div>
        </section>
      </main>
    `,
  }),
}

export const FieldsAndStatus: Story = {
  render: () => ({
    components: { SkStatusBadge, SkTextField },
    setup() {
      return { value: ref('') }
    },
    template: `
      <main class="story-page">
        <p class="eyebrow">FEEDBACK</p>
        <h1>输入与状态</h1>
        <section class="component-section split">
          <SkTextField
            v-model="value"
            label="会话名称"
            hint="使用能帮助你之后识别的名称。"
            placeholder="例如：桌面客户端架构"
          />
          <SkTextField model-value="重复名称" label="出错的名称" error="名称已存在，请换一个。" />
          <SkTextField model-value="归档会话" label="不可编辑的名称" disabled />
          <div class="status-stack">
            <SkStatusBadge status="idle" label="尚未开始" />
            <SkStatusBadge status="running" label="正在生成" />
            <SkStatusBadge status="success" label="已完成" />
            <SkStatusBadge status="warning" label="等待确认" />
            <SkStatusBadge status="danger" label="连接失败" />
          </div>
        </section>
      </main>
    `,
  }),
}

export const Empty: Story = {
  render: () => ({
    components: { Send, SkButton, SkEmptyState },
    template: `
      <main class="story-page centered">
        <SkEmptyState title="从一个清晰的问题开始" description="Agent 会在这里展示工作过程和结果。">
          <template #icon><Send :size="22" /></template>
          <SkButton>新建会话</SkButton>
        </SkEmptyState>
      </main>
    `,
  }),
}
