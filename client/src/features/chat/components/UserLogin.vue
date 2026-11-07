<script setup lang="ts">
import { ref } from 'vue'
import { SkButton, SkTextField } from '@skynet/design-system'
import { useChatStore } from '../../../stores/chat'
const store = useChatStore()
const name = ref(store.username)
</script>

<template>
  <main class="user-login">
    <form class="user-login__form" @submit.prevent="store.connect(name)">
      <h1>进入 Skynet Agent</h1>
      <p>输入用户名，继续之前的会话。</p>
      <SkTextField
        v-model="name"
        label="用户名"
        autocomplete="username"
        :error="store.connectionError"
        hint="当前仅使用用户名识别用户，同名共享会话。"
      />
      <SkButton
        type="submit"
        :loading="store.connectionState === 'connecting'"
        :disabled="!name.trim()"
        >进入</SkButton
      >
    </form>
  </main>
</template>

<style scoped>
.user-login {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: var(--sk-p-space-6);
}
.user-login__form {
  display: grid;
  gap: var(--sk-p-space-5);
  width: 100%;
  max-width: 24rem;
  color: var(--sk-label-primary);
}
.user-login__form h1 {
  font-size: var(--sk-p-size-text-lg);
}
.user-login__form p {
  color: var(--sk-label-secondary);
}
</style>
