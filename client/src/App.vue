<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import ChatPage from './features/chat/ChatPage.vue'
import UserLogin from './features/chat/components/UserLogin.vue'
import { useChatStore } from './stores/chat'
const store = useChatStore()
onMounted(() => {
  void store.attach()
})
onBeforeUnmount(() => {
  store.detach()
})
</script>

<template>
  <ChatPage v-if="store.userId" />
  <UserLogin v-else />
</template>
