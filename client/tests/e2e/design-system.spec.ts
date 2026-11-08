import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function settleStory(page: Page) {
  await page.locator('#storybook-root').evaluate(async (element) => {
    const animations = element
      .getAnimations({ subtree: true })
      .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().iterations))
    await Promise.allSettled(animations.map((animation) => animation.finished))
  })
}

async function openStory(page: Page, story: string, theme = 'light') {
  // E2E 由 AxeBuilder 统一扫描，避免与 Storybook 自动检查并发运行。
  await page.goto(
    `http://127.0.0.1:16106/iframe.html?id=design-system-${story}&viewMode=story&globals=theme:${theme};a11y.manual:!true`,
  )
  await expect(page.getByRole('main')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await settleStory(page)
}

for (const theme of ['light', 'dark']) {
  test(`${theme} 托管思考组件与模型菜单支持键盘和窄屏`, async ({ page }, testInfo) => {
    await openStory(page, 'agent-runtime--thinking', theme)
    const toggle = page.getByRole('button', { name: '思考过程 · 思考完成' })
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('思考内容')).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await settleStory(page)
    const thinking = await new AxeBuilder({ page }).include('#storybook-root').analyze()
    expect(
      thinking.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`thinking-${theme}.png`), fullPage: true })
    await openStory(page, 'agent-runtime--models', theme)
    await page.getByRole('button', { name: /^切换会话模型/ }).click()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /^切换会话模型/ })).toContainText('DeepSeek Pro')
    await settleStory(page)
    const models = await new AxeBuilder({ page }).include('#storybook-root').analyze()
    expect(
      models.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test(`${theme} 工具卡片遵循共享视觉，支持键盘展开和窄屏`, async ({ page }, testInfo) => {
    await openStory(page, 'tools--completed', theme)
    const summary = page.locator('.tool-call summary')
    await summary.focus()
    await expect(summary).toBeFocused()
    await expect(summary).toHaveCSS('outline-style', 'solid')
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('工具输出')).toBeVisible()
    const results = await new AxeBuilder({ page }).include('#storybook-root').analyze()
    expect(
      results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`tools-${theme}.png`), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByLabel('工具输出')).toBeVisible()
  })

  test(`${theme} 基础按钮统一操作层级、焦点和加载状态`, async ({ page }, testInfo) => {
    await openStory(page, 'components--buttons', theme)
    const primary = page.getByRole('button', { name: '发送消息', exact: true })
    const icon = page.getByRole('button', { name: '图标发送消息', exact: true })
    const background = await primary.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    await expect(icon).toHaveCSS('background-color', background)
    await expect(page.getByRole('button', { name: /异步操作/ })).toBeDisabled()
    await expect(page.getByRole('button', { name: /异步操作/ })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    await expect(page.getByRole('button', { name: '不可用', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: '显示上下文', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await primary.focus()
    await expect(primary).toBeFocused()
    await expect(primary).toHaveCSS('outline-style', 'solid')
    await page.mouse.move(0, 0)
    const results = await new AxeBuilder({ page }).include('#storybook-root').analyze()
    expect(
      results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath(`components-buttons-${theme}.png`),
      animations: 'disabled',
      fullPage: true,
    })
  })

  test(`${theme} 表单错误、禁用与状态反馈可访问`, async ({ page }, testInfo) => {
    await openStory(page, 'components--fields-and-status', theme)
    const input = page.getByRole('textbox', { name: '会话名称', exact: true })
    await input.fill('示例会话')
    await expect(input).toHaveValue('示例会话')
    await expect(page.getByRole('textbox', { name: '出错的名称', exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByRole('alert')).toHaveText('名称已存在，请换一个。')
    await expect(page.getByRole('textbox', { name: '不可编辑的名称', exact: true })).toBeDisabled()
    await expect(page.getByRole('status')).toHaveCount(5)
    const results = await new AxeBuilder({ page }).include('#storybook-root').analyze()
    expect(
      results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath(`components-fields-${theme}.png`),
      animations: 'disabled',
      fullPage: true,
    })
  })
}

test('共享字体通过本地资源加载，并支持中文回退', async ({ page }) => {
  const fonts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(request.url())
  })
  await openStory(page, 'foundations--typography')
  const loaded = await page.evaluate(async () => {
    const inter = await document.fonts.load('400 16px Inter')
    const mono = await document.fonts.load('400 16px "JetBrains Mono"')
    return [inter, mono].map(
      (faces) => faces.length > 0 && faces.every((face) => face.status === 'loaded'),
    )
  })
  expect(loaded).toEqual([true, true])
  expect(fonts.length).toBeGreaterThanOrEqual(2)
  expect(fonts.every((url) => url.startsWith('http://127.0.0.1:16106/'))).toBe(true)
  await expect(page.getByText('Agent 帮助你把复杂工作拆成可理解的步骤。').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
