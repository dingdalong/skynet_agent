import { createPinia } from 'pinia'
import { setup } from '@storybook/vue3-vite'
import type { Preview } from '@storybook/vue3-vite'
import '../src/styles/index.css'
import '../stories/storybook.css'

setup((app) => app.use(createPinia()))

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      description: '颜色主题',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: '浅色' },
          { value: 'dark', title: '深色' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        document.documentElement.dataset.theme = context.globals.theme
      },
      template: '<story />',
    }),
  ],
}

export default preview
