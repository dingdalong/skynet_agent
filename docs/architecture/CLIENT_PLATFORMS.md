# 客户端平台接入

客户端保留 RN 宿主，遵循统一的 shadcn 视觉规范。普通业务复用共享代码，系统能力通过平台适配接入。
平台支持以实际原生构建和体验验收为准；依赖图打包、公共内核测试不等于完整客户端支持。

## 共享边界

| 目录 | 职责 |
| --- | --- |
| `client/packages/workspace` | RN 桌面、Dock、后台、分屏、几何预览与公共交互 |
| `client/packages/host-bridge` | 与 UI 框架无关的通信接口、快照缓存、订阅租约 |
| `client/packages/contracts` | 命令、快照、能力与子应用协作契约 |
| `client/native/core` | 不依赖 RN、Swift 或系统 API 的 C++ 状态规则，提供 C ABI |
| `client/native/apple` | 已实现的 macOS 资源所有者、Actor、进程与 WebKit 适配 |
| `client/apps/host` | 平台启动、RN 接线、原生视图绑定和系统窗口 |
| `client/builtins` | React/shadcn 表现与同步 TypeScript 子应用业务 |

公共工作区不得直接使用 NativeModules、原生组件注册名、SF Symbols 名称或平台私有 View 属性。
宿主入口注入应用容器、语义图标、壁纸、场景动画、图标反馈和通信适配。
子应用 SDK 使用宿主注入的 `__skynetTransport`，不依赖 WKWebView 全局接口；
当前苹果适配在文档启动前绑定 WK 消息处理器，其他平台接入相同传输契约。
分屏几何预览使用共享 TypeScript，最终命令由 C++ 状态机验证；没有第二套 Swift 状态机。

C++ 核心当前只迁入工作区状态转换。原生 HostCore 仍持有连接、任务、存储和进程；
这些资源不随 React/WebView 重载、退订而释放。后续按实际平台需要逐步迁移通用管理规则，
不为了复用把资源放入可重载的 RN JS 运行时。

## 支持与验证等级

| 平台 | 入口/维护方 | 接入状态 |
| --- | --- | --- |
| macOS | Microsoft React Native macOS | 已有原生工程；本机 ad-hoc App |
| iOS / iPadOS | Meta React Native | 待接入；共享界面依赖图可独立验证 |
| Android | Meta React Native | 待接入；共享界面依赖图可独立验证 |
| Windows | Microsoft React Native Windows | 待接入；版本组合及 Windows 原生构建未验证 |
| Linux | 未选定 | 阻塞；公共 C++ 编译测试不能替代 RN 宿主验证 |
| Web | 计划 React Native Web | 待接入；浏览器传输、资源与生命周期未实现 |

运行 `make client-platforms` 查询构建入口的真实支持状态，`make client-doctor` 查询锁定版本。
构建入口在依赖安装、子应用构建及启动界面前拒绝未知、待接入或错误构建环境的目标。
不得将其他平台请求自动回退到 macOS，不为未接入平台生成假包或空适配器。

## 版本与 Linux 调研边界

项目锁定当前已验证的 RN / RN macOS 组合，不因提取公共层升级所有平台依赖。
新增平台先确定受支持版本组合，验证 Codegen、Fabric、原生桥及 Web 容器，再锁定依赖。
各平台具有独立发布节奏，RN minor 相同不代表原生模块或所有补丁版本自动兼容。

Linux 候选 `react-native-skia/react-native-skia` 的项目文档将自身标记为 proof of concept，
并只声明 Ubuntu 18 支持，不能作为当前项目生产接入已成立的证据。
它也不是用于 RN 内绘图的 `@shopify/react-native-skia` 组件库。
当前不改用其他 UI 技术冒充 Linux RN 支持；Linux 原生窗口、输入、Web 容器和合成动画仍待验证。

依据核对日期：2026-11-13。

- [RN 平台实现](https://reactnative.dev/docs/out-of-tree-platforms)
- [RN 跨平台 C++ 模块](https://reactnative.dev/docs/0.83/the-new-architecture/pure-cxx-modules)
- [RN Windows 版本策略](https://microsoft.github.io/react-native-windows/docs/0.83/releases/)
- [RN Windows 支持周期](https://microsoft.github.io/react-native-windows/support/)
- [Linux 候选的项目状态与构建说明](https://github.com/react-native-skia/react-native-skia)

## 验证与构建

`pnpm --dir client run probe:platforms` 分别用标准 RN 打包共享工作区的 iOS、Android 依赖图，
不注入假的原生实现，不生成安装包。产物写入忽略的 `client/test-artifacts/platform-probes`。
`make client-core-test` 使用 CMake/CTest 独立验证公共 C++ 内核和 C ABI。
CI 的 `client-core.yml` 提供 macOS、Linux、Windows 编译测试矩阵；未实际运行的 CI 不计作验证。

完整客户端使用 `make client-build PLATFORM=macos`，开发入口为 `make client-dev PLATFORM=macos`。
其他平台完成宿主与资源适配、构建及实际验收后，才登记为 supported。
本机入口封装平台工具链；未来全平台发布由各操作系统构建执行器汇总产物，
不承诺一台 macOS 主机原生构建所有桌面平台。

## 能力与体验

原生快照声明真实能力。当前 macOS 支持分屏、动态开发包安装、独立业务进程，
但开发执行器尚未接入，因此 localDevelopment 为 false。平台能力来自可信宿主，不由子应用自报。
手机与 Web 以远程开发为目标；桌面与服务器拥有实际工作目录。
现有服务端路由保留，Windows 执行目标和路径支持在执行器接入阶段补齐。

共享同一导航语义，按宽度、安全区和输入方式重排布局。平台动画实现共享参数和最终状态语义。
验收使用 Release 包、实际交互、辅助功能和减少动态效果，并采集性能数据；
公共测试与平台清单不是视觉流畅度证据。
