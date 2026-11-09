/* global window, document, Event, setTimeout */
;(async () => {
  const invoke = window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__)
  const fixture = window.__AGENT_REAL_FIXTURE
  window.localStorage.setItem('skynet.username', fixture.username)
  const button = (name) =>
    [...document.querySelectorAll('button')].find(
      (e) => e.getAttribute('aria-label') === name || e.textContent.trim() === name,
    )
  async function wait(check, name) {
    const until = Date.now() + 240000
    while (Date.now() < until) {
      if (await check()) return
      await new Promise((r) => setTimeout(r, 50))
    }
    throw new Error('等待超时：' + name)
  }
  async function complete(text) {
    const input = document.querySelector('textarea[aria-label="给 Agent 发送消息"]')
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 100))
    button('发送消息').click()
    await wait(() => button('停止'), '任务开始')
    await wait(() => button('发送消息') && !button('停止'), '任务完成')
    if (document.querySelector('.message--assistant:last-child')?.textContent.includes('生成失败'))
      throw new Error(document.body.textContent.slice(-8000))
  }
  async function mode(value) {
    const select = document.querySelector('#execution-mode')
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
    const label = value === 'local' ? '本地开发' : '云端开发'
    await wait(
      () =>
        select.value === value &&
        !select.disabled &&
        document.querySelector('.facts div:last-child dd')?.textContent.trim() === label,
      '执行模式 ' + value,
    )
  }
  async function state() {
    return invoke('probe_execution_state')
  }
  try {
    await wait(
      () => button('发送消息') && document.querySelector('#execution-mode option[value="local"]'),
      '桌面登录与注册',
    )
    await mode('local')
    await wait(
      async () => document.body.textContent.includes((await state()).directory),
      '本地目录绑定',
    )
    await complete(
      `请使用 apply_patch 在当前项目根目录新增 local.txt，内容为 local:${fixture.token} 加换行，再使用 exec_command 读取 local.txt 验证。仅执行这两步。`,
    )
    const checkbox = document.querySelector('.remote-toggle input')
    if (!checkbox.checked) checkbox.click()
    await wait(() => checkbox.checked && !checkbox.disabled, '远程开启')
    await invoke('probe_execution_marker', { name: 'ready' })
    await wait(async () => (await state()).disable, '远程任务开始')
    checkbox.click()
    await wait(() => !checkbox.checked && !checkbox.disabled, '关闭远程')
    await invoke('probe_execution_marker', { name: 'disabled' })
    await wait(async () => (await state()).remoteDone, '远程拒绝验收完成')
    await complete(
      `请仅用 exec_command 执行 printf 'owner:${fixture.token}' > owner.txt && cat owner.txt，验证关闭远程后本机仍可执行。`,
    )
    await mode('cloud')
    await complete(
      `请仅用 exec_command 执行 printf 'cloud:${fixture.token}' > cloud-only.txt && cat cloud-only.txt。`,
    )
    await mode('local')
    await invoke('probe_report', { report: { status: 'passed', scenario: 'desktop-execution' } })
  } catch (error) {
    await invoke('probe_report', {
      report: {
        status: 'failed',
        error: String(error),
        page: document.body.textContent.slice(-16000),
      },
    })
  }
})()
