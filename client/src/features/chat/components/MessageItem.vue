<script setup lang="ts">
import { SkStatusBadge } from '@skynet/design-system'
import { Bot, UserRound } from 'lucide-vue-next'
import LoadingState from './LoadingState.vue'
import ToolChips from './ToolChips.vue'
import ThinkingState from './ThinkingState.vue'
import StreamingText from './StreamingText.vue'
import type { ChatMessage } from '../../../types/chat'

defineProps<{
  message: ChatMessage
}>()
</script>

<template>
  <article
    class="message"
    :class="`message--${message.role}`"
    :aria-label="message.role === 'user' ? '用户消息' : '助手回答'"
  >
    <div class="message__avatar" aria-hidden="true">
      <UserRound v-if="message.role === 'user'" :size="16" />
      <Bot v-else :size="17" />
    </div>
    <div class="message__body">
      <header
        v-if="
          message.status !== 'complete' && !(message.status === 'streaming' && !message.content)
        "
        class="message__header"
      >
        <SkStatusBadge v-if="message.status === 'streaming'" status="running" label="正在生成" />
        <SkStatusBadge v-else-if="message.status === 'cancelled'" status="warning" label="已停止" />
        <SkStatusBadge v-else-if="message.status === 'error'" status="danger" label="生成失败" />
      </header>
      <ThinkingState :blocks="message.reasoning ?? []" />
      <ToolChips :tools="message.toolCalls ?? []" />
      <StreamingText
        v-if="message.content && message.role === 'assistant'"
        :text="message.content"
        :status="message.status"
      />
      <p v-else-if="message.content" class="message__content">{{ message.content }}</p>
      <LoadingState
        v-else-if="
          message.status === 'streaming' && !message.toolCalls?.length && !message.reasoning?.length
        "
        label="正在等待回答"
        variant="Orbit"
      />
    </div>
  </article>
</template>

<style scoped>
.message {
  display: flex;
  width: 100%;
  max-width: var(--sk-c-message-max-width);
  align-items: flex-start;
  gap: var(--sk-p-space-3);
}

.message--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message__avatar {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--sk-border-default);
  border-radius: var(--sk-p-radius-full);
  background: var(--sk-label-primary);
  color: var(--sk-surface-default);
}

.message--user .message__avatar {
  border-color: transparent;
  background: var(--sk-surface-muted);
  color: var(--sk-label-primary);
}

.message__body {
  min-width: 0;
  max-width: min(100%, 42rem);
  border: 1px solid transparent;
  border-radius: var(--sk-p-radius-lg);
  padding: var(--sk-p-space-3) var(--sk-p-space-4);
}

.message--assistant .message__body {
  padding-top: var(--sk-p-space-1);
  padding-inline: 0;
}

.message--user .message__body {
  border-radius: var(--sk-p-radius-lg) var(--sk-p-radius-lg) var(--sk-p-radius-xs)
    var(--sk-p-radius-lg);
  background: var(--sk-surface-muted);
}

.message__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-p-space-2);
}

.message__content {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: var(--sk-p-size-text-mobile-body);
  line-height: 1.68;
  white-space: pre-wrap;
}

.message__header + .message__content {
  margin-top: var(--sk-p-space-2);
}
</style>
