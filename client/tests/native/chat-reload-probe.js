/* global document, window, Event, setTimeout */
// 仅由独立原生测试夹具注入，驱动真实 Vue 页面与 WebView 文档生命周期。
;(async () => {
  // 独立测试 App 在首次文档加载前固定登录偏好，避免自动恢复与模拟点击登录竞争。
  if (!window.sessionStorage.getItem('skynet.nativeProbe')) {
    window.localStorage.setItem('skynet.username', 'rust-native-core-probe')
    window.sessionStorage.setItem('skynet.nativeProbe', 'started')
  }
  const invoke = window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__)
  const pause = () => new Promise((resolve) => setTimeout(resolve, 20))
  async function wait(check, description) {
    const deadline = Date.now() + 20000
    while (Date.now() < deadline) {
      if (await check()) return
      await pause()
    }
    throw new Error(`等待失败：${description}`)
  }
  const input = () => document.querySelector('textarea[aria-label="给 Agent 发送消息"]')
  const button = (label) =>
    [...document.querySelectorAll('button')].find(
      (element) =>
        element.getAttribute('aria-label') === label || element.textContent.trim() === label,
    )
  const contains = (text) => document.body.textContent.includes(text)
  const assert = (value, message) => {
    if (!value) throw new Error(message)
  }
  async function draft(value) {
    const callbacks = window.__TAURI_INTERNALS__.callbacks
    const baseline = new Set(callbacks.keys())
    input().value = value
    input().dispatchEvent(new Event('input', { bubbles: true }))
    // 等本轮输入发起的 IPC 返回，不替换 Tauri 的只读 invoke 属性。
    for (let index = 0; index < 8; index++) await Promise.resolve()
    await wait(() => [...callbacks.keys()].every((id) => baseline.has(id)), 'Rust 确认草稿')
    await wait(() => input()?.value === value, '草稿回显')
  }
  async function send(prompt, answer) {
    await wait(() => input() && !input().disabled && button('发送消息'), '可输入')
    await draft(prompt)
    await wait(() => !button('发送消息').disabled, '可发送')
    button('发送消息').click()
    await wait(() => contains(answer) && button('发送消息'), answer)
  }
  function select(title) {
    const item = [...document.querySelectorAll('nav[aria-label="会话列表"] button')].find(
      (element) => element.textContent.includes(title),
    )
    assert(item, `缺少会话 ${title}`)
    item.click()
  }
  async function reload(phase, fromPage = false) {
    await invoke('probe_phase', { phase })
    if (fromPage) window.location.reload()
    else await invoke('probe_reload')
  }
  try {
    const phase = await invoke('probe_phase', { phase: null })
    await wait(() => input() && !input().disabled, 'Rust 数据恢复')
    if (phase === 0) {
      await invoke('probe_menu_check')
      await draft('完整重载保留草稿')
      await reload(1)
    } else if (phase === 1) {
      assert(input().value === '完整重载保留草稿', 'Rust 重载后草稿丢失')
      const evidence = await invoke('probe_evidence')
      assert(evidence.connections === 1 && evidence.closes === 0, '空闲重载改变连接')
      assert(
        evidence.requests.filter((request) => request.name === 'LoginReq').length === 1,
        '空闲重载重复登录',
      )
      await draft('[e2e:slow]')
      await invoke('probe_arm', { phase: 2 })
      button('发送消息').click()
      await wait(() => false, '发送待确认时应发生实际重载')
    } else if (phase === 2) {
      await wait(() => contains('E2E 慢速完成') && button('发送消息'), '重载中的后台生成')
      assert(
        document.querySelectorAll('article[aria-label="用户消息"]').length === 1,
        '重载重复提交消息',
      )
      const evidence = await invoke('probe_evidence')
      assert(evidence.connections === 1 && evidence.closes === 0, '发送期间重载改变连接')
      assert(
        evidence.requests.filter((request) => request.name === 'MessageSendReq').length === 1,
        '发送期间重载重复命令',
      )
      await draft('JS reload 后继续保留')
      await reload(3, true)
    } else if (phase === 3) {
      assert(input().value === 'JS reload 后继续保留', 'location.reload 丢失草稿')
      await send('[e2e:history-set]', 'E2E 历史已保存')
      await send('[e2e:history-check]', 'E2E 历史通过')
      await send('[e2e:error]', '生成失败')
      button('重试').click()
      await wait(
        async () =>
          (await invoke('probe_evidence')).requests.filter(
            (request) => request.name === 'MessageSendReq',
          ).length === 5 &&
          button('重试') &&
          !button('重试').disabled,
        '失败原位重试',
      )
      assert(
        document.querySelectorAll('article[aria-label="用户消息"]').length === 4,
        '重试新增用户消息',
      )
      await draft('会话一草稿')
      button('新建会话').click()
      await wait(() => input()?.value === '' && !input().disabled, '新建会话')
      await draft('会话二草稿')
      select('[e2e:error]')
      await wait(() => input()?.value === '会话一草稿', '独立会话草稿')
      await reload(4)
    } else if (phase === 4) {
      assert(input().value === '会话一草稿', '重载未恢复选中会话及草稿')
      select('新的会话')
      await wait(() => input()?.value === '会话二草稿', '重载后的另一会话草稿')
      await draft('[e2e:stall]')
      button('发送消息').click()
      await wait(() => contains('E2E 等待') && button('停止'), '停止前运行状态')
      button('停止').click()
      await wait(() => contains('已停止') && button('发送消息'), 'Rust 取消命令')
      await draft('真实断线恢复草稿')
      const before = await invoke('probe_evidence')
      await invoke('probe_drop')
      await wait(async () => (await invoke('probe_evidence')).connections === 2, '真实断线后重连')
      await wait(
        () => input() && !input().disabled && button('发送消息') && !button('发送消息').disabled,
        '重连恢复界面',
      )
      assert(input().value === '真实断线恢复草稿', '真实断线丢失草稿')
      const after = await invoke('probe_evidence')
      assert(
        after.requests.filter((request) => request.name === 'MessageSendReq').length ===
          before.requests.filter((request) => request.name === 'MessageSendReq').length,
        '断线自动重放发送',
      )
      button('切换用户').click()
      await wait(() => document.querySelector('input[autocomplete="username"]'), '切换用户')
      const username = document.querySelector('input[autocomplete="username"]')
      username.value = `rust-other-${Date.now()}`
      username.dispatchEvent(new Event('input', { bubbles: true }))
      await wait(() => button('进入') && !button('进入').disabled, '新用户输入')
      button('进入').click()
      await wait(() => input() && !input().disabled, '新用户连接')
      assert(!contains('E2E 历史通过') && input().value === '', '旧用户数据污染新用户')
      const evidence = await invoke('probe_evidence')
      assert(evidence.connections === 3, '切换用户连接数错误')
      assert(
        evidence.requests.filter((request) => request.name === 'LoginReq').length === 3,
        '登录次数错误',
      )
      await invoke('probe_report', { report: { status: 'passed', phase, evidence } })
    }
  } catch (error) {
    await invoke('probe_report', { report: { status: 'failed', error: String(error) } })
  }
})()
