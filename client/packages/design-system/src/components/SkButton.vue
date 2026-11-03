<script setup lang="ts">
import SkSpinner from './SkSpinner.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'small' | 'medium' | 'large'
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'medium',
    type: 'button',
    loading: false,
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :class="['button', `button--${variant}`, `button--${size}`]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <SkSpinner v-if="loading" :size="16" label="正在处理" />
    <slot v-else name="leading" />
    <span class="button__label"><slot /></span>
    <slot name="trailing" />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sk-p-space-2);
  min-width: var(--sk-c-button-height);
  border: 1px solid transparent;
  border-radius: var(--sk-c-button-radius);
  padding-inline: var(--sk-c-button-padding-inline);
  font-weight: var(--sk-c-button-font-weight);
  line-height: 1;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    background-color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    border-color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    transform var(--sk-p-duration-instant) var(--sk-p-easing-standard);
}

.button:active:not(:disabled) {
  transform: scale(0.98);
}

.button--primary {
  background: var(--sk-c-button-background);
  color: var(--sk-c-button-foreground);
  box-shadow: var(--sk-c-button-shadow);
}

.button--primary:hover:not(:disabled) {
  background: var(--sk-c-button-background-hover);
}

.button--primary:active:not(:disabled) {
  background: var(--sk-c-button-background-active);
}

.button--primary:disabled {
  background: var(--sk-action-disabled);
  color: var(--sk-action-on-disabled);
  box-shadow: var(--sk-shadow-hairline);
}

.button--secondary {
  box-shadow: var(--sk-c-button-shadow);
  background: var(--sk-surface-raised);
  color: var(--sk-label-primary);
}

.button--secondary:hover:not(:disabled) {
  background: var(--sk-surface-hover);
}

.button--ghost {
  background: transparent;
  color: var(--sk-label-secondary);
}

.button--ghost:hover:not(:disabled) {
  background: var(--sk-surface-hover);
  color: var(--sk-label-primary);
}

.button--danger {
  background: var(--sk-status-danger);
  color: var(--sk-status-on-danger);
}

.button--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--sk-status-danger) 90%, var(--sk-action-primary));
}

.button--small {
  height: var(--sk-c-button-height-small);
  min-width: var(--sk-c-button-height-small);
  padding-inline: var(--sk-p-space-3);
  font-size: var(--sk-p-size-text-sm);
}

.button--medium {
  height: var(--sk-c-button-height);
  font-size: var(--sk-p-size-text-sm);
}

.button--large {
  height: var(--sk-c-button-height-large);
  min-width: var(--sk-p-size-control-touch);
  padding-inline: var(--sk-p-space-5);
  font-size: var(--sk-p-size-text-body);
}

.button__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .button {
    min-width: var(--sk-p-size-control-touch);
    min-height: var(--sk-p-size-control-touch);
  }
}
</style>
