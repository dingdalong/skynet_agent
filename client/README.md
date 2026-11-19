# Skynet 客户端

Astryx 工作区在宿主 WebView 中运行，每个子应用由独立 WebView 呈现。
macOS 每应用独立 JavaScriptCore 进程；iOS 内置应用使用各自的 VM 与串行队列。
两端均通过原生 HostCore 使用存储、连接和动作，界面重载不释放原生资源。
Node.js 只用于开发构建，不随 App 分发。

```text
apps/host/          macOS/iOS 入口、原生视图与平台接线
native/apple/      苹果平台资源、Actor 与生命周期
native/core/       平台无关工作区状态规则
builtins/          设置、应用中心与 Agent 对话，各自包含 manifest、runtime 与 view
packages/contracts 消息、清单和状态契约
packages/app-sdk   Web 表现桥接、快照订阅、Astryx 主题与错误界面
packages/app-runtime 同步 Actor 定义
packages/agent-client 二进制协议、会话、流式任务和恢复规则
packages/tokens    单一令牌源与生成主题
tooling/           构建、打包、架构检查、原生验收与应用模板
```

在项目根目录运行 `make install`、`make dev` 和 `make client-check`。
界面验收使用 Computer Use 操作最新本地 App；`make check-full` 运行自动化回归。
`make client-build` 的产物位于 `client/dist/macos/Skynet Agent.app`，当前为本机架构和本地签名；
公证、发布签名另行接入。

使用 `make install PLATFORM=ios` 安装 iOS 工程依赖，`make client-dev PLATFORM=ios`
运行 iPhone 模拟器；可用 `SKYNET_IOS_DEVICE` 指定 iPad 的名称或 UDID。
`make client-build PLATFORM=ios` 生成通用模拟器包，
`make client-archive PLATFORM=ios` 生成默认未签名的真机归档。
移动端仅运行随包内置应用，远程发送开发指令，不安装动态包或执行手机本地工具。
构建、能力与 App Store 发行边界见[平台接入](../docs/architecture/CLIENT_PLATFORMS.md)。

macOS 新增应用使用 `tooling/create-app.mjs`，将源码打包成 `.skapp` 目录后，从设置的应用管理安装。
包仅含 manifest、Web 资源与业务 JS；不支持原生扩展。子应用数据由宿主保存，
更新失败不会清除数据，移除包也会保留数据。

实现前遵循[客户端开发规范](AGENTS.md)，阅读[编码与协作规范](编码与协作规范.md)和[隐式约定](隐式约定.md)；
设计与运行时细节见[设计规范](../docs/design/CLIENT_DESIGN.md)与[运行时规范](../docs/architecture/CLIENT_RUNTIME.md)。
修改共享视觉后验证受影响的实际平台 App，浏览器预览和编译成功不代表原生体验通过。
