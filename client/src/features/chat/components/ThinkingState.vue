<script setup lang="ts">
// Adapted from http://localhost:5173/beautiful-ui-vue/agent/components/thinking-state.vue.txt.
import { computed, ref, useId } from 'vue'
import type { ReasoningBlock } from '../../../types/chat'
const props = withDefaults(defineProps<{ blocks: ReasoningBlock[]; label?: string }>(), {
  label: '思考过程',
})
const expanded = ref(false)
const panelId = useId()
const working = computed(() => props.blocks.some((block) => block.status === 'streaming'))
const state = computed(() =>
  working.value
    ? '正在思考'
    : props.blocks.some((block) => block.status === 'failed')
      ? '思考中断'
      : props.blocks.some((block) => block.status === 'cancelled')
        ? '思考已停止'
        : '思考完成',
)
</script>
<template>
  <div v-if="blocks.length" class="thinking-state">
    <div class="thinking-header-wrap">
      <button
        type="button"
        class="thinking-header"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="thinking-star"
          aria-hidden="true"
        >
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span
          class="thinking-label"
          :class="working ? 'thinking-label--shimmer' : 'thinking-label--done'"
          >{{ label }} · {{ state }}</span
        >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          class="thinking-chevron"
          :class="{ 'thinking-chevron--open': expanded }"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
    <div
      :id="panelId"
      class="thinking-panel"
      :class="{ 'thinking-panel--open': expanded }"
      :inert="!expanded"
    >
      <div class="thinking-body">
        <div class="thinking-timeline">
          <ul class="thinking-list">
            <li
              v-for="block in blocks"
              :key="block.id"
              class="thinking-block"
              :data-status="block.status"
              :data-model-id="block.modelId"
            >
              <small class="thinking-row-meta">{{ block.modelId }}</small>
              <p class="thinking-row-text" aria-label="思考内容">{{ block.text }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thinking-state {
  display: flex;
  width: 100%;
  max-width: 380px;
  flex-direction: column;
}

.thinking-header-wrap {
  display: flex;
}

.thinking-header {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin-left: -6px;
  margin-right: -6px;
  padding: 4px 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 100ms ease;
}

.thinking-header:hover {
  background: var(--sk-surface-hover);
}

.thinking-star {
  flex-shrink: 0;
  transition: fill 300ms ease;
}

.thinking-label {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.thinking-label--shimmer {
  color: transparent;
  background-image: linear-gradient(
    90deg,
    var(--sk-label-tertiary) 35%,
    var(--sk-label-primary) 50%,
    var(--sk-label-tertiary) 65%
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  animation: shimmer-text 1.4s linear infinite;
}

.thinking-label--done {
  color: var(--sk-label-secondary);
  animation: fade-in 350ms ease-out both;
}

.thinking-chevron {
  flex-shrink: 0;
  transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
}

.thinking-chevron--open {
  transform: rotate(180deg);
}

.thinking-panel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 400ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 400ms cubic-bezier(0.23, 1, 0.32, 1);
}

.thinking-panel--open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.thinking-body {
  overflow: hidden;
}

.thinking-timeline {
  position: relative;
  margin-top: 4px;
  margin-left: 5px;
  padding-left: 16px;
}

.thinking-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
}

.thinking-row-text {
  font-size: 12px;
  color: var(--sk-label-secondary);
  line-height: 1.4;
}

.thinking-row-meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--sk-label-tertiary);
  white-space: nowrap;
}

@keyframes shimmer-text {
  0% {
    background-position: 150%;
  }
  100% {
    background-position: -50%;
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
  .thinking-label--shimmer {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  .thinking-panel,
  .thinking-panel--open {
    transition-duration: 0.01ms !important;
  }
}

.thinking-state {
  max-width: none;
  min-width: 0;
}
.thinking-header {
  min-height: 2.75rem;
  max-width: 100%;
  color: var(--sk-label-secondary);
}
.thinking-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.thinking-header:focus-visible {
  outline: 2px solid var(--sk-focus);
  outline-offset: 2px;
}
.thinking-block {
  min-width: 0;
  border-left: 1px solid var(--sk-separator);
  padding-left: var(--sk-p-space-3);
}
.thinking-row-text {
  margin: var(--sk-p-space-1) 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: var(--sk-p-size-text-sm);
}
.thinking-list {
  max-height: 24rem;
  overflow: auto;
}
</style>
