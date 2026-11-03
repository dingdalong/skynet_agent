<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    size?: number
    label?: string
  }>(),
  {
    size: 16,
    label: '正在加载',
  },
)
</script>

<template>
  <LoaderCircle
    class="spinner"
    :size="size"
    :stroke-width="1.8"
    aria-hidden="true"
    focusable="false"
  />
  <span class="sk-sr-only">{{ label }}</span>
</template>

<style scoped>
.spinner {
  flex: none;
  animation: spin var(--sk-p-duration-spin) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
