<script setup lang="ts">
import { SkButton, SkIconButton } from '@skynet/design-system'
import { AlertTriangle, RotateCw, X } from 'lucide-vue-next'
import { useChatStore } from '../../../stores/chat'

const store = useChatStore()
</script>

<template>
  <aside v-if="store.errorMessage" class="notice" role="alert">
    <AlertTriangle :size="18" aria-hidden="true" />
    <span>{{ store.errorMessage }}</span>
    <SkButton
      v-if="store.retryAvailable"
      variant="secondary"
      size="small"
      :disabled="!store.canRetry"
      @click="store.retryLastMessage"
    >
      <template #leading><RotateCw :size="13" /></template>
      重试
    </SkButton>
    <SkButton
      v-else-if="store.connectionState !== 'connected'"
      variant="secondary"
      size="small"
      :loading="store.connectionState === 'connecting'"
      @click="store.connect"
    >
      重新连接
    </SkButton>
    <SkIconButton
      v-if="store.connectionState === 'connected'"
      class="notice__close"
      label="关闭提示"
      @click="store.dismissError"
    >
      <X :size="15" />
    </SkIconButton>
  </aside>
</template>

<style scoped>
.notice {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--sk-p-space-3);
  border-bottom: 1px solid var(--sk-separator);
  background: var(--sk-status-danger-soft);
  padding: var(--sk-p-space-2) var(--sk-p-space-4);
  color: var(--sk-status-danger);
  font-size: var(--sk-p-size-text-sm);
}

.notice span {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}

.notice__close {
  color: currentColor;
}
</style>
