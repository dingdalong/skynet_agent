# 工作区与界面验收

[返回经验索引](../../LESSONS.md)

<a id="l-036"></a>

### L-036 切换外观后检查实际主题和控件配色

跟随系统时，同一偏好在不同系统外观下会得到不同结果。分别核对宿主、子应用、表单控件和禁用态的前景与背景。 [CLIENT_DESIGN.md](../../docs/design/CLIENT_DESIGN.md)、[WebViewTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/WebViewTests.swift)

Verified · Seen: 1× (2026-11-06)

<a id="l-051"></a>

### L-051 有限动效的终态与过渡帧分别验收

控件已启用、布局已提交时，颜色和矩形仍可能在变化。先等实际过渡结束再量终态，验证中断或反向接管时则单独取受控中间帧。11 月 8 日读到中间色，10 日将 900px 面板量成约 887px，12 日分屏几何断言读到过渡位置。旧证据可查 `git show 8986035:LESSONS.md` 的 L-051、L-079。 [WorkspaceScene.swift](../../client/apps/host/macos/SkynetHost-macOS/WorkspaceScene.swift)、[workspace-presentation.test.ts](../../client/tooling/workspace-presentation.test.ts)

Promoted · Seen: 3× (2026-11-08, 2026-11-10, 2026-11-12)

<a id="l-077"></a>

### L-077 验证分屏时把桌面作为一个正式区域

从当前应用形成“应用＋桌面”，再从该桌面打开第二个应用。覆盖两侧吸附、越过确认距离收起、拉回撤销及从后台恢复。 [CLIENT_DESIGN.md](../../docs/design/CLIENT_DESIGN.md)、[geometry.test.ts](../../client/tooling/geometry.test.ts)、[workspace-gestures.test.ts](../../client/tooling/workspace-gestures.test.ts)

Verified · Seen: 2× (2026-11-12, 2026-11-13)

<a id="l-091"></a>

### L-091 验收原生工作区动画时同时看成像和同流程采样

辅助功能树可见时，合成层仍可能透明。用实际窗口确认过渡有画面，按相同操作比较采样开销，记录中断与减少动态效果时的终态。 [WorkspaceScene.swift](../../client/apps/host/macos/SkynetHost-macOS/WorkspaceScene.swift)、[CLIENT_DESIGN.md](../../docs/design/CLIENT_DESIGN.md)

Verified · Seen: 1× (2026-11-13)

<a id="l-092"></a>

### L-092 共享 shadcn 组件目录要纳入 Tailwind 扫描

组件存在而样式缺失时，先检查共享 CSS 的 `@source`。用随包 WebView 核对按钮的实际布局和样式。 [styles.css](../../client/packages/ui/src/styles.css)、[WebViewTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/WebViewTests.swift)

Verified · Seen: 1× (2026-11-13)

<a id="l-109"></a>

### L-109 宽度重排和高度不足分别验收

横向断点只解决列布局。明确安全区、键盘剩余高度和滚动区域，在矮窗口、分屏和键盘展开时核对输入与发送是否可达。 [CLIENT_DESIGN.md](../../docs/design/CLIENT_DESIGN.md)、[styles.css](../../client/builtins/agent/src/styles.css)

Verified · Seen: 1× (2026-11-14)

<a id="l-114"></a>

### L-114 左右面板和手势命中使用同一容器的几何

显式计算两侧矩形和分隔区域。折叠侧宽度归零，拖动以同一坐标系换算，覆盖窄宽与吸附端点。 [geometry.ts](../../client/packages/workspace/src/geometry.ts)、[geometry.test.ts](../../client/tooling/geometry.test.ts)

Verified · Seen: 1× (2026-11-14)

<a id="l-115"></a>

### L-115 手势松开时提交最后一次已接受的预览

最后一次 move 与松手可能落在同一次渲染之前。同步保存预览并用同一份状态绘制、提交和撤销，覆盖没有下一次渲染的释放。 [workspace-gestures.test.ts](../../client/tooling/workspace-gestures.test.ts)、[Workspace.tsx](../../client/packages/workspace/src/Workspace.tsx)

Verified · Seen: 1× (2026-11-14)
