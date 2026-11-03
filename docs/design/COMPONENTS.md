# 组件规范

## 准入规则

每个进入 `@skynet/design-system` 的组件必须包含：

- 视觉参照和适用的平台规范来源；
- 组件解剖、尺寸和间距；
- default、hover、focus、active、disabled、loading 状态中适用的部分；
- 键盘、触摸、屏幕阅读器和减少动效要求；
- Storybook 状态样例与基础测试；
- 只使用语义或组件 Token，不写原始视觉值。

状态优先级依次为 disabled、loading、active、focus、hover、default。

## Button

默认高度 40px，紧凑尺寸 32px，大尺寸 48px。主要按钮使用反转的中性实色；次要按钮使用中性表面和细阴影；
仅图标操作使用 IconButton，并提供 `aria-label`。IconButton 的 `primary`、`bordered`、`quiet`
分别表达主操作、次操作和工具栏操作；选中状态继续使用中性表面。

焦点环至少 2px，与相邻颜色保持 3:1 对比度。加载时保留原标签宽度，使用 `aria-busy`，
防止布局跳动。

## TextField

标签必须可见，不能只用 placeholder。错误信息位于字段下方，通过 `aria-describedby` 关联，
并将字段标记为 `aria-invalid`。焦点状态和错误状态不能互相覆盖。

## StatusBadge

运行中、成功、警告和失败必须同时使用文字与图形语义。Badge 不能被单独点击；需要操作时使用
Button。

## Sidebar

桌面会话栏由共享布局 Token 决定，选中项使用表面和文字权重表达位置，不能只靠颜色。项目较多时保持单一
滚动区域，顶部新建操作始终可达。

## Message

Agent 与用户消息通过对齐、标签和层级共同区分。正文最大宽度约 72 个字符。流式输出时使用
`aria-live="polite"` 的区域播报完整句子，不逐 token 打断屏幕阅读器。

## Composer

桌面输入区最小高度 56px，移动端不小于 48px。发送按钮在空白输入时禁用；Enter 发送，
Shift+Enter 换行；输入法组合期间禁止提交。失败后保留原文和焦点。

## EmptyState 与 ErrorState

空状态说明当前没有会话，并提供一个新建入口。错误状态必须说明发生了什么、内容是否保留，
并提供重试入口；禁止只显示“出错了”。

错误重试必须使用服务端事件携带的可重试标记，并从对应的最后一条用户消息恢复原文。重试
产生新的请求标识，不能复用已经失败的请求。

## 条件区域与布局

可选提示、工具栏和状态区域必须在未渲染时完全退出布局。使用 CSS Grid 时，优先把每行定义
为 `auto` 或使用具名区域；不能让隐藏组件的空占位改变输入区、消息区和底栏的位置。

## Toast

Toast 不主动抢焦点，使用 `role="status"` 或 `aria-live="polite"`。自动消失时间为 3 至 5 秒，
错误和等待授权的消息不能自动消失。

## 远程组件源码

聊天界面使用 Beautiful UI Vue 的 `ChatPage`、`PromptBar`、`SidebarNav` 和 `LoadingState`，
按托管清单的 `suggestedFileName` 保存到业务组件目录。来源技能为 `/agent/SKILL.md`，清单为
`/agent/component-registry.json`；部署在子路径时，先加上服务声明的基路径再解析 `sourceUrl`。
这些组件以源码分发，更新时重新核对清单、完整导入链及共享样式，不安装组件包。

页面接入现有聊天状态，输入框通过 `v-model` 绑定会话草稿，以 `send`、`stop` 事件发起操作；
只有状态层受理发送后才清空草稿。导航通过 `create`、`select` 事件操作真实会话。
等待指示只展示真实等待状态，计时文本不参与重复的屏幕阅读器播报。

共享颜色、阴影和操作层级通过项目 Token 提供，字体使用本地 Inter、JetBrains Mono，图标使用 Lucide。源码中的演示输入、模拟回复、
任务、图表、审批及外部服务菜单不进入业务页面。Storybook 使用同一页面和隔离的 Mock 传输，
用于展示组件状态，不连接真实网关。
