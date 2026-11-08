import { ref } from 'vue'
import ThinkingState from '../../../src/features/chat/components/ThinkingState.vue'
import PromptBar from '../../../src/features/chat/components/PromptBar.vue'

export default { title: 'Design System/Agent Runtime', id: 'design-system-agent-runtime' }

export const Thinking = {
  render: () => ({
    components: { ThinkingState },
    setup: () => ({
      blocks: [
        {
          id: 'main-1',
          runId: 'r1',
          modelId: 'deepseek-flash',
          text: '先核对会话目录和用户目标，再执行已授权的文件修改。',
          status: 'completed',
        },
      ],
    }),
    template:
      '<main style="max-width:40rem;padding:1rem"><ThinkingState :blocks="blocks" /></main>',
  }),
}

export const Models = {
  render: () => ({
    components: { PromptBar },
    setup() {
      return {
        draft: ref(''),
        model: ref('deepseek-flash'),
        models: [
          { id: 'deepseek-flash', name: 'DeepSeek Flash', model: 'deepseek-flash' },
          { id: 'deepseek-v4-pro', name: 'DeepSeek Pro', model: 'deepseek-v4-pro' },
        ],
      }
    },
    template:
      '<main style="max-width:40rem;padding:8rem 1rem 1rem"><PromptBar v-model="draft" compact multiline :can-send="true" run-state="idle" :models="models" :model-id="model" @model="model = $event" /></main>',
  }),
}
