<script setup lang="ts">
// Adapted from http://localhost:5173/beautiful-ui-vue/agent/components/tool-chips.vue.txt.
import { ref } from 'vue'
import { SkStatusBadge } from '@skynet/design-system'
import ThinkingState from './ThinkingState.vue'
import CodeBlock from './CodeBlock.vue'
import type { ToolCall } from '../../../types/chat'
withDefaults(defineProps<{ tools: ToolCall[]; grouped?: boolean }>(), { grouped: true })
const open = ref(true)
const stateLabels = {
  judging: '正在判断权限',
  running: '正在执行',
  denied: '已阻止',
  completed: '已完成',
  failed: '执行失败',
  cancelled: '已停止',
}
function label(tool: ToolCall) {
  return (
    (
      { exec_command: 'Bash', write_stdin: '终端交互', apply_patch: '文件修改' } as Record<
        string,
        string
      >
    )[tool.name] ?? tool.name
  )
}
function input(tool: ToolCall) {
  try {
    const args = JSON.parse(tool.arguments)
    return String(args.cmd ?? args.patch ?? args.chars ?? '读取执行输出')
  } catch {
    return tool.arguments
  }
}
function status(tool: ToolCall) {
  return tool.status === 'completed'
    ? 'success'
    : tool.status === 'failed'
      ? 'danger'
      : tool.status === 'denied' || tool.status === 'cancelled'
        ? 'warning'
        : 'running'
}
</script>
<template>
  <div v-if="tools.length" class="tool-chips">
    <button
      v-if="grouped"
      type="button"
      class="run-toggle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg
        class="run-toggle__chevron"
        :class="{ 'run-toggle__chevron--closed': !open }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      <span>{{ tools.length }} 次工具调用</span>
    </button>
    <div
      class="run-panel"
      :class="{ 'run-panel--open': open || !grouped }"
      :inert="!open && grouped"
    >
      <div class="run-panel__clip">
        <div class="tool-list">
          <details
            v-for="tool in tools"
            :key="tool.id"
            class="tool-call tool-row"
            :aria-label="`${label(tool)}工具调用`"
            :open="tool.status === 'denied' || tool.status === 'failed'"
          >
            <summary class="tool-call__summary tool-row__button">
              <span class="tool-row__icon-wrap" aria-hidden="true"
                ><svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M4 17l6-5-6-5M12 19h8" /></svg
              ></span>
              <span class="tool-call__label tool-row__label">{{ label(tool) }}</span>
              <span class="tool-row__chip tool-row__chip--mono">{{
                input(tool).split('\n')[0]
              }}</span>
              <SkStatusBadge :status="status(tool)" :label="stateLabels[tool.status]" />
            </summary>
            <div class="tool-call__body detail-lines">
              <div class="tool-call__scope">
                <span>{{
                  tool.permissionMode === 'require_escalated' ? '沙盒外执行' : '会话沙盒'
                }}</span
                ><span v-if="tool.exitCode !== undefined">退出码 {{ tool.exitCode }}</span>
              </div>
              <p v-if="tool.workingDirectory" class="tool-call__path">
                {{ tool.workingDirectory }}
              </p>
              <ThinkingState :blocks="tool.reasoning ?? []" label="权限思考" />
              <CodeBlock :text="input(tool)" title="调用内容" label="调用内容" />
              <p v-if="tool.permissionReason" class="tool-call__reason">
                {{ tool.permissionReason }}
              </p>
              <CodeBlock v-if="tool.output" :text="tool.output" title="执行输出" label="工具输出" />
              <p v-if="tool.truncated" class="tool-call__reason">输出较长，已截断展示。</p>
              <ul v-if="tool.changedFiles.length" aria-label="改动文件">
                <li v-for="file in tool.changedFiles" :key="file">{{ file }}</li>
              </ul>
              <p v-if="tool.error" class="tool-call__error">{{ tool.error }}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-chips {
  width: 100%;
  max-width: 320px;
  min-height: 220px;
  padding-bottom: 4px;
}

.run-toggle {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  margin-inline: -6px;
  padding: 4px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--sk-label-secondary);
  font-size: 12.5px;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background-color 100ms ease;
}

.run-toggle:hover {
  background: var(--sk-surface-hover);
}

.run-toggle__chevron {
  flex-shrink: 0;
  transition: transform 200ms ease;
}

.run-toggle__chevron--closed {
  transform: rotate(-90deg);
}

.run-panel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 300ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}

.run-panel--open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.run-panel__clip {
  min-height: 0;
  margin-inline: -4px;
  padding: 0 6px 4px;
  overflow: hidden;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.tool-row {
  animation: tool-row-in 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.tool-row__button {
  display: flex;
  width: calc(100% + 6px);
  min-width: 0;
  height: 28px;
  align-items: center;
  gap: 8px;
  margin-inline: -3px;
  padding-inline: 3px;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 100ms ease;
}

.tool-row__button:hover {
  background: var(--sk-surface-hover);
}

.tool-row__icon-wrap {
  position: relative;
  display: flex;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: var(--sk-label-tertiary);
}

.tool-row__label {
  flex-shrink: 0;
  color: var(--sk-label-primary);
  font-size: 12.5px;
  font-weight: 500;
}

.tool-row__chip {
  display: inline-flex;
  min-width: 0;
  height: 22px;
  flex: 1;
  align-items: center;
  padding-inline: 6px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--sk-surface-hover);
  box-shadow: var(--sk-shadow-hairline);
  color: var(--sk-label-secondary);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 100ms ease;
}

.tool-row__chip:hover {
  background: var(--sk-border-default);
}

.tool-row__chip--mono {
  font-family: var(--sk-p-font-family-mono);
}

:global([data-theme='dark']) .tool-row__chip {
  background: var(--sk-surface-muted);
  color: var(--sk-label-secondary);
}

:global([data-theme='dark']) .tool-row__chip:hover {
  background: var(--sk-surface-hover);
}

.detail-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 2px 0 4px 8px;
  padding: 2px 0 2px 14px;
  border-left: 1px solid var(--sk-separator);
}

@keyframes tool-row-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .run-panel,
  .tool-row {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

.tool-chips {
  max-width: none;
  min-height: 0;
  min-width: 0;
}
.run-toggle {
  min-height: 2.75rem;
}
.tool-row__button {
  height: auto;
  min-height: 2.75rem;
  list-style: none;
}
.tool-row__button::-webkit-details-marker {
  display: none;
}
.tool-call {
  min-width: 0;
}
.tool-call__body {
  gap: var(--sk-p-space-2);
  padding-block: var(--sk-p-space-2);
}
.tool-call__scope {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sk-p-space-2);
}
.tool-call__path,
.tool-call__reason,
.tool-call__scope,
.tool-call ul {
  margin: 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
  overflow-wrap: anywhere;
}
.tool-call__error {
  color: var(--sk-status-danger);
  overflow-wrap: anywhere;
}
.run-toggle:focus-visible,
.tool-row__button:focus-visible {
  outline: 2px solid var(--sk-focus);
  outline-offset: 2px;
}
</style>
