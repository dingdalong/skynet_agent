import { defineConfig, devices } from '@playwright/test'

const agentWebSocketUrl = process.env.AGENT_WS_URL ?? 'ws://127.0.0.1:18791/agent'

export default defineConfig({
  testDir: './tests/e2e-fullstack',
  outputDir: './test-artifacts/web',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:15173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-fullstack',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:15173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_CHAT_TRANSPORT: 'websocket',
      VITE_AGENT_WS_URL: agentWebSocketUrl,
    },
  },
})
