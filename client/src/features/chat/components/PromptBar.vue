<script setup lang="ts">
// Adapted from http://localhost:5173/beautiful-ui-vue/agent/components/prompt-bar.vue.txt.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { SkButton, SkIconButton } from '@skynet/design-system'
import { ArrowUp, Square } from 'lucide-vue-next'
import type { ModelOption } from '../../../types/chat'
export type PromptBarVariant = 'Rounded' | 'Pill'
const props = withDefaults(
  defineProps<{
    variant?: PromptBarVariant
    compact?: boolean
    multiline?: boolean
    disabled?: boolean
    canSend: boolean
    runState: 'idle' | 'running' | 'cancelling'
    models?: ModelOption[]
    modelId?: string
  }>(),
  {
    variant: 'Rounded',
    compact: false,
    multiline: false,
    disabled: false,
    models: () => [],
    modelId: '',
  },
)
const draft = defineModel<string>({ required: true })
const emit = defineEmits<{ send: [message: string]; stop: []; model: [id: string] }>()
const modelOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)
const modelTrigger = ref<HTMLButtonElement | null>(null)
const modelMenu = ref<HTMLElement | null>(null)
const currentModel = computed(() => props.models.find((model) => model.id === props.modelId))
function resizeTextarea() {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = `${textarea.value.scrollHeight}px`
}
async function focus() {
  await nextTick()
  textarea.value?.focus()
}
function send() {
  if (!props.disabled && props.canSend && draft.value.trim() && props.runState === 'idle')
    emit('send', draft.value)
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}
async function toggleModels() {
  modelOpen.value = !modelOpen.value
  if (modelOpen.value) {
    await nextTick()
    modelMenu.value?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
  }
}
function pick(id: string) {
  emit('model', id)
  modelOpen.value = false
  modelTrigger.value?.focus()
}
function menuKey(event: KeyboardEvent) {
  const buttons = [...(modelMenu.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    modelOpen.value = false
    modelTrigger.value?.focus()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    buttons[
      (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length
    ]?.focus()
  }
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) modelOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
watch(draft, resizeTextarea, { flush: 'post', immediate: true })
defineExpose({ focus })
</script>
<template>
  <div
    ref="root"
    class="prompt-bar"
    :class="{ 'prompt-bar--compact': compact, 'prompt-bar--multiline': multiline }"
  >
    <div class="prompt-bar__anchor">
      <div
        v-if="modelOpen"
        ref="modelMenu"
        class="prompt-bar__models"
        role="listbox"
        aria-label="选择会话模型"
        @keydown="menuKey"
      >
        <button
          v-for="model in models"
          :key="model.id"
          type="button"
          role="option"
          :aria-selected="model.id === modelId"
          :class="{ active: model.id === modelId }"
          @click="pick(model.id)"
        >
          <strong>{{ model.name }}</strong
          ><span v-if="model.id === modelId" aria-hidden="true">✓</span>
        </button>
      </div>
      <div
        class="prompt-bar__composer"
        :class="{ 'prompt-bar__composer--pill': variant === 'Pill' }"
      >
        <div class="prompt-bar__controls">
          <textarea
            ref="textarea"
            v-model="draft"
            :rows="multiline ? 2 : 1"
            :disabled="disabled"
            :placeholder="disabled ? '连接 Agent 后即可发送' : '给 Agent 发送消息…'"
            aria-label="给 Agent 发送消息"
            @input="resizeTextarea"
            @keydown="onKeydown"
          />
          <button
            v-if="models.length"
            ref="modelTrigger"
            type="button"
            class="prompt-bar__model"
            :disabled="disabled"
            :aria-label="`切换会话模型：${currentModel?.name ?? modelId}`"
            aria-haspopup="listbox"
            :aria-expanded="modelOpen"
            @click="toggleModels"
          >
            <span>{{ currentModel?.name ?? modelId }}</span
            ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <span v-else class="prompt-bar__caption">云端 Agent</span>
          <SkButton
            v-if="runState !== 'idle'"
            class="prompt-bar__action"
            :disabled="disabled || runState === 'cancelling'"
            @click="emit('stop')"
            ><template #leading
              ><Square :size="12" fill="currentColor" aria-hidden="true" /></template
            >{{ runState === 'cancelling' ? '正在停止' : '停止' }}</SkButton
          >
          <SkIconButton
            v-else
            class="prompt-bar__action"
            variant="primary"
            :disabled="disabled || !canSend || !draft.trim()"
            label="发送消息"
            @click="send"
            ><ArrowUp :size="18" aria-hidden="true"
          /></SkIconButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-bar {
  display: flex;
  min-height: 384px;
  width: 100%;
  max-width: 420px;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 32px;
}
.prompt-bar--compact {
  min-height: 0;
  max-width: none;
  padding-bottom: 0;
}
.prompt-bar--multiline .prompt-bar__controls {
  grid-template-areas: 'input input input input input' 'add spacer model dictation send';
  grid-template-rows: auto 28px;
  align-items: center;
  row-gap: 4px;
}
.prompt-bar--multiline .prompt-bar__controls textarea {
  grid-area: input;
  min-height: 64px;
}
.prompt-bar--multiline .prompt-bar__icon--add {
  grid-area: add;
}
.prompt-bar--multiline .prompt-bar__model {
  grid-area: model;
}
.prompt-bar--multiline .prompt-bar__icon--dictation {
  grid-area: dictation;
}
.prompt-bar--multiline .prompt-bar__send {
  grid-area: send;
}
.prompt-bar__anchor {
  position: relative;
}
.prompt-bar__composer {
  position: relative;
  overflow: hidden;
  padding: 6px;
  border: 1px solid var(--sk-separator);
  border-radius: 14px;
  background: var(--sk-surface-default);
  box-shadow: var(--sk-shadow-hairline);
  transition:
    border-color 0.15s,
    border-radius 0.2s;
}
.prompt-bar__composer--pill {
  border-radius: 999px;
}
.prompt-bar__composer:focus-within {
  border-color: var(--sk-border-default);
}
.prompt-bar__composer--rainbow::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 70, 70, 0.16),
    rgba(255, 170, 40, 0.16),
    rgba(45, 190, 130, 0.16),
    rgba(70, 130, 255, 0.16),
    transparent
  );
  animation: prompt-sweep 1.1s ease-out both;
}
.prompt-bar__controls {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto 28px 28px;
  align-items: end;
  gap: 4px;
}
.prompt-bar__controls textarea {
  min-width: 0;
  width: 100%;
  min-height: 28px;
  max-height: 100px;
  resize: none;
  padding: 5px 4px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sk-label-primary);
  font: 13px/18px inherit;
}
.prompt-bar__controls textarea::placeholder {
  color: var(--sk-label-tertiary);
}
.prompt-bar__icon,
.prompt-bar__send,
.prompt-bar__model {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--sk-label-tertiary);
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.15s;
}
.prompt-bar__composer--pill :is(.prompt-bar__icon, .prompt-bar__send, .prompt-bar__model) {
  border-radius: 999px;
}
.prompt-bar__icon {
  width: 28px;
  font-size: 18px;
}
.prompt-bar__icon svg,
.prompt-bar__send svg {
  width: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.prompt-bar__icon:hover,
.prompt-bar__icon.active,
.prompt-bar__model:hover {
  background: var(--sk-surface-hover);
  color: var(--sk-label-primary);
}
.prompt-bar__icon:active,
.prompt-bar__send:enabled:active {
  transform: scale(0.94);
}
.prompt-bar__model {
  gap: 4px;
  padding: 0 6px;
  color: var(--sk-label-secondary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.prompt-bar__model span {
  color: var(--sk-label-tertiary);
}
.prompt-bar__send {
  width: 28px;
  background: var(--sk-label-primary);
  color: var(--sk-surface-default);
}
.prompt-bar__send:disabled {
  background: var(--sk-border-default);
  color: var(--sk-label-secondary);
  cursor: default;
}
.prompt-bar__model {
  line-height: 1;
}
.prompt-bar__model span {
  display: block;
  color: inherit;
  line-height: 1;
}
.prompt-bar__model svg {
  display: block;
  width: 11px;
  height: 11px;
  flex: 0 0 auto;
  fill: none;
  stroke: var(--sk-label-tertiary);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.prompt-bar__menu,
.prompt-bar__models {
  position: absolute;
  bottom: calc(100% + 8px);
  z-index: 10;
  padding: 4px;
  border-radius: 10px;
  background: var(--sk-surface-default);
  box-shadow: var(--sk-shadow-overlay, 0 12px 30px rgba(20, 26, 40, 0.14));
  animation: prompt-pop 0.18s cubic-bezier(0.23, 1, 0.32, 1) both;
  transform-origin: bottom center;
}
.prompt-bar__menu {
  inset-inline: 0;
}
.prompt-bar__models {
  right: 0;
  width: 176px;
  transform-origin: bottom right;
}
.prompt-bar__menu > button {
  display: flex;
  width: 100%;
  height: 36px;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sk-label-primary);
  text-align: left;
  cursor: pointer;
}
.prompt-bar__menu > button.active {
  background: var(--sk-surface-hover);
}
.prompt-bar__menu strong,
.prompt-bar__models strong {
  flex: 0 0 auto;
  font-size: 12.5px;
  font-weight: 500;
}
.prompt-bar__menu small {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--sk-label-tertiary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prompt-bar__menu em {
  color: var(--sk-accent-default);
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}
.prompt-bar__menu em:first-letter {
  color: inherit;
}
.prompt-bar__mark {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  color: var(--sk-label-secondary);
  font-size: 12px;
}
.prompt-bar__menu footer {
  margin-top: 4px;
  padding: 6px 8px 4px;
  border-top: 1px solid var(--sk-separator);
  color: var(--sk-label-tertiary);
  font-size: 11px;
}
.prompt-bar__no-results {
  height: 36px;
  padding: 10px 8px;
  color: var(--sk-label-tertiary);
  font-size: 12px;
}
.prompt-bar__models button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sk-label-primary);
  text-align: left;
  cursor: pointer;
}
.prompt-bar__models button:hover,
.prompt-bar__models button.active {
  background: var(--sk-surface-hover);
}
.prompt-bar__models small {
  flex: 1;
  color: var(--sk-label-tertiary);
  font-size: 11px;
}
.prompt-bar__models span {
  font-size: 12px;
}
.prompt-bar__files {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 2px 2px 7px;
}
.prompt-bar__files > span {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  border-radius: 6px;
  background: var(--sk-surface-muted);
  color: var(--sk-label-secondary);
  font-size: 11.5px;
  box-shadow: var(--sk-shadow-hairline);
}
.prompt-bar__files button {
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--sk-label-tertiary);
  cursor: pointer;
}
.prompt-bar__eq {
  display: flex;
  height: 14px;
  align-items: center;
  gap: 2.5px;
}
.prompt-bar__eq i {
  width: 2.5px;
  height: 100%;
  border-radius: 999px;
  background: currentColor;
  animation: prompt-eq 0.9s ease-in-out infinite;
}
@keyframes prompt-pop {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes prompt-eq {
  0%,
  100% {
    height: 45%;
  }
  50% {
    height: 100%;
  }
}
@keyframes prompt-sweep {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .prompt-bar__menu,
  .prompt-bar__models,
  .prompt-bar__eq i,
  .prompt-bar__composer--rainbow::before {
    animation-duration: 0.01ms;
  }
}

.prompt-bar__controls,
.prompt-bar--multiline .prompt-bar__controls {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'input input' 'model send';
  grid-template-rows: auto auto;
  row-gap: 4px;
  align-items: center;
}
.prompt-bar__controls textarea,
.prompt-bar--multiline .prompt-bar__controls textarea {
  grid-area: input;
  max-height: var(--sk-c-composer-max-height);
  font-size: var(--sk-p-size-text-mobile-body);
  line-height: 1.55;
  min-height: 2rem;
}
.prompt-bar--multiline .prompt-bar__controls textarea {
  min-height: var(--sk-c-composer-min-height);
}
.prompt-bar__model,
.prompt-bar__caption {
  grid-area: model;
  justify-self: start;
}
.prompt-bar__action {
  grid-area: send;
  justify-self: end;
}
.prompt-bar__model,
.prompt-bar__models button {
  min-height: 2.75rem;
}
.prompt-bar__models {
  max-width: 100%;
  min-width: 12rem;
  width: max-content;
  max-height: 18rem;
  overflow: auto;
}
.prompt-bar__models button {
  justify-content: space-between;
  gap: var(--sk-p-space-4);
}
.prompt-bar__model:focus-visible,
.prompt-bar__models button:focus-visible {
  outline: 2px solid var(--sk-focus);
  outline-offset: 2px;
}
.prompt-bar__caption {
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}
@media (max-height: 480px) {
  .prompt-bar--multiline .prompt-bar__controls textarea {
    min-height: 2rem;
    max-height: 4rem;
  }
}
</style>
