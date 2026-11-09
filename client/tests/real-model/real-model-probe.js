/* global document, window, Event, setTimeout, fetch, AbortSignal */
// 同一组真实页面操作同时用于 Web 和独立 macOS App，不安装产品测试接口。
;(async () => {
  const invoke = window.__TAURI_INTERNALS__?.invoke.bind(window.__TAURI_INTERNALS__)
  const fixture = window.__AGENT_REAL_FIXTURE
  const stored = window.sessionStorage
  const key = 'skynet.realModelProbe'
  const progress = JSON.parse(stored.getItem(key) ?? '{"phase":0,"steps":[]}')
  const assert = (condition, description) => {
    if (!condition) throw new Error(description)
  }
  const input = () => document.querySelector('textarea[aria-label="给 Agent 发送消息"]')
  const button = (name) =>
    [...document.querySelectorAll('button')].find(
      (element) =>
        element.getAttribute('aria-label')?.startsWith(name) || element.textContent.trim() === name,
    )
  const cards = () => [...document.querySelectorAll('.tool-call')]
  const tools = () =>
    cards().map((card) => ({
      name: card.querySelector('.tool-call__label')?.textContent.trim(),
      summary: card.querySelector('summary')?.textContent.trim(),
      input: card.querySelector('[aria-label="调用内容"]')?.textContent.trim(),
      output: card.querySelector('[aria-label="工具输出"]')?.textContent.trim(),
      scope: card.querySelector('.tool-call__scope')?.textContent.trim(),
      reason: card.querySelector('.tool-call__reason')?.textContent.trim(),
    }))
  async function wait(check, description, timeout = 180000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const error = document.querySelector('.message--assistant:last-child .message__header')
      if (error?.textContent.includes('生成失败')) throw new Error(`模型生成失败：${description}`)
      if (await check()) return
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
    throw new Error(`等待超时：${description}`)
  }
  async function draft(value) {
    await wait(() => input() && !input().disabled, '输入框可用')
    const callbacks = window.__TAURI_INTERNALS__?.callbacks
    const baseline = callbacks && new Set(callbacks.keys())
    input().value = value
    input().dispatchEvent(new Event('input', { bubbles: true }))
    await wait(() => input()?.value === value, '输入内容回显')
    if (invoke) {
      // Rust 输入经 IPC 确认后才能提交，重载草稿同样需要等待本轮回调结束。
      await wait(() => [...callbacks.keys()].every((id) => baseline.has(id)), '原生草稿确认')
    }
  }
  async function chooseModel(name) {
    await wait(() => button('切换会话模型') && !button('切换会话模型').disabled, '模型菜单可用')
    button('切换会话模型').click()
    await wait(
      () =>
        [...document.querySelectorAll('[role="option"]')].some((item) =>
          item.textContent.includes(name),
        ),
      '模型选项',
    )
    const option = [...document.querySelectorAll('[role="option"]')].find((item) =>
      item.textContent.includes(name),
    )
    option.click()
    await wait(() => button('切换会话模型')?.textContent.includes(name), '模型切换确认')
  }
  async function begin(prompt) {
    const count = document.querySelectorAll('.message--assistant').length
    await draft(prompt)
    await wait(() => button('发送消息') && !button('发送消息').disabled, '发送按钮可用')
    button('发送消息').click()
    await wait(
      () => document.querySelectorAll('.message--assistant').length > count,
      '服务端接收新消息',
    )
  }
  async function complete(prompt) {
    await begin(prompt)
    await wait(() => button('发送消息') && !button('停止'), '真实模型完成任务')
  }
  async function prepareProjectInstructions(stage) {
    const response = await fetch(fixture.projectInstructionsUrl + stage, {
      method: 'POST',
      credentials: 'omit',
      signal: AbortSignal.timeout(10000),
    })
    assert(response.ok, `宿主准备项目规则失败：${stage} (${response.status})`)
  }
  function save(step, phase) {
    progress.steps.push({ step, tools: tools() })
    progress.phase = phase
    stored.setItem(key, JSON.stringify(progress))
  }
  async function report(value) {
    const result = { ...value, steps: progress.steps, tools: tools() }
    window.__AGENT_REAL_RESULT = result
    if (invoke) await invoke('probe_report', { report: result })
  }
  try {
    assert(fixture?.token, '缺少真实模型验收夹具')
    if (!stored.getItem(key)) window.localStorage.setItem('skynet.username', fixture.username)
    await wait(() => input() && !input().disabled, '真实网关登录完成', 30000)
    const token = fixture.token
    if (progress.phase === 0) {
      await draft('首次发送前的本地草稿')
      button('新建会话').click()
      await wait(() => input()?.value === '首次发送前的本地草稿', '返回本地草稿')
      await chooseModel('DeepSeek Pro')
      await chooseModel('DeepSeek Flash')
      assert(
        document.querySelectorAll('nav[aria-label="会话列表"] button').length === 0,
        '首次发送前出现了服务端会话',
      )
      progress.steps.push({ step: 'local-draft-and-model-before-first-chat', tools: [] })
      await complete(
        `请在当前会话目录实际完成文件编辑验收：先使用 apply_patch 创建 note.txt，内容为 initial:${token} 加一个换行；` +
          `再使用 apply_patch 把内容改为 updated:${token} 加一个换行，并移动到 result.txt。` +
          '最后调用 exec_command 用 cat 读取 result.txt，确认 note.txt 已不存在。请按顺序实际调用工具，不要只给操作说明。',
      )
      assert(
        tools().some((tool) => tool.name === '文件修改' && tool.summary.includes('已完成')),
        '页面没有成功的补丁记录',
      )
      assert(
        tools().some((tool) => tool.name === 'Bash' && tool.output?.includes(`updated:${token}`)),
        '页面没有真实 Bash 读取结果',
      )
      assert(
        document.querySelectorAll('nav[aria-label="会话列表"] button').length === 1,
        '首次发送没有形成唯一正式会话',
      )
      await draft('重载后应保留这条草稿')
      save('patch-and-bash', 1)
      window.location.reload()
      return
    }
    if (progress.phase === 1) {
      if (invoke) assert(input().value === '重载后应保留这条草稿', '原生重载丢失草稿')
      assert(
        tools().some((tool) => tool.output?.includes(`updated:${token}`)),
        '重载丢失工具结果',
      )
      await complete(
        `这是隔离临时夹具的沙盒边界验收，目标文件 ${fixture.outsideFile} 由本次测试创建，允许测试写入。` +
          `请先用 exec_command、sandbox_permissions=use_default 执行 printf 'sandbox-attempt' > '${fixture.outsideFile}'，` +
          '预期操作系统沙盒拒绝；不要绕过这一步或用其他命令替代。' +
          `随后本人明确授权仅对这个临时文件进行沙盒外写入：以 require_escalated 和说明原因执行 printf 'outside:${token}' > '${fixture.outsideFile}'。` +
          '不要修改其他目录或文件，也不要重试第一次沙盒写入。',
      )
      const boundary = tools().filter((tool) => tool.input?.includes(fixture.outsideFile))
      assert(
        boundary.some(
          (tool) =>
            tool.scope.includes('会话沙盒') &&
            /Operation not permitted|Permission denied/i.test(tool.output ?? ''),
        ),
        '没有观测到操作系统沙盒拒绝',
      )
      assert(
        boundary.some(
          (tool) => tool.scope.includes('沙盒外执行') && tool.scope.includes('退出码 0'),
        ),
        '明确授权的沙盒外命令未成功',
      )
      await complete(
        `请用 exec_command 执行 curl -fsS '${fixture.networkUrl}' 验证默认沙盒联网。该地址是本次验收启动的本地 HTTP 夹具，无需任何凭据。`,
      )
      assert(
        tools().some((tool) => tool.output?.includes(`network:${token}`)),
        '默认联网没有真实工具输出',
      )
      save('sandbox-outside-and-network', 2)
    }
    if (progress.phase === 2) {
      await chooseModel('DeepSeek Pro')
      await complete(
        `请用 exec_command 执行 printf '${token}' > model-pro.txt，验证当前模型的工具调用。`,
      )
      assert(
        cards().some((card) =>
          card.querySelector('.thinking-block[data-model-id="deepseek-v4-pro"]'),
        ),
        '权限模型没有跟随切换到 Pro',
      )
      await chooseModel('DeepSeek Flash')
      await complete(
        '请用 exec_command 启动一个交互终端，参数 tty=true、yield_time_ms=20、timeout_ms=180000，' +
          '命令为 read -r value; printf "%s" "$value" > pty.txt; printf "received:%s\\n" "$value"。' +
          '本轮只启动并保留会话，等我下一轮提供输入；不要调用 write_stdin，也不要轮询等待输入。',
      )
      assert(
        tools().some(
          (tool) => tool.input?.includes('read -r value') && tool.summary.includes('正在执行'),
        ),
        '没有保留交互进程',
      )
      await chooseModel('DeepSeek Pro')
      await begin(
        `请使用 write_stdin 向刚才的交互终端输入 ${token} 并加一个换行，读取输出直到该进程退出。`,
      )
      await wait(
        () =>
          document.querySelector(
            '.thinking-block[data-model-id="deepseek-v4-pro"][data-status="streaming"]',
          ),
        'Pro 真实思考流开始',
      )
      await chooseModel('DeepSeek Flash')
      await wait(() => button('发送消息') && !button('停止'), '切换期间的请求完成')
      assert(
        tools().some(
          (tool) => tool.name === '终端交互' && tool.output?.includes(`received:${token}`),
        ),
        '跨轮次 PTY 交互没有回显',
      )
      save('pty-across-turns', 3)
    }
    if (progress.phase === 3) {
      await begin(
        '请用 exec_command 在当前会话目录启动可取消的延迟任务，yield_time_ms=30000、timeout_ms=300000：' +
          'echo "$$" > cancel.pid; printf "cancel-ready\\n"; sleep 240; printf unexpected > cancel-completed.txt。' +
          '我会通过界面的停止按钮取消它；不要改写或立即终止这个命令。',
      )
      await wait(
        () =>
          tools().some(
            (tool) => tool.output?.includes('cancel-ready') && tool.summary.includes('正在执行'),
          ),
        '延迟进程开始执行',
      )
      save('running-before-reload', 4)
      window.location.reload()
      return
    }
    if (progress.phase === 4) {
      await wait(
        () =>
          tools().some(
            (tool) => tool.output?.includes('cancel-ready') && tool.summary.includes('正在执行'),
          ),
        '重载恢复正在执行的工具',
      )
      await wait(() => button('停止') && !button('停止').disabled, '停止按钮可用')
      button('停止').click()
      await wait(() => button('发送消息') && !button('停止'), '取消后输入恢复')
      await wait(
        () =>
          tools().some(
            (tool) => tool.input?.includes('cancel.pid') && tool.summary.includes('已停止'),
          ),
        '工具显示停止状态',
      )
      await complete(
        `请仅用一次 exec_command 原样执行：printf '${token}' > resumed.txt && cat resumed.txt。` +
          '不要追加其他命令或检查；本轮只验证取消后工具调用能正常完成。',
      )
      assert(
        tools().some(
          (tool) => tool.input?.includes('resumed.txt') && tool.scope.includes('退出码 0'),
        ),
        '取消后工具没有恢复',
      )
      const mainThinking = [
        ...document.querySelectorAll('.message--assistant > .message__body > .thinking-state'),
      ]
      assert(
        mainThinking.some((item) => item.querySelector('[data-model-id="deepseek-flash"]')),
        '缺少 Flash 主模型思考',
      )
      assert(
        cards().some((card) => card.querySelector('.thinking-block')),
        '缺少权限模型思考',
      )
      await complete(
        '这是工具调用次数验收，请按顺序调用 40 次独立的 exec_command，' +
          '第 N 次执行 printf "%s\\n" N >> steps.txt，N 从 1 到 40。每次调用只追加自己的数字。' +
          '不要使用 for/while、合并 shell 命令或 apply_patch 代替这 40 次独立调用。可以在一次模型响应中返回多条工具调用。' +
          '全部完成后再读 steps.txt 验证顺序与行数，仅简短报告结果。',
      )
      assert(
        tools().filter(
          (tool) => tool.input?.includes('steps.txt') && tool.input?.includes('printf'),
        ).length >= 40,
        '实际工具调用没有超过原 32 次上限',
      )
      for (const card of cards()) card.open = true
      assert(document.querySelector('[aria-label="工具输出"]'), '页面未展示工具输出')
      for (const toggle of document.querySelectorAll('.thinking-header')) {
        if (toggle.getAttribute('aria-expanded') === 'false') toggle.click()
      }
      assert(document.querySelector('[aria-label="思考内容"]'), '思考内容未展示')
      save('models-reasoning-unlimited-and-cancel', 5)
    }
    if (progress.phase === 5) {
      await prepareProjectInstructions('initial')
      const firstStart = cards().length
      await complete(
        `请依据已提供的项目规则直接创建试验成果 root-first.txt，内容为 root-initial:${token} 加一个换行。` +
          '不要再读取规则文件；仅创建并读取成果确认内容。',
      )
      const firstTools = tools().slice(firstStart)
      assert(
        firstTools.every((tool) => !/AGENTS(?:\.override)?\.md/i.test(tool.input ?? '')),
        '根规则任务自行读取了规则，无法验证宿主自动加载',
      )
      assert(
        firstTools.some(
          (tool) => tool.name === 'Bash' && tool.output?.includes(`root-initial:${token}`),
        ),
        '根项目规则任务缺少真实文件读取结果',
      )
      save('project-instructions-initial', 6)
    }
    if (progress.phase === 6) {
      await prepareProjectInstructions('updated')
      const updatedStart = cards().length
      await complete(
        `请依据已提供的项目规则直接创建试验成果 root-updated.txt，内容为 root-updated:${token} 加一个换行。` +
          '不要再读取规则文件；仅创建并读取成果确认内容。',
      )
      const updatedTools = tools().slice(updatedStart)
      assert(
        updatedTools.every((tool) => !/AGENTS(?:\.override)?\.md/i.test(tool.input ?? '')),
        '更新根规则后自行读取了规则，无法验证宿主自动刷新',
      )
      assert(
        updatedTools.some(
          (tool) => tool.name === 'Bash' && tool.output?.includes(`root-updated:${token}`),
        ),
        '更新根项目规则后缺少真实文件读取结果',
      )
      save('project-instructions-updated', 7)
    }
    if (progress.phase === 7) {
      const childStart = cards().length
      await complete(
        `请在 prompt-child/ 内实际创建试验成果 child.txt，正文为 child-body:${token} 加一个换行。` +
          '执行前先使用工具查找并读取该目录适用的 AGENTS.md，按其中的规则完成文件，再读取成果确认。',
      )
      const childTools = tools().slice(childStart)
      assert(
        childTools.some(
          (tool) =>
            tool.name === 'Bash' &&
            tool.input?.includes('AGENTS.md') &&
            tool.output?.includes(`child-rule:${token}`),
        ),
        '没有通过真实工具读取子目录规则',
      )
      assert(
        childTools.some(
          (tool) =>
            tool.name === 'Bash' &&
            tool.output?.includes(`child-rule:${token}`) &&
            tool.output?.includes(`child-body:${token}`),
        ),
        '子目录规则没有落实到真实成果读取结果',
      )
      save('project-instructions-child', 8)
      await report({ status: 'passed', phase: progress.phase })
    }
  } catch (error) {
    await report({
      status: 'failed',
      phase: progress.phase,
      error: String(error),
      page: document.body?.textContent.slice(-16000),
    })
  }
})()
