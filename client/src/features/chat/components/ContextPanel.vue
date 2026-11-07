<script setup lang="ts">
import { SkStatusBadge } from '@skynet/design-system'
import { Cloud, Database, ShieldCheck } from 'lucide-vue-next'
import { computed } from 'vue'
import { useChatStore } from '../../../stores/chat'

const store = useChatStore()
const connectionLabel = computed(() => {
  switch (store.connectionState) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '正在连接'
    default:
      return '未连接'
  }
})
</script>

<template>
  <aside class="context-panel" aria-label="会话上下文">
    <header>
      <div>
        <p class="context-panel__kicker">会话上下文</p>
        <h2>当前会话</h2>
      </div>
    </header>

    <section class="summary-card">
      <SkStatusBadge
        :status="store.connectionState === 'connected' ? 'success' : 'warning'"
        :label="connectionLabel"
      />
      <h3>{{ store.activeSession?.title || '新的会话' }}</h3>
      <p>会话由云端 Agent 处理，客户端仅保存当前界面状态。</p>
    </section>

    <dl class="facts">
      <div>
        <dt><Cloud :size="15" aria-hidden="true" />Agent</dt>
        <dd>Skynet 云端</dd>
      </div>
      <div>
        <dt><Database :size="15" aria-hidden="true" />会话数据</dt>
        <dd>仅服务内存</dd>
      </div>
      <div>
        <dt><ShieldCheck :size="15" aria-hidden="true" />本地操作</dt>
        <dd>未启用</dd>
      </div>
    </dl>

    <section class="boundary-note">
      <h3>数据边界</h3>
      <p>会话按用户名保留并自动同步，断线后自动恢复；服务器重启会清空数据。</p>
    </section>
  </aside>
</template>

<style scoped>
.context-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: var(--sk-p-space-5);
  border-left: 1px solid var(--sk-separator);
  background: var(--sk-surface-default);
  padding: max(var(--sk-p-space-4), env(safe-area-inset-top)) var(--sk-p-space-4)
    max(var(--sk-p-space-4), env(safe-area-inset-bottom));
  overflow-y: auto;
}

.context-panel header h2 {
  margin: 0;
  font-size: var(--sk-p-size-text-body);
}

.context-panel__kicker {
  margin: 0 0 var(--sk-p-space-1);
  color: var(--sk-label-tertiary);
  font-size: 0.625rem;
  font-weight: var(--sk-p-font-weight-semibold);
  letter-spacing: 0.14em;
}

.summary-card,
.boundary-note {
  border: 0;
  border-radius: var(--sk-c-card-radius);
  background: var(--sk-c-card-background);
  box-shadow: var(--sk-c-card-shadow);
  padding: var(--sk-p-space-4);
}

.summary-card h3,
.boundary-note h3 {
  margin: var(--sk-p-space-4) 0 var(--sk-p-space-2);
  font-size: var(--sk-p-size-text-body);
}

.summary-card p,
.boundary-note p {
  margin: 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-sm);
  line-height: 1.55;
}

.facts {
  display: grid;
  gap: var(--sk-p-space-1);
  margin: 0;
}

.facts div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-p-space-3);
  border-bottom: 1px solid var(--sk-separator);
  padding: var(--sk-p-space-3) 0;
}

.facts dt {
  display: flex;
  align-items: center;
  gap: var(--sk-p-space-2);
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-sm);
}

.facts dd {
  margin: 0;
  font-size: var(--sk-p-size-text-sm);
}

.boundary-note h3 {
  margin-top: 0;
}
</style>
