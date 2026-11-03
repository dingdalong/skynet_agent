import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function openSessions(page: Page) {
  const trigger = page.getByRole('button', { name: '打开会话栏' })
  if (await trigger.isVisible()) await trigger.click()
  return page.getByRole('navigation', { name: '会话列表' })
}

async function sendMessage(page: Page, text: string) {
  await page.getByRole('textbox', { name: '给 Agent 发送消息' }).fill(text)
  await page.getByRole('button', { name: '发送消息' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('main').getByRole('heading', { name: '新的会话' })).toBeVisible()
})

test('发送消息并接收流式回答', async ({ page }) => {
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await composer.fill('帮我验证跨平台聊天界面')
  await page.getByRole('button', { name: '发送消息' }).click()

  await expect(
    page.getByRole('region', { name: '消息' }).getByText('帮我验证跨平台聊天界面'),
  ).toBeVisible()
  await expect(page.getByText(/这是模拟的 Agent 回复/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('article', { name: '用户消息', exact: true })).toContainText(
    '帮我验证跨平台聊天界面',
  )
  await expect(page.getByRole('article', { name: '助手回答', exact: true })).toContainText(
    '这是模拟的 Agent 回复',
  )
  await expect(page.getByText('正在生成')).toHaveCount(0)
})

test('空状态新建复用当前会话，草稿和唯一会话保留', async ({ page, isMobile }) => {
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await composer.fill('未发送的草稿')
  await page.getByRole('button', { name: '新建会话' }).first().click()
  await page.getByRole('button', { name: '新建会话' }).first().click()
  await expect(composer).toHaveValue('未发送的草稿')
  await expect(page.getByRole('main').getByRole('heading', { name: '新的会话' })).toBeVisible()
  if (isMobile) {
    await page.getByRole('button', { name: '打开会话栏' }).click()
  }
  const sessionRegion = isMobile
    ? page.getByRole('dialog', { name: '会话栏' }).getByRole('navigation', { name: '会话列表' })
    : page.getByRole('navigation', { name: '会话列表' })
  await expect(sessionRegion.getByRole('button')).toHaveCount(1)
  await expect(sessionRegion.getByRole('button', { name: /新的会话/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('没有严重无障碍问题', async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  )
  expect(blocking).toEqual([])
})

test('主要界面视觉基线', async ({ page }) => {
  await expect(page).toHaveScreenshot('chat-shell.png', {
    animations: 'disabled',
    fullPage: true,
  })
})

test('暗色主题视觉基线', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面主题在 Chromium 和 WebKit 中验证')
  await page.getByRole('button', { name: '切换明暗主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page).toHaveScreenshot('chat-shell-dark.png', {
    animations: 'disabled',
    fullPage: true,
  })
})

test.describe('移动端会话栏', () => {
  test.skip(({ isMobile }) => !isMobile, '仅在移动视口运行')

  test('可以打开可访问的会话抽屉', async ({ page }) => {
    await page.getByRole('button', { name: '打开会话栏' }).click()
    const dialog = page.getByRole('dialog', { name: '会话栏' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: '关闭会话栏' })).toBeFocused()
  })
})

test('会话草稿独立保存，新会话为空，返回原会话后恢复', async ({ page }) => {
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await sendMessage(page, '原会话消息')
  await expect(page.getByRole('button', { name: '停止', exact: true })).toHaveCount(0)
  await composer.fill('原会话草稿\n第二行')
  const sessions = await openSessions(page)
  const create = page.getByRole('button', { name: '新建会话', exact: true }).first()
  await create.click()
  await expect(composer).toHaveValue('')
  await composer.fill('新会话草稿')
  await openSessions(page)
  await sessions.getByRole('button').nth(1).click()
  await expect(composer).toHaveValue('原会话草稿\n第二行')
  await openSessions(page)
  await page.getByRole('button', { name: '新建会话', exact: true }).first().click()
  await expect(composer).toHaveValue('新会话草稿')
  await openSessions(page)
  await expect(sessions.getByRole('button')).toHaveCount(2)
})

test('中屏两侧抽屉均可打开、关闭并恢复焦点', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  for (const [triggerName, title, closeName] of [
    ['打开会话栏', '会话栏', '关闭会话栏'],
    ['打开上下文', '会话上下文', '关闭会话上下文'],
  ]) {
    const trigger = page.getByRole('button', { name: triggerName })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: title })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: closeName })).toBeFocused()
    await dialog.evaluate((element) =>
      Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
    )
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await dialog.getByRole('button', { name: closeName }).click()
    await expect(trigger).toBeFocused()
  }
  await page.getByRole('button', { name: '打开上下文' }).click()
  await page.setViewportSize({ width: 1440, height: 900 })
  if (isMobile) {
    await expect(page.getByRole('dialog', { name: '会话上下文' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: '打开上下文' })).toBeFocused()
    return
  }
  await expect(page.getByRole('heading', { name: '当前会话' })).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('heading', { name: '新的会话', exact: true }),
  ).toBeFocused()
})

test('短横屏输入区和发送按钮完整位于视口内', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await composer.fill('横屏消息')
  const send = page.getByRole('button', { name: '发送消息' })
  const box = await send.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y + box!.height).toBeLessThanOrEqual(390)
  await send.click()
  await expect(
    page.getByRole('region', { name: '消息' }).getByText('横屏消息', { exact: true }),
  ).toBeVisible()
})

test('输入法组合期间 Enter 不发送，普通 Enter 发送', async ({ page }) => {
  const composer = page.getByRole('textbox', { name: '给 Agent 发送消息' })
  await composer.fill('输入法草稿')
  await composer.dispatchEvent('keydown', { key: 'Enter', isComposing: true })
  await expect(composer).toHaveValue('输入法草稿')
  await composer.press('Enter')
  await expect(composer).toHaveValue('')
  await expect(
    page.getByRole('region', { name: '消息' }).getByText('输入法草稿', { exact: true }),
  ).toBeVisible()
})

test('Escape 优先关闭抽屉，再停止生成', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await sendMessage(page, '保持生成以验证快捷键'.repeat(20))
  await page.getByRole('button', { name: '打开上下文' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('已停止', { exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: '生成已停止' })).toHaveCount(1)
})

test('向上阅读时保留位置，可以返回最新消息并继续跟随', async ({ page }) => {
  await sendMessage(page, Array(18).fill('用于滚动验证的一行消息').join('\n'))
  await expect(page.getByRole('button', { name: '停止', exact: true })).toHaveCount(0, {
    timeout: 15_000,
  })
  const stream = page.getByRole('region', { name: '消息' })
  await expect
    .poll(() =>
      stream.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight),
    )
    .toBeLessThan(5)
  await stream.evaluate((element) => {
    element.scrollTop = 0
    element.dispatchEvent(new Event('scroll'))
  })
  const latest = page.getByRole('button', { name: '回到最新消息' })
  await expect(latest).toBeVisible()
  await sendMessage(page, '继续生成')
  await expect(page.getByRole('button', { name: '停止', exact: true })).toHaveCount(0, {
    timeout: 10_000,
  })
  expect(await stream.evaluate((element) => element.scrollTop)).toBe(0)
  await latest.click()
  await expect
    .poll(() =>
      stream.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight),
    )
    .toBeLessThan(5)
})

test('主题存储读写受限时仍可挂载并切换主题', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem
    const setItem = Storage.prototype.setItem
    // 开发模式的 Pinia DevTools 自身依赖存储；这里隔离应用主题偏好的故障。
    Storage.prototype.getItem = function (key) {
      if (key === 'skynet-theme') throw new DOMException('Storage blocked', 'SecurityError')
      return getItem.call(this, key)
    }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'skynet-theme') throw new DOMException('Storage blocked', 'SecurityError')
      return setItem.call(this, key, value)
    }
  })
  await page.reload()
  await expect(page.getByRole('textbox', { name: '给 Agent 发送消息' })).toBeEnabled()
  await page.getByRole('button', { name: '切换明暗主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: '切换明暗主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('主题每次点击都切换实际明暗，刷新后保留选择', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' })
  await page.reload()
  const canvas = page.locator('.chat-product')
  const toggle = page.getByRole('button', { name: '切换明暗主题' })
  const dark = await canvas.evaluate((element) => getComputedStyle(element).backgroundColor)
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(canvas).not.toHaveCSS('background-color', dark)
  const light = await canvas.evaluate((element) => getComputedStyle(element).backgroundColor)
  await toggle.click()
  await expect(canvas).toHaveCSS('background-color', dark)
  await toggle.click()
  await expect(canvas).toHaveCSS('background-color', light)
  await page.reload()
  await expect(canvas).toHaveCSS('background-color', light)
  await toggle.click()
  await expect(canvas).toHaveCSS('background-color', dark)
})

test('主题切换时按钮和会话选中色同步更新，保留常规动效', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' })
  // 此用例验证桌面三栏控件，不受移动设备类别影响。
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Macintosh' })
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
  })
  await page.reload()
  const toggle = page.getByRole('button', { name: '切换明暗主题' })
  let previousPrimaryBackground = ''
  for (const theme of ['light', 'dark', 'light']) {
    await toggle.click()
    await page.mouse.move(0, 0)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const surface = await page
      .locator('.chat-product__app-header')
      .evaluate((element) => getComputedStyle(element).backgroundColor)
    const label = await page
      .locator('.chat-product__thread-title h2')
      .evaluate((element) => getComputedStyle(element).color)
    await expect(page.locator('.sidebar-nav-card__new')).toHaveCSS('background-color', surface)
    await expect(page.locator('.sidebar-nav-card__new')).toHaveCSS('color', label)
    await expect(page.locator('.sidebar-nav-card__item.is-active')).toHaveCSS(
      'background-color',
      surface,
    )
    await expect(
      page.locator('.sidebar-nav-card__item.is-active .sidebar-nav-card__icon'),
    ).toHaveCSS('color', label)
    const primaryBackground = await page
      .locator('.chat-product__empty .button')
      .evaluate((element) => getComputedStyle(element).backgroundColor)
    if (previousPrimaryBackground) expect(primaryBackground).not.toBe(previousPrimaryBackground)
    previousPrimaryBackground = primaryBackground
  }
})

test('iPadOS 桌面模式在宽视口仍使用移动抽屉布局', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    viewport: { width: 1366, height: 1024 },
    hasTouch: true,
  })
  try {
    const tablet = await context.newPage()
    await tablet.addInitScript(() =>
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }),
    )
    await tablet.goto('/')
    await expect(tablet.locator('.chat-product')).toHaveAttribute('data-layout', 'mobile')
    await tablet.getByRole('button', { name: '打开会话栏' }).click()
    await expect(tablet.getByRole('dialog', { name: '会话栏' })).toBeVisible()
    await tablet.getByRole('button', { name: '关闭会话栏' }).click()
    await tablet.getByRole('button', { name: '打开上下文' }).click()
    await expect(tablet.getByRole('dialog', { name: '会话上下文' })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('文字放大和减少动效下主要操作仍可用', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await page.getByRole('button', { name: '打开上下文' }).click()
  await page.getByRole('button', { name: '关闭会话上下文' }).click()
  await sendMessage(page, '放大文字后发送')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('深色和高对比度下抽屉仍满足无障碍要求', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce', contrast: 'more' })
  for (const name of ['打开会话栏', '打开上下文']) {
    await page.getByRole('button', { name }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button').first()).toBeFocused()
    await dialog.evaluate((element) =>
      Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
    )
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
    ).toEqual([])
    await page.keyboard.press('Escape')
  }
})

test('移动端可视视口随键盘收缩时输入区保持可达', async ({ page, isMobile }) => {
  test.skip(!isMobile, '仅移动设备使用可视视口高度')
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, get: () => 420 })
    window.visualViewport!.dispatchEvent(new Event('resize'))
  })
  const send = page.getByRole('button', { name: '发送消息' })
  await expect
    .poll(async () => {
      const box = await send.boundingBox()
      return box ? box.y + box.height : Infinity
    })
    .toBeLessThanOrEqual(420)
  await sendMessage(page, '键盘打开时发送')
  await expect(page.getByRole('article', { name: '用户消息', exact: true })).toContainText(
    '键盘打开时发送',
  )
})
