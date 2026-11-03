<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    id?: string
    label: string
    type?: string
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    autocomplete?: string
  }>(),
  {
    id: undefined,
    type: 'text',
    placeholder: undefined,
    hint: undefined,
    error: undefined,
    disabled: false,
    autocomplete: 'off',
  },
)

const model = defineModel<string>({ default: '' })
const generatedId = useId()
const fieldId = props.id ?? `field-${generatedId}`
const descriptionId = `${fieldId}-description`
</script>

<template>
  <div class="field">
    <label class="field__label" :for="fieldId">{{ label }}</label>
    <input
      :id="fieldId"
      v-model="model"
      class="field__input"
      :class="{ 'field__input--error': error }"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error || hint ? descriptionId : undefined"
    />
    <p
      v-if="error || hint"
      :id="descriptionId"
      class="field__description"
      :class="{ 'field__description--error': error }"
      :role="error ? 'alert' : undefined"
    >
      {{ error || hint }}
    </p>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: var(--sk-p-space-2);
}

.field__label {
  color: var(--sk-label-primary);
  font-size: var(--sk-p-size-text-sm);
  font-weight: var(--sk-p-font-weight-medium);
}

.field__input {
  width: 100%;
  height: var(--sk-c-text-field-height);
  border: 1px solid var(--sk-border-default);
  border-radius: var(--sk-c-text-field-radius);
  background: var(--sk-c-text-field-background);
  padding-inline: var(--sk-c-text-field-padding-inline);
  color: var(--sk-label-primary);
  transition:
    border-color var(--sk-p-duration-fast) var(--sk-p-easing-standard),
    box-shadow var(--sk-p-duration-fast) var(--sk-p-easing-standard);
}

.field__input::placeholder {
  color: var(--sk-label-tertiary);
}

.field__input:hover:not(:disabled) {
  border-color: var(--sk-border-strong);
}

.field__input:focus-visible {
  border-color: var(--sk-focus);
  outline-offset: 2px;
}

.field__input:disabled {
  background: var(--sk-surface-muted);
  color: var(--sk-label-disabled);
}

.field__input--error,
.field__input--error:hover:not(:disabled) {
  border-color: var(--sk-status-danger);
}

.field__description {
  margin: 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}

.field__description--error {
  color: var(--sk-status-danger);
}

@media (pointer: coarse) {
  .field__input {
    min-height: var(--sk-p-size-control-touch);
    font-size: var(--sk-p-size-text-mobile-body);
  }
}
</style>
