<script setup lang="ts">
import { SkStatusBadge } from '@skynet/design-system'
import { Cloud, Database, ShieldCheck } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useChatStore } from '../../../stores/chat'

const store = useChatStore()
const busy = ref(false)
const executionError = ref('')
const device = computed(() => store.desktops.find((d) => d.id === store.executionTarget?.deviceId))
const localDevice = computed(() => store.desktops.find((d) => d.id === store.localDeviceId))
const executionMode = computed(() =>
  !store.executionTarget?.deviceId
    ? 'cloud'
    : store.executionTarget.deviceId === store.localDeviceId
      ? 'local'
      : 'remote',
)
const targetLabel = computed(() =>
  executionMode.value === 'cloud'
    ? '云端开发'
    : executionMode.value === 'local'
      ? '本地开发'
      : '远程开发',
)
const locked = computed(
  () =>
    busy.value ||
    store.connectionState !== 'connected' ||
    store.runState !== 'idle' ||
    store.sending,
)
async function changeExecution(event: Event) {
  const select = event.target as HTMLSelectElement
  await setExecution(select.value)
  select.value = executionMode.value
}
async function setExecution(mode: string) {
  if (mode !== 'cloud' && mode !== 'local') return
  busy.value = true
  executionError.value = ''
  try {
    if ((await store.setExecution(mode)) === false)
      executionError.value = '执行目标未更改，请检查设备状态或停止后台进程后重试。'
  } finally {
    busy.value = false
  }
}
async function changeRemote(event: Event) {
  const input = event.target as HTMLInputElement
  busy.value = true
  executionError.value = ''
  try {
    if (!(await store.setRemote(input.checked))) executionError.value = '远程执行设置失败，请重试。'
  } finally {
    input.checked = localDevice.value?.remoteEnabled === true
    busy.value = false
  }
}
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
      <p>会话由云端 Agent 处理，工具在当前执行目标运行。</p>
    </section>

    <section class="execution-settings" aria-label="开发模式">
      <label for="execution-mode">开发模式</label>
      <select
        id="execution-mode"
        :value="executionMode"
        :disabled="locked"
        @change="changeExecution"
      >
        <option value="cloud">云端开发</option>
        <option v-if="store.localDeviceId" value="local">本地开发 · 选择目录</option>
        <option v-if="executionMode === 'remote'" value="remote">
          远程开发 · {{ device?.name || '桌面设备' }}
        </option>
      </select>
      <p v-if="store.executionTarget?.directory" class="execution-directory">
        {{ store.executionTarget.directory }}
      </p>
      <p v-if="store.executionTarget?.deviceId" role="status">
        {{
          device?.online
            ? executionMode === 'local' || device.remoteEnabled
              ? '桌面执行器在线'
              : '目标桌面未开启远程执行'
            : '目标桌面离线'
        }}
      </p>
      <button
        v-if="executionMode === 'local'"
        type="button"
        :disabled="locked"
        @click="setExecution('local')"
      >
        更换工作目录
      </button>
      <label v-if="store.localDeviceId" class="remote-toggle">
        <input
          type="checkbox"
          :checked="localDevice?.remoteEnabled === true"
          :disabled="busy || store.connectionState !== 'connected'"
          @change="changeRemote"
        />
        允许其他设备远程执行
      </label>
      <p v-if="store.localDeviceId">
        开启后，同用户名的其他设备可继续此桌面的项目会话；关闭会停止远程任务。
      </p>
      <p v-if="busy" role="status">正在更新执行设置…</p>
      <p v-if="executionError" role="alert">{{ executionError }}</p>
    </section>

    <dl class="facts">
      <div>
        <dt>会话模型</dt>
        <dd>
          {{ store.models.find((model) => model.id === store.modelId)?.name ?? '未选择' }}
        </dd>
      </div>
      <div>
        <dt>权限模型</dt>
        <dd>
          {{
            store.permissionModelId === store.modelId
              ? '跟随会话模型'
              : (store.models.find((model) => model.id === store.permissionModelId)?.name ??
                '未选择')
          }}
        </dd>
      </div>
      <div>
        <dt><Cloud :size="15" aria-hidden="true" />Agent</dt>
        <dd>Skynet 云端</dd>
      </div>
      <div>
        <dt><Database :size="15" aria-hidden="true" />会话数据</dt>
        <dd>仅服务内存</dd>
      </div>
      <div>
        <dt><ShieldCheck :size="15" aria-hidden="true" />工具执行</dt>
        <dd>{{ targetLabel }}</dd>
      </div>
    </dl>

    <section class="boundary-note">
      <h3>数据边界</h3>
      <p>会话按用户名保留并自动同步，断线后自动恢复；服务器重启清空聊天数据，工具文件继续保留。</p>
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

<style scoped>
.execution-settings {
  display: grid;
  gap: var(--sk-p-space-3);
}
.execution-settings select,
.execution-settings button {
  min-height: 44px;
  width: 100%;
  border: 1px solid var(--sk-separator);
  border-radius: var(--sk-c-card-radius);
  background: var(--sk-surface-default);
  color: var(--sk-label-primary);
  padding: var(--sk-p-space-2);
  font: inherit;
}
.execution-settings p {
  margin: 0;
  color: var(--sk-label-secondary);
  font-size: var(--sk-p-size-text-sm);
  line-height: 1.55;
}
.execution-directory {
  overflow-wrap: anywhere;
}
.remote-toggle {
  display: flex;
  align-items: center;
  gap: var(--sk-p-space-2);
  min-height: 44px;
}
.execution-settings :disabled {
  opacity: 0.55;
  cursor: default;
}
.execution-settings :focus-visible {
  outline: 2px solid var(--sk-label-primary);
  outline-offset: 2px;
}
</style>
