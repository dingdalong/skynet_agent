<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import ChatPage from './features/chat/ChatPage.vue'
import UserLogin from './features/chat/components/UserLogin.vue'
import { useChatStore } from './stores/chat'
const store = useChatStore()
onMounted(() => {
  if (store.username) void store.connect()
})
onBeforeUnmount(() => store.disconnect())
</script>

<template>
  <ChatPage v-if="store.userId" />
  <UserLogin v-else />
</template>
