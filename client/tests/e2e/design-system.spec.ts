import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function openStory(page: Page, story: string, theme = 'light') {
  await page.goto(
    `http://127.0.0.1:16106/iframe.html?id=design-system-${story}&viewMode=story&globals=theme:${theme}`,
  )
  await expect(page.getByRole('main')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

for (const theme of ['light', 'dark']) {
  test(`${theme} 基础按钮统一操作层级、焦点和加载状态`, async ({ page }) => {
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
    await expect(page).toHaveScreenshot(`components-buttons-${theme}.png`, {
      animations: 'disabled',
      fullPage: true,
    })
  })

  test(`${theme} 表单错误、禁用与状态反馈可访问`, async ({ page }) => {
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
    await expect(page).toHaveScreenshot(`components-fields-${theme}.png`, {
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
