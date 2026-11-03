<script setup lang="ts">
import { AlertTriangle, Check, Circle, LoaderCircle, X } from 'lucide-vue-next'
import { computed } from 'vue'

type Status = 'idle' | 'running' | 'success' | 'warning' | 'danger'

const props = defineProps<{
  status: Status
  label: string
}>()

const icon = computed(() => {
  switch (props.status) {
    case 'running':
      return LoaderCircle
    case 'success':
      return Check
    case 'warning':
      return AlertTriangle
    case 'danger':
      return X
    default:
      return Circle
  }
})
</script>

<template>
  <span class="badge" :class="`badge--${status}`" role="status">
    <component
      :is="icon"
      :class="{ 'badge__icon--running': status === 'running' }"
      :size="13"
      :stroke-width="1.8"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sk-p-space-1);
  width: fit-content;
  min-height: var(--sk-c-badge-height);
  border-radius: var(--sk-c-badge-radius);
  padding: var(--sk-p-space-1) var(--sk-c-badge-padding-inline);
  background: var(--sk-surface-muted);
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
  font-weight: var(--sk-p-font-weight-medium);
  line-height: 1.2;
}

.badge--running {
  background: var(--sk-surface-muted);
  color: var(--sk-status-running);
}

.badge--success {
  background: var(--sk-status-success-soft);
  color: var(--sk-status-success);
}

.badge--warning {
  background: var(--sk-status-warning-soft);
  color: var(--sk-status-warning);
}

.badge--danger {
  background: var(--sk-status-danger-soft);
  color: var(--sk-status-danger);
}

.badge__icon--running {
  animation: spin var(--sk-p-duration-spin) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge__icon--running {
    animation: none;
  }
}
</style>
