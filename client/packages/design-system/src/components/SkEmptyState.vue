<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section class="empty-state">
    <div class="empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <h2 class="empty-state__title">{{ title }}</h2>
    <p class="empty-state__description">{{ description }}</p>
    <slot />
  </section>
</template>

<style scoped>
.empty-state {
  display: grid;
  max-width: 28rem;
  place-items: center;
  padding: var(--sk-p-space-8);
  text-align: center;
}

.empty-state__icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border-radius: var(--sk-p-radius-lg);
  background: var(--sk-surface-sidebar);
  box-shadow: var(--sk-shadow-hairline);
  color: var(--sk-label-secondary);
}

.empty-state__title {
  margin: var(--sk-p-space-4) 0 var(--sk-p-space-2);
  font-size: var(--sk-p-size-text-lg);
  line-height: var(--sk-p-size-line-title);
  font-weight: var(--sk-p-font-weight-semibold);
}

.empty-state__description {
  margin: 0 0 var(--sk-p-space-5);
  color: var(--sk-label-secondary);
}
</style>
