import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-artifacts/ui',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:15175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: 'VITE_CHAT_TRANSPORT=mock pnpm dev --port 15175',
      url: 'http://127.0.0.1:15175',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'pnpm --filter @skynet/design-system exec storybook dev --ci --no-open --no-version-updates --disable-telemetry --host 127.0.0.1 --port 16106 --exact-port',
      url: 'http://127.0.0.1:16106',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
