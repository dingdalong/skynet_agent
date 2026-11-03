<script setup lang="ts">
// Adapted from Beautiful UI Vue: /agent/components/prompt-bar.vue.txt.
import { SkButton, SkIconButton } from '@skynet/design-system'
import { ArrowUp, Square } from 'lucide-vue-next'
import { nextTick, ref, watch } from 'vue'

export type PromptBarVariant = 'Rounded' | 'Pill'
const props = withDefaults(
  defineProps<{
    variant?: PromptBarVariant
    compact?: boolean
    multiline?: boolean
    disabled?: boolean
    canSend: boolean
    runState: 'idle' | 'running' | 'cancelling'
  }>(),
  { variant: 'Rounded', compact: false, multiline: false, disabled: false },
)
const draft = defineModel<string>({ required: true })
const emit = defineEmits<{ send: [message: string]; stop: [] }>()
const textarea = ref<HTMLTextAreaElement | null>(null)

function resizeTextarea() {
  const element = textarea.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

async function focus() {
  await nextTick()
  textarea.value?.focus()
}

function send() {
  if (!props.disabled && props.canSend && draft.value.trim() && props.runState === 'idle')
    emit('send', draft.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

watch(draft, resizeTextarea, { flush: 'post', immediate: true })
defineExpose({ focus })
</script>

<template>
  <div
    class="prompt-bar"
    :class="{ 'prompt-bar--compact': compact, 'prompt-bar--multiline': multiline }"
  >
    <div class="prompt-bar__composer" :class="{ 'prompt-bar__composer--pill': variant === 'Pill' }">
      <textarea
        ref="textarea"
        v-model="draft"
        :rows="multiline ? 2 : 1"
        :disabled="disabled"
        :placeholder="disabled ? '连接 Agent 后即可发送' : '给 Agent 发送消息…'"
        aria-label="给 Agent 发送消息"
        @input="resizeTextarea"
        @keydown="onKeydown"
      />
      <div class="prompt-bar__controls">
        <span class="prompt-bar__caption">{{
          disabled ? '等待连接' : runState === 'idle' ? '云端 Agent' : '正在生成回答'
        }}</span>
        <SkButton
          v-if="runState !== 'idle'"
          :disabled="runState === 'cancelling'"
          @click="emit('stop')"
        >
          <template #leading><Square :size="12" fill="currentColor" aria-hidden="true" /></template>
          {{ runState === 'cancelling' ? '正在停止' : '停止' }}
        </SkButton>
        <SkIconButton
          v-else
          variant="primary"
          :disabled="disabled || !canSend || !draft.trim()"
          label="发送消息"
          @click="send"
        >
          <ArrowUp :size="18" aria-hidden="true" />
        </SkIconButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-bar {
  display: flex;
  width: 100%;
  max-width: 26.25rem;
  min-height: 24rem;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: var(--sk-p-space-8);
}
.prompt-bar--compact {
  min-height: 0;
  max-width: none;
  padding-bottom: 0;
}
.prompt-bar__composer {
  padding: var(--sk-p-space-3);
  border: 1px solid var(--sk-border-default);
  border-radius: var(--sk-p-radius-lg);
  background: var(--sk-surface-default);
  box-shadow: var(--sk-shadow-button);
  transition:
    border-color var(--sk-p-duration-fast),
    box-shadow var(--sk-p-duration-fast);
}
.prompt-bar__composer--pill {
  border-radius: var(--sk-p-radius-full);
}
.prompt-bar__composer:focus-within {
  border-color: var(--sk-focus);
  box-shadow:
    0 0 0 2px var(--sk-surface-default),
    0 0 0 4px var(--sk-focus);
}
.prompt-bar textarea {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  max-height: var(--sk-c-composer-max-height);
  resize: none;
  padding: var(--sk-p-space-1);
  border: 0;
  outline: none;
  background: transparent;
  color: var(--sk-label-primary);
  font-size: var(--sk-p-size-text-mobile-body);
  line-height: 1.55;
}
.prompt-bar--multiline textarea {
  min-height: var(--sk-c-composer-min-height);
}
.prompt-bar textarea::placeholder {
  color: var(--sk-label-secondary);
}
.prompt-bar__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-p-space-2);
  margin-top: var(--sk-p-space-1);
}
.prompt-bar__caption {
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}
@media (max-height: 480px) {
  .prompt-bar textarea {
    max-height: 4rem;
  }
  .prompt-bar--multiline textarea {
    min-height: 2rem;
  }
}
</style>
