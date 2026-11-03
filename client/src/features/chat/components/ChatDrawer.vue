<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  VisuallyHidden,
} from 'reka-ui'
import { SkIconButton } from '@skynet/design-system'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  title: string
  side: 'left' | 'right'
  trigger: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function restoreFocus(event: Event) {
  event.preventDefault()
  const target =
    props.trigger?.isConnected && props.trigger.getClientRects().length
      ? props.trigger
      : document.querySelector<HTMLElement>('main h2')
  target?.focus({ preventScroll: true })
}
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="drawer-overlay" />
      <DialogContent
        class="drawer-content"
        :class="`drawer-content--${side}`"
        :aria-describedby="undefined"
        @close-auto-focus="restoreFocus"
      >
        <VisuallyHidden>
          <DialogTitle>{{ title }}</DialogTitle>
        </VisuallyHidden>
        <DialogClose as-child>
          <SkIconButton class="drawer-close" :label="`关闭${title}`"><X :size="18" /></SkIconButton>
        </DialogClose>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  z-index: var(--sk-p-z-overlay);
  inset: 0;
  background: var(--sk-surface-scrim);
  animation: fade-in var(--sk-p-duration-fast) var(--sk-p-easing-standard);
}

.drawer-content {
  position: fixed;
  z-index: var(--sk-p-z-modal);
  top: max(var(--sk-p-space-2), env(safe-area-inset-top));
  bottom: max(var(--sk-p-space-2), env(safe-area-inset-bottom));
  border-radius: var(--sk-c-card-radius);
  box-shadow: var(--sk-shadow-overlay);
  overflow: hidden;
  max-width: 88vw;
  background: var(--sk-surface-default);
  animation: slide-in var(--sk-p-duration-normal) var(--sk-p-easing-standard);
}

.drawer-content--left {
  left: max(var(--sk-p-space-2), env(safe-area-inset-left));
  width: var(--sk-c-sidebar-width);
  --drawer-offset: -12px;
}

.drawer-content--right {
  right: max(var(--sk-p-space-2), env(safe-area-inset-right));
  width: var(--sk-p-size-layout-context);
  --drawer-offset: 12px;
}

.drawer-close {
  position: absolute;
  z-index: 1;
  top: max(var(--sk-p-space-4), env(safe-area-inset-top));
  right: var(--sk-p-space-4);
}

.drawer-content :deep(> *) {
  max-height: 100%;
}

.drawer-overlay[data-state='closed'] {
  animation: fade-out var(--sk-p-duration-exit) var(--sk-p-easing-exit);
}

.drawer-content[data-state='closed'] {
  animation: slide-out var(--sk-p-duration-exit) var(--sk-p-easing-exit);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes slide-in {
  from {
    transform: translateX(var(--drawer-offset));
    opacity: 0;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}

@keyframes slide-out {
  to {
    transform: translateX(var(--drawer-offset));
    opacity: 0;
  }
}
</style>
