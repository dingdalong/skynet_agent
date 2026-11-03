import type { Meta, StoryObj } from '@storybook/vue3-vite'

const colors = [
  ['canvas', 'Canvas'],
  ['surface-default', 'Surface'],
  ['surface-muted', 'Muted surface'],
  ['label-primary', 'Primary label'],
  ['label-secondary', 'Secondary label'],
  ['accent-default', 'Accent'],
  ['accent-soft', 'Accent soft'],
  ['status-success', 'Success'],
  ['status-warning', 'Warning'],
  ['status-danger', 'Danger'],
]

const typeScale = [
  ['Display', 'sk-p-size-text-display', 'sk-p-font-weight-semibold'],
  ['Title', 'sk-p-size-text-title', 'sk-p-font-weight-semibold'],
  ['Heading', 'sk-p-size-text-lg', 'sk-p-font-weight-semibold'],
  ['Body', 'sk-p-size-text-body', 'sk-p-font-weight-regular'],
  ['Caption', 'sk-p-size-text-xs', 'sk-p-font-weight-regular'],
]

const meta = {
  title: '规范/视觉基础',
  id: 'design-system-foundations',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Colors: Story = {
  render: () => ({
    setup() {
      return { colors }
    },
    template: `
      <main style="padding: 3rem; max-width: 72rem; margin: 0 auto;">
        <p class="eyebrow">DESIGN TOKENS</p>
        <h1>克制的颜色层级</h1>
        <p class="lede">内容使用中性表面，强调色只标记可操作与运行状态。</p>
        <div class="swatch-grid">
          <article v-for="[token, label] in colors" :key="token" class="swatch-card">
            <div class="swatch" :style="{ background: 'var(--sk-' + token + ')' }"></div>
            <strong>{{ label }}</strong>
            <code>--sk-{{ token }}</code>
          </article>
        </div>
      </main>
    `,
  }),
}

export const Typography: Story = {
  render: () => ({
    setup() {
      return { typeScale }
    },
    template: `
      <main style="padding: 3rem; max-width: 62rem; margin: 0 auto;">
        <p class="eyebrow">INTER / JETBRAINS MONO</p>
        <h1>统一的中英文排版节奏</h1>
        <section class="type-stack">
          <div v-for="[label, size, weight] in typeScale" :key="label" class="type-row">
            <span>{{ label }}</span>
            <p :style="{ fontSize: 'var(--' + size + ')', fontWeight: 'var(--' + weight + ')' }">
              Agent 帮助你把复杂工作拆成可理解的步骤。
            </p>
          </div>
          <div class="type-row"><span>Inter</span><p>Build with clarity. Agent workspace 0123456789.</p></div>
          <div class="type-row"><span>JetBrains Mono</span><code>const status = 'ready'; // 0123456789</code></div>
        </section>
      </main>
    `,
  }),
}

export const SpacingAndShape: Story = {
  render: () => ({
    template: `
      <main style="padding: 3rem; max-width: 62rem; margin: 0 auto;">
        <p class="eyebrow">SPACE / SHAPE / MOTION</p>
        <h1>可预测的空间与边界</h1>
        <section class="foundation-grid">
          <article class="foundation-card">
            <h2>4px 间距节奏</h2>
            <div v-for="space in [1, 2, 3, 4, 6, 8, 12]" :key="space" class="space-row">
              <code>space.{{ space }}</code>
              <span class="space-bar" :style="{ width: 'var(--sk-p-space-' + space + ')' }"></span>
            </div>
          </article>
          <article class="foundation-card">
            <h2>统一圆角</h2>
            <div class="radius-row">
              <span v-for="radius in ['sm', 'md', 'lg', 'xl']" :key="radius"
                :style="{ borderRadius: 'var(--sk-p-radius-' + radius + ')' }">
                {{ radius }}
              </span>
            </div>
          </article>
        </section>
      </main>
    `,
  }),
}
