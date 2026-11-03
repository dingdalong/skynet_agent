/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_WS_URL?: string
  readonly VITE_CHAT_TRANSPORT?: 'mock' | 'websocket'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
