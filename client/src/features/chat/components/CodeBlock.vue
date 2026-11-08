<script setup lang="ts">
// Adapted from http://localhost:5173/beautiful-ui-vue/agent/components/code-block.vue.txt.
import { ref } from 'vue'
const props = withDefaults(defineProps<{ text: string; title?: string; label?: string }>(), {
  title: '执行输出',
  label: '工具输出',
})
const copied = ref(false)
async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>
<template>
  <div class="stream-code">
    <header class="stream-code__header">
      <span class="stream-code__meta"
        ><strong>{{ title }}</strong></span
      >
      <button
        type="button"
        :aria-label="copied ? '已复制' : `复制${title}`"
        :class="{ 'is-copied': copied }"
        @click="copyCode"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path v-if="copied" d="M20 6 9 17l-5-5" />
          <template v-else>
            <rect x="9" y="9" width="12" height="12" rx="2.5" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </template></svg
        >{{ copied ? '已复制' : '复制' }}
      </button>
    </header>
    <pre class="stream-code__body" :aria-label="label">{{ text }}</pre>
  </div>
</template>

<style scoped>
.stream-code {
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--sk-surface-default);
  box-shadow: var(--sk-shadow-overlay);
}
.stream-code__header {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--sk-separator);
}
.stream-code__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.stream-code__meta strong {
  color: var(--sk-label-primary);
  font-family: var(--sk-p-font-family-mono);
  font-size: 12px;
  font-weight: 500;
}
.stream-code__header button {
  display: flex;
  height: 24px;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sk-label-tertiary);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.1s,
    color 0.1s,
    transform 0.1s;
}
.stream-code__header button:hover {
  background: var(--sk-surface-hover);
  color: var(--sk-label-primary);
}
.stream-code__header button:active {
  transform: scale(0.96);
}
.stream-code__header button.is-copied {
  color: var(--sk-status-success);
}
.stream-code__header button svg {
  width: 10px;
  height: 10px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.stream-code__header button.is-copied svg {
  stroke-width: 3;
}
.stream-code__body {
  display: block;
  min-height: 137px;
  margin: 0;
  padding: 10px 12px;
  overflow: hidden;
  background: var(--sk-surface-muted);
  font-family: var(--sk-p-font-family-mono);
  font-size: 11.5px;
  line-height: 1.7;
}
.stream-code {
  max-width: none;
  min-width: 0;
  box-shadow: var(--sk-shadow-hairline);
}
.stream-code__header button {
  min-height: 2.75rem;
  min-width: 2.75rem;
}
.stream-code__header button:focus-visible {
  outline: 2px solid var(--sk-focus);
  outline-offset: 2px;
}
.stream-code__body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 18rem;
  overflow: auto;
  min-height: 0;
}
</style>
