# macOS UI 预览与验收

现有 Demo 展示共享 Apple 风格组件、交互状态和用法，作为可选预览与验收工具。
统一规则查询 [Flutter Apple 设计规范](APPLE_FLUTTER_DESIGN.md)，实际规格由 `apple_ui` 提供；
业务开发无需登记画廊或同步新增示例。Demo 独立运行，不连接正式客户端运行时或业务服务。

## 运行

需要项目 `.tools/flutter` SDK、完整 Xcode 和 macOS 开发工具。命令使用项目 SDK；可通过 `FLUTTER`、`DART`、`XCODE_DEVELOPER_DIR` 覆盖工具位置。

```sh
make gallery-dev       # macOS 开发态画廊
make client-check     # 格式、分析、UI 规范检查和组件测试
make gallery-e2e       # macOS 原生集成测试
make gallery-build     # macOS Release 构建
```

`make check` 包含画廊基础检查，`make check-full` 包含画廊原生测试。

## 内容与操作

左侧搜索和目录包含设计基础、按钮、输入、选择、导航、菜单、对话框与反馈。
右侧可切换交互预览及用法说明，提供代码片段和复制入口。

外观支持跟随系统、浅色和深色；展示控制支持桌面／触控密度、自适应／手机／平板宽度、文字缩放、启用状态、增强对比度与减少动效。
宽度为预览上限，空间不足时收缩；它不会模拟真实移动设备。
重置会恢复示例状态与展示控制，不修改系统设置。偏好仅在本次运行保留。

快捷键：`⌘F` 搜索组件，`⇧⌘R` 重置示例；Tab 移动焦点，菜单使用方向键、Enter 和 Escape。
窄窗口通过顶部目录按钮访问组件，分隔条可以拖动或用左右方向键调整、Home 恢复默认。

## 结构与扩展

`client/packages/apple_ui` 提供主题、图标映射和必要的公共组件；`client/apps/component_gallery` 维护已有示例与展示状态。
新增可复用用法先补统一规范；公共样式和行为放入共享包，官方组件满足需求时直接使用。
按实际验收需要维护示例，不把 Demo 作为业务开发的前置依赖。
`client/tool/check_ui_rules.dart` 检查颜色、文字和图标定义位置；规则测试验证前缀、别名和示例字符串等边界。

项目 MCP 与插件在 `.codex/config.toml` 启用；Flutter 技能在 `.agents/skills/`。新安装能力在后续会话加载。
MCP 运行时使用项目 SDK。客户端未自动提供项目目录时，先用 Dart MCP 的 `roots` 工具登记仓库目录；
连接成功不等于测试工具已经获得项目范围。运行检查产生的报告仍写入仓库的 `client/test-artifacts/`。

## 验收

自动测试覆盖正常流程、表单错误与修复、下拉选择及选中态、四类状态反馈、菜单键盘、弹层取消、文字放大和窄窗口。
原生集成测试与人工 AX／VoiceOver 检查分开进程，避免辅助功能检查干扰测试生命周期。
人工验证系统菜单、快捷键、窗口、右键、中文输入法、屏幕阅读器与实际视觉；框架文字注入不能替代输入法候选验证。

验收记录和截图写入 `client/test-artifacts/component-gallery/`，不提交。
构建产物位于画廊工程的 `build/macos/Build/Products/Release/Apple UI Gallery.app`。
