<script setup lang="ts">
// Adapted from http://localhost:5173/beautiful-ui-vue/agent/components/sidebar-nav.vue.txt.
import { SkButton } from '@skynet/design-system'
import { MessageSquare, Plus } from 'lucide-vue-next'
import type { ChatSessionSummary } from '../../../types/chat'

withDefaults(
  defineProps<{
    embedded?: boolean
    sessions: ChatSessionSummary[]
    activeSessionId: string | null
    disabled: boolean
    error?: string
  }>(),
  { embedded: false, error: '' },
)
const emit = defineEmits<{ create: []; select: [sessionId: string] }>()

function formatUpdatedAt(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours} 小时前` : `${Math.floor(hours / 24)} 天前`
}
</script>

<template>
  <div class="sidebar-nav-card" :class="{ 'sidebar-nav-card--embedded': embedded }">
    <header class="sidebar-nav-card__workspace">
      <span class="sidebar-nav-card__mark" aria-hidden="true">S</span>
      <div class="sidebar-nav-card__workspace-copy">
        <h1>Skynet Agent</h1>
        <p>你的云端工作伙伴</p>
      </div>
    </header>
    <SkButton
      variant="secondary"
      class="sidebar-nav-card__new"
      :disabled="disabled"
      @click="emit('create')"
    >
      新建会话
      <template #trailing><Plus :size="16" aria-hidden="true" /></template>
    </SkButton>
    <p
      v-if="error"
      class="sidebar-nav-card__feedback sidebar-nav-card__feedback--error"
      role="alert"
    >
      {{ error }}
    </p>
    <nav class="sidebar-nav-card__nav" aria-label="会话列表">
      <p class="sidebar-nav-card__section-label">最近会话</p>
      <button
        v-for="session in sessions"
        :key="session.id"
        type="button"
        class="sidebar-nav-card__item"
        :class="{ 'is-active': activeSessionId === session.id }"
        :disabled="disabled"
        :aria-current="activeSessionId === session.id ? 'page' : undefined"
        @click="emit('select', session.id)"
      >
        <MessageSquare class="sidebar-nav-card__icon" :size="16" aria-hidden="true" />
        <span class="sidebar-nav-card__label"
          ><strong>{{ session.title }}</strong
          ><small>{{ formatUpdatedAt(session.updatedAt) }}</small></span
        >
      </button>
      <p v-if="!sessions.length" class="sidebar-nav-card__feedback">还没有会话</p>
    </nav>
    <footer class="sidebar-nav-card__footer">
      <span class="sidebar-nav-card__avatar" aria-hidden="true">SK</span
      ><span><strong>云端 Agent</strong><small>一起完成下一件事</small></span>
    </footer>
  </div>
</template>

<style scoped>
.sidebar-nav-card {
  display: flex;
  width: 15rem;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: var(--sk-p-space-3);
  box-sizing: border-box;
  padding: var(--sk-p-space-3);
  border-radius: var(--sk-p-radius-lg);
  background: var(--sk-surface-default);
  box-shadow: var(--sk-shadow-overlay);
}
.sidebar-nav-card--embedded {
  width: 100%;
  padding: max(var(--sk-p-space-4), env(safe-area-inset-top)) var(--sk-p-space-3)
    max(var(--sk-p-space-4), env(safe-area-inset-bottom));
  border-radius: 0;
  background: var(--sk-surface-sidebar);
  box-shadow: none;
}
.sidebar-nav-card__workspace {
  display: flex;
  min-height: 3rem;
  align-items: center;
  gap: var(--sk-p-space-3);
  padding: var(--sk-p-space-1);
}
.sidebar-nav-card__mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: var(--sk-p-radius-sm);
  background: var(--sk-label-primary);
  color: var(--sk-surface-default);
  font-weight: 600;
}
.sidebar-nav-card__workspace-copy {
  min-width: 0;
}
.sidebar-nav-card__workspace-copy h1 {
  margin: 0;
  font-size: var(--sk-p-size-text-body);
  font-weight: 600;
}
.sidebar-nav-card__workspace-copy p {
  margin: var(--sk-p-space-1) 0 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}
.sidebar-nav-card__new {
  width: 100%;
}
.sidebar-nav-card__new :deep(.button__label) {
  flex: 1;
  text-align: left;
}
.sidebar-nav-card__nav {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--sk-p-space-1);
  overflow-y: auto;
}
.sidebar-nav-card__section-label {
  margin: var(--sk-p-space-2) 0;
  padding-inline: var(--sk-p-space-2);
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}
.sidebar-nav-card__item {
  display: flex;
  width: 100%;
  min-height: var(--sk-c-sidebar-item-height);
  flex: none;
  align-items: center;
  gap: var(--sk-p-space-2);
  padding: var(--sk-p-space-2);
  border: 0;
  border-radius: var(--sk-c-sidebar-item-radius);
  background: transparent;
  color: var(--sk-label-secondary);
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--sk-p-duration-fast),
    color var(--sk-p-duration-fast);
}
.sidebar-nav-card__item:hover:enabled {
  background: var(--sk-surface-hover);
}
.sidebar-nav-card__item.is-active {
  background: var(--sk-surface-default);
  color: var(--sk-label-primary);
  box-shadow: var(--sk-shadow-hairline);
}
.sidebar-nav-card__icon {
  flex: none;
}
.sidebar-nav-card__label {
  display: grid;
  min-width: 0;
  gap: var(--sk-p-space-1);
}
.sidebar-nav-card__label strong {
  overflow: hidden;
  font-size: var(--sk-p-size-text-body);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-nav-card__label small,
.sidebar-nav-card__footer small {
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}
.sidebar-nav-card__feedback {
  margin: 0;
  padding: var(--sk-p-space-2);
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-sm);
  overflow-wrap: anywhere;
}
.sidebar-nav-card__feedback--error {
  color: var(--sk-status-danger);
}
.sidebar-nav-card__footer {
  display: flex;
  align-items: center;
  gap: var(--sk-p-space-2);
  padding: var(--sk-p-space-3) var(--sk-p-space-1) 0;
  border-top: 1px solid var(--sk-separator);
}
.sidebar-nav-card__footer > span:last-child {
  display: grid;
  gap: var(--sk-p-space-1);
}
.sidebar-nav-card__footer strong {
  font-size: var(--sk-p-size-text-sm);
  font-weight: 500;
}
.sidebar-nav-card__avatar {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: var(--sk-p-radius-full);
  background: var(--sk-surface-muted);
  color: var(--sk-label-primary);
  font-size: var(--sk-p-size-text-xs);
}
@media (pointer: coarse) {
  .sidebar-nav-card__item {
    min-height: var(--sk-p-size-control-touch);
  }
}
</style>
