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
| `client/native/apple` | 苹果平台资源所有者与 Actor，macOS 进程及 iOS 内置 VM 适配 |
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
| iOS / iPadOS | Meta React Native | iPhone/iPad 模拟器；UIKit、WebKit、业务 VM 已接入，真机未验收 |
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

依据核对日期：2026-11-14。

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

### iPhone 与 iPad

`make install PLATFORM=ios` 安装锁定的依赖并生成 iOS 工程。
`make client-dev PLATFORM=ios` 构建并启动模拟器；`SKYNET_IOS_DEVICE` 可指定设备名称或 UDID。
`make client-build PLATFORM=ios` 生成 `client/dist/ios-simulator/Skynet Agent.app`，
同一包支持 iPhone 与 iPad。`make client-test PLATFORM=ios` 运行当前模拟器的原生集成测试。
实际交互使用 Computer Use 验收。

`make client-archive PLATFORM=ios` 生成 `client/dist/ios/Skynet Agent.xcarchive`；
默认未签名。配置 `SKYNET_APPLE_TEAM` 后使用本机已有开发团队与签名配置，
不自动创建证书、下载描述文件或上传。真机安装、TestFlight 和 App Store 分发需团队签名及单独验收。
最低系统版本为 iOS/iPadOS 16.4，与共享 Tailwind 4 的 Safari 基线一致；
不能仅使用 RN 本身的最低系统要求。当前实测运行时见任务验收记录，最低版本兼容性未单独验收。
样式依据：[Tailwind 浏览器兼容性](https://tailwindcss.com/docs/compatibility)。

UIKit Scene 持有 HostCore；安全区和键盘剩余高度由原生根容器提供。
iPhone 窄屏显示单应用，iPad 宽屏支持内部双应用分屏，按实际内容宽度决定布局。
系统多窗口尚未开放，内部多应用与 iPad 系统窗口是不同层级。

移动端只运行随 App 交付的可信内置应用，各自使用独立 JavaScriptCore VM 和串行队列。
能力明确为 `in-process`；没有 macOS 的进程、内存配额及强制终止保证。
计算超时会撤销权限并拒绝重开该应用，需重新启动客户端。
系统后台时保存已提交状态、关闭 VM 和连接；前台重新登录并恢复服务器快照，不重放有副作用任务。
内部切换应用则保留业务和连接。

移动端用于发送远程指令，不注册桌面执行器、不授权本地开发目录、不安装动态 `.skapp`。
现有桌面项目须先在其所属桌面建立并开启远程控制；手机恢复该会话后继续发送指令。
服务器目录任务直接在服务器执行。真机连接开发机时填写可达服务器地址，不能使用手机自身的回环地址。

### App Store 发行边界

首轮 iOS 实现只交付内置功能，不把 macOS 的动态安装或 shell 执行能力搬到手机。
若以后需要在线分发新的内部应用，必须单独评估 Apple 的 2.5.2、4.7 及原生 API 暴露规则，
不能把解释器或 WebView 当作自动获得动态代码分发许可。
桌面/Dock 是本应用内的工作区，不能替换系统主屏幕或拦截系统手势。
2.5.8 还限制替代桌面/主屏幕环境；“仅在应用内”不等于已确认满足这一条款，
发行前需结合最终交互、功能说明与审查结果确认，当前布局不作通过审核的保证。
原生后台只申请完成状态收尾所需的短时间，不声明无限后台运行。
模拟器通过不代表审核通过；发行前还需真实设备、签名、隐私披露、正式认证与审查资料。
当前按用户名识别用户的开发网关不作为公开互联网认证方案。

依据：[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)、
[UIKit 后台执行](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time)。

## 能力与体验

原生快照声明真实能力。当前 macOS 支持分屏、动态开发包安装、独立业务进程，
已接入本地项目执行器，因此 localDevelopment 为 true。平台能力来自可信宿主，不由子应用自报。
手机与 Web 以远程开发为目标；桌面与服务器拥有实际工作目录。
现有服务端路由保留，Windows 执行目标和路径支持在执行器接入阶段补齐。

共享同一导航语义，按宽度、安全区和输入方式重排布局。平台动画实现共享参数和最终状态语义。
验收使用 Release 包、实际交互、辅助功能和减少动态效果，并采集性能数据；
公共测试与平台清单不是视觉流畅度证据。
