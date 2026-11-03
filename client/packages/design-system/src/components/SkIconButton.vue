<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    type?: 'button' | 'submit' | 'reset'
    variant?: 'quiet' | 'bordered' | 'primary'
    disabled?: boolean
    pressed?: boolean
  }>(),
  {
    type: 'button',
    variant: 'quiet',
    disabled: false,
    pressed: undefined,
  },
)
</script>

<template>
  <button
    :type="type"
    :class="['icon-button', `icon-button--${variant}`]"
    :aria-label="label"
    :aria-pressed="pressed"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-grid;
  width: var(--sk-p-size-control-md);
  height: var(--sk-p-size-control-md);
  flex: none;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--sk-p-radius-sm);
  background: transparent;
  color: var(--sk-label-secondary);
  cursor: pointer;
  transition:
    background-color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    border-color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    transform var(--sk-p-duration-instant) var(--sk-p-easing-standard);
}

.icon-button:hover:not(:disabled) {
  background: var(--sk-surface-hover);
  color: var(--sk-label-primary);
}

.icon-button:active:not(:disabled) {
  transform: scale(0.94);
}

.icon-button--bordered {
  box-shadow: var(--sk-c-button-shadow);
  background: var(--sk-surface-raised);
}

.icon-button[aria-pressed='true'] {
  background: var(--sk-surface-muted);
  color: var(--sk-label-primary);
}

.icon-button--primary {
  background: var(--sk-c-button-background);
  color: var(--sk-c-button-foreground);
  box-shadow: var(--sk-c-button-shadow);
}

.icon-button--primary:hover:not(:disabled) {
  background: var(--sk-c-button-background-hover);
  color: var(--sk-c-button-foreground);
}

.icon-button--primary:active:not(:disabled) {
  background: var(--sk-c-button-background-active);
}

.icon-button--primary:disabled {
  background: var(--sk-action-disabled);
  color: var(--sk-action-on-disabled);
  box-shadow: var(--sk-shadow-hairline);
}

@media (pointer: coarse) {
  .icon-button {
    width: var(--sk-p-size-control-touch);
    height: var(--sk-p-size-control-touch);
  }
}
</style>
