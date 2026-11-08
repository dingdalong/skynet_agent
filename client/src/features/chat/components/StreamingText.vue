<script setup lang="ts">
// Adapted from http://localhost:5173/beautiful-ui-vue/agent/components/streaming-text.vue.txt.
import { ref, watch } from 'vue'
import type { MessageStatus } from '../../../types/chat'
const props = withDefaults(defineProps<{ text: string; status?: MessageStatus }>(), {
  status: 'complete',
})
const chunks = ref<string[]>([])
const copied = ref(false)
watch(
  () => props.text,
  (text, previous) => {
    if (previous && text.startsWith(previous)) chunks.value.push(text.slice(previous.length))
    else chunks.value = [text]
  },
  { immediate: true },
)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>
<template>
  <div class="streaming-text">
    <p class="streaming-body message__content">
      <span v-for="(chunk, index) in chunks" :key="index" class="streaming-word">{{ chunk }}</span
      ><span v-if="status === 'streaming'" class="streaming-caret" aria-hidden="true" />
    </p>
    <div
      class="streaming-actions"
      :class="{ 'streaming-actions--visible': status !== 'streaming' }"
    >
      <button
        type="button"
        :aria-label="copied ? '已复制回答' : '复制回答'"
        class="streaming-action-btn"
        @click="copy"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="12" height="12" rx="2.5" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.streaming-text {
  min-height: 15.5rem;
  width: 100%;
  max-width: 380px;
}

.streaming-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--sk-label-primary);
}

.streaming-word {
  display: inline;
  will-change: filter, opacity;
  animation: stream-in 420ms cubic-bezier(0.22, 0.61, 0.25, 1) both;
}

.streaming-caret {
  display: inline-block;
  width: 2px;
  height: 12px;
  margin-left: 2px;
  border-radius: 999px;
  background: var(--sk-label-primary);
  vertical-align: middle;
  transform: translateY(2px);
  animation: fade-in 150ms ease-out both;
}

.streaming-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 400ms ease;
}

.streaming-actions--visible {
  opacity: 1;
  pointer-events: auto;
}

.streaming-action-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sk-label-tertiary);
  cursor: pointer;
  transition:
    background-color 100ms ease,
    color 100ms ease;
}

.streaming-action-btn:hover {
  background: var(--sk-surface-hover);
  color: var(--sk-label-secondary);
}

@keyframes stream-in {
  from {
    opacity: 0;
    filter: blur(6px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .streaming-word,
  .streaming-caret {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

.streaming-text {
  min-height: 0;
  max-width: none;
  min-width: 0;
}
.streaming-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: var(--sk-p-size-text-mobile-body);
}
.streaming-action-btn {
  min-width: 2.75rem;
  min-height: 2.75rem;
}
.streaming-action-btn:focus-visible {
  outline: 2px solid var(--sk-focus);
  outline-offset: 2px;
}
</style>
