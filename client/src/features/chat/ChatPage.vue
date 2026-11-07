<script setup lang="ts">
// Adapted from Beautiful UI Vue: /agent/components/chat-page.vue.txt.
import { SkButton, SkEmptyState, SkIconButton } from '@skynet/design-system'
import { ArrowDown, Menu, PanelRight, Plus, Sparkles, SunMoon, UserRound } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getPlatformCapabilities } from '../../platform/capabilities'
import { useChatStore } from '../../stores/chat'
import { useTheme } from '../../composables/useTheme'
import ChatDrawer from './components/ChatDrawer.vue'
import ConnectionNotice from './components/ConnectionNotice.vue'
import ContextPanel from './components/ContextPanel.vue'
import MessageItem from './components/MessageItem.vue'
import PromptBar from './components/PromptBar.vue'
import SidebarNav from './components/SidebarNav.vue'

const store = useChatStore()
const platform = getPlatformCapabilities()
const { theme: themePreference, toggleTheme } = useTheme()
const sidebarOpen = ref(false)
const contextOpen = ref(false)
const sidebarTrigger = ref<HTMLElement | null>(null)
const contextTrigger = ref<HTMLElement | null>(null)
const mediaQuery = window.matchMedia('(max-width: 1199px)')
const usesDrawers = ref(platform.layout === 'mobile' || mediaQuery.matches)
const viewportHeight = ref<string>()
const messageStream = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)
const announcement = ref('')
const promptBar = ref<InstanceType<typeof PromptBar> | null>(null)

const title = computed(() => store.activeSession?.title || '新的会话')
const subtitle = computed(() => {
  if (store.connectionState === 'connecting') return '正在连接云端 Agent'
  if (store.connectionState === 'connected')
    return store.runState !== 'idle' ? '云端 Agent 正在生成' : '云端 Agent · 随时开始对话'
  return '连接已断开'
})

function openSessions(trigger: HTMLElement) {
  sidebarTrigger.value = trigger
  sidebarOpen.value = true
}

function openContext(trigger: HTMLElement) {
  contextTrigger.value = trigger
  contextOpen.value = true
}

function updateViewport() {
  usesDrawers.value = platform.layout === 'mobile' || mediaQuery.matches
  if (!usesDrawers.value) {
    sidebarOpen.value = false
    contextOpen.value = false
  }
  // 移动浏览器的键盘可能只收缩 visual viewport，布局视口仍保持原高度。
  if (platform.layout === 'mobile' && window.visualViewport)
    viewportHeight.value = `${window.visualViewport.height}px`
}

async function createSession() {
  if (await store.createSession()) sidebarOpen.value = false
}

async function selectSession(sessionId: string) {
  if (await store.selectSession(sessionId)) sidebarOpen.value = false
}

function sendMessage(text: string) {
  if (store.sendMessage(text)) promptBar.value?.focus()
}

function updateStickiness() {
  const element = messageStream.value
  if (element)
    stickToBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight < 80
}

function scrollToBottom() {
  stickToBottom.value = true
  if (messageStream.value) messageStream.value.scrollTop = messageStream.value.scrollHeight
}

function onKeydown(event: KeyboardEvent) {
  if (
    event.key !== 'Escape' ||
    event.isComposing ||
    event.defaultPrevented ||
    sidebarOpen.value ||
    contextOpen.value ||
    store.runState !== 'running'
  )
    return
  event.preventDefault()
  void store.cancelRun()
}

watch(() => store.activeSessionId, scrollToBottom, { flush: 'post' })
watch(
  () => [store.messages.length, store.messages.at(-1)?.content, store.messages.at(-1)?.status],
  () => {
    if (stickToBottom.value) scrollToBottom()
  },
  { flush: 'post' },
)
watch(
  () => store.runState,
  (state, previous) => {
    if (state === 'running') announcement.value = 'Agent 正在生成回答'
    else if (state === 'cancelling') announcement.value = '正在停止生成'
    else if (previous !== 'idle') {
      const status = store.messages.at(-1)?.status
      announcement.value =
        status === 'complete' ? '回答已完成' : status === 'cancelled' ? '生成已停止' : '生成失败'
    }
  },
)

onMounted(() => {
  updateViewport()
  mediaQuery.addEventListener('change', updateViewport)
  window.visualViewport?.addEventListener('resize', updateViewport)
  document.addEventListener('keydown', onKeydown, true)
})
onBeforeUnmount(() => {
  mediaQuery.removeEventListener('change', updateViewport)
  window.visualViewport?.removeEventListener('resize', updateViewport)
  document.removeEventListener('keydown', onKeydown, true)
})
</script>

<template>
  <div
    class="chat-product"
    :class="{ 'chat-product--compact': usesDrawers }"
    :data-platform="platform.kind"
    :data-layout="platform.layout"
    :data-theme-preference="themePreference"
    :style="{ '--chat-viewport-height': viewportHeight }"
  >
    <aside v-if="!usesDrawers" class="chat-product__navigation">
      <SidebarNav
        embedded
        :sessions="store.sessions"
        :active-session-id="store.activeSessionId"
        :disabled="!store.canOperateSessions"
        :busy="store.sessionBusy"
        @create="createSession"
        @select="selectSession"
      />
    </aside>

    <main class="chat-product__conversation">
      <header class="chat-product__app-header">
        <div class="chat-product__thread-title">
          <SkIconButton
            v-if="usesDrawers"
            label="打开会话栏"
            :aria-expanded="sidebarOpen"
            @click="openSessions($event.currentTarget as HTMLElement)"
          >
            <Menu :size="19" aria-hidden="true" />
          </SkIconButton>
          <span v-else class="chat-product__mark" aria-hidden="true">S</span>
          <div>
            <h2 tabindex="-1">{{ title }}</h2>
            <p>{{ store.username }} · {{ subtitle }}</p>
          </div>
        </div>
        <div class="chat-product__header-actions">
          <SkIconButton
            label="切换用户"
            :title="`当前用户：${store.username}`"
            @click="store.switchUser"
          >
            <UserRound :size="18" aria-hidden="true" />
          </SkIconButton>
          <SkIconButton label="切换明暗主题" @click="toggleTheme"
            ><SunMoon :size="18" aria-hidden="true"
          /></SkIconButton>
          <SkIconButton
            v-if="usesDrawers"
            label="打开上下文"
            :aria-expanded="contextOpen"
            @click="openContext($event.currentTarget as HTMLElement)"
          >
            <PanelRight :size="18" aria-hidden="true" />
          </SkIconButton>
        </div>
      </header>
      <ConnectionNotice />
      <div class="chat-product__message-area">
        <section
          ref="messageStream"
          class="chat-product__timeline"
          aria-label="消息"
          @scroll.passive="updateStickiness"
        >
          <div v-if="!store.messages.length" class="chat-product__empty">
            <SkEmptyState
              title="从一个清晰的问题开始"
              description="告诉 Agent 你想完成什么，一起把想法变成结果。"
            >
              <template #icon><Sparkles :size="24" aria-hidden="true" /></template>
              <SkButton
                :disabled="!store.canOperateSessions"
                :loading="store.sessionBusy"
                @click="createSession"
              >
                <template #leading><Plus :size="15" aria-hidden="true" /></template>新建会话
              </SkButton>
            </SkEmptyState>
          </div>
          <div v-else class="chat-product__messages">
            <MessageItem v-for="message in store.messages" :key="message.id" :message="message" />
          </div>
        </section>
        <SkButton
          v-if="!stickToBottom && store.messages.length"
          class="chat-product__latest"
          variant="secondary"
          @click="scrollToBottom"
        >
          <template #leading><ArrowDown :size="15" aria-hidden="true" /></template>回到最新消息
        </SkButton>
      </div>
      <div class="sk-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ announcement }}
      </div>
      <footer class="chat-product__composer">
        <PromptBar
          ref="promptBar"
          v-model="store.draft"
          compact
          multiline
          variant="Rounded"
          :disabled="store.connectionState !== 'connected' || store.sessionBusy"
          :can-send="store.canSend"
          :run-state="store.runState"
          @send="sendMessage"
          @stop="store.cancelRun"
        />
        <p>Enter 发送 · Shift + Enter 换行</p>
      </footer>
    </main>

    <ContextPanel v-if="!usesDrawers" class="chat-product__drawer" />
    <ChatDrawer v-model:open="sidebarOpen" title="会话栏" side="left" :trigger="sidebarTrigger">
      <SidebarNav
        embedded
        :sessions="store.sessions"
        :active-session-id="store.activeSessionId"
        :disabled="!store.canOperateSessions"
        :busy="store.sessionBusy"
        :error="store.errorMessage"
        @create="createSession"
        @select="selectSession"
      />
    </ChatDrawer>
    <ChatDrawer
      v-model:open="contextOpen"
      title="会话上下文"
      side="right"
      :trigger="contextTrigger"
    >
      <ContextPanel />
    </ChatDrawer>
  </div>
</template>

<style scoped>
.chat-product {
  display: grid;
  width: 100%;
  height: var(--chat-viewport-height, 100dvh);
  min-height: 0;
  grid-template-columns: var(--sk-c-sidebar-width) minmax(0, 1fr) var(--sk-p-size-layout-context);
  overflow: hidden;
  background: var(--sk-canvas);
  color: var(--sk-label-primary);
}
.chat-product--compact {
  grid-template-columns: minmax(0, 1fr);
}
.chat-product__navigation {
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--sk-separator);
  background: var(--sk-surface-sidebar);
}
.chat-product__conversation {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}
.chat-product__app-header {
  display: flex;
  min-height: 4rem;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-p-space-3);
  padding: max(var(--sk-p-space-2), env(safe-area-inset-top)) var(--sk-p-space-4)
    var(--sk-p-space-2);
  border-bottom: 1px solid var(--sk-separator);
  background: var(--sk-surface-default);
}
.chat-product__thread-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--sk-p-space-3);
}
.chat-product__thread-title > div {
  min-width: 0;
}
.chat-product__thread-title h2 {
  margin: 0;
  overflow: hidden;
  font-size: var(--sk-p-size-text-body);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-product__thread-title p {
  margin: var(--sk-p-space-1) 0 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
}
.chat-product__mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: var(--sk-p-radius-sm);
  background: var(--sk-label-primary);
  color: var(--sk-surface-default);
  font-size: var(--sk-p-size-text-sm);
  font-weight: 700;
}
.chat-product__header-actions {
  display: flex;
  flex: none;
  gap: var(--sk-p-space-1);
}
.chat-product__message-area {
  position: relative;
  min-height: 0;
  flex: 1;
}
.chat-product__timeline {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.chat-product__empty {
  display: grid;
  min-height: 100%;
  place-items: center;
  padding: var(--sk-p-space-5);
}
.chat-product__messages {
  display: flex;
  max-width: 60rem;
  min-height: 100%;
  flex-direction: column;
  gap: var(--sk-c-message-gap);
  margin: 0 auto;
  padding: var(--sk-p-space-8) clamp(var(--sk-p-space-4), 4vw, var(--sk-p-space-12));
}
.chat-product__latest {
  position: absolute;
  right: var(--sk-p-space-4);
  bottom: var(--sk-p-space-3);
  box-shadow: var(--sk-shadow-overlay);
}
.chat-product__composer {
  flex: none;
  padding: var(--sk-p-space-3) var(--sk-p-space-4)
    max(var(--sk-p-space-3), env(safe-area-inset-bottom));
}
.chat-product__composer > p {
  margin: var(--sk-p-space-2) 0 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-xs);
  text-align: center;
}
.chat-product__composer :deep(.prompt-bar) {
  max-width: 52rem;
  margin: 0 auto;
}
.chat-product__drawer {
  min-height: 0;
}
@media (max-width: 640px), (max-height: 480px) {
  .chat-product__app-header {
    min-height: 3.5rem;
    padding-inline: var(--sk-p-space-2);
  }
  .chat-product__thread-title p {
    display: none;
  }
  .chat-product__messages {
    gap: var(--sk-p-space-5);
    padding: var(--sk-p-space-5) var(--sk-p-space-3);
  }
  .chat-product__composer {
    padding-inline: var(--sk-p-space-3);
  }
  .chat-product__composer > p {
    display: none;
  }
}
</style>
