import { defineConfig } from '@playwright/test'
import fullstack from './playwright.fullstack.config'

export default defineConfig({
  ...fullstack,
  testDir: './tests/integration-web',
  outputDir: './test-artifacts/integration-web',
  timeout: 30000,
})
