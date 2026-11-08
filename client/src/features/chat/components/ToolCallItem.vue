<script setup lang="ts">
import ToolChips from './ToolChips.vue'
import type { ToolCall } from '../../../types/chat'
defineProps<{ tool: ToolCall }>()
</script>

<template>
  <ToolChips :tools="[tool]" :grouped="false" />
</template>
