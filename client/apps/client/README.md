# Skynet Agent 客户端

按项目正式 Apple 设计规范实现的 Flutter 工作区。包含桌面、Dock、设置、空白 Chat、后台与双应用分屏，当前独立运行，不连接业务服务。
共享样式来自 `apple_ui`，基础控件使用 Cupertino；代码作为后续客户端接入业务的基础。

在仓库根目录执行：

```sh
make dev     # 启动 macOS 开发态 App
make client-check   # 格式、分析、UI 规范及测试
make client-e2e     # macOS 原生端到端
make client-build   # 构建 macOS Release App
```

使用项目 `.tools/flutter` SDK 和完整 Xcode；工具位置可通过根 makefile 中的变量覆盖。
Flutter 的依赖解析、检查、原生构建与集成测试按顺序运行，避免同时改写生成的插件工程。
`make dev` 使用当前客户端，`make build` 同时构建服务端。

顶部“返回桌面”“后台应用”用于统一导航。应用顶部把手左右拖动分屏，另一侧显示桌面；打开第二个应用填入该侧。
分隔条可调整比例并在三分之一、二分之一、三分之二附近吸附；拖到边缘全屏，松手前可拉回。
后台卡片可恢复、上滑关闭，点击空白返回桌面。窄窗口暂时显示活动应用，扩大后还原组合与比例。

快捷键：`Ctrl+Alt+Home` 返回桌面、`Ctrl+Alt+A` 查看后台、`⌘,` 打开设置。
Tab 移动焦点；布局把手使用左右方向键分屏、上键全屏；分隔条使用左右键微调和 Home 等分；后台卡片用 Enter 恢复、Delete／Backspace 关闭。
Escape 取消当前拖动或退出后台。

设置包含外观、壁纸和减少动态效果，本地保存偏好；启动回到桌面，不恢复后台应用。
系统外观、增强对比度和减少动效会自动同步。后台卡片是内容摘要，不是实时截图。

规范见 [Flutter Apple 设计规范](../../../docs/design/APPLE_FLUTTER_DESIGN.md)，操作与阶段说明见 [客户端运行时](../../../docs/architecture/CLIENT_RUNTIME.md)。
本轮原生交互、性能采样、截图与审查记录写入忽略的 `client/test-artifacts/macos-visual/`。
