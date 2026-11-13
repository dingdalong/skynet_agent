# Skynet 客户端

React Native macOS 宿主负责工作区；独立 WebView 呈现官方 shadcn/ui 子应用。
每个应用的同步业务逻辑运行在单独的 JavaScriptCore 进程，通过原生 HostCore 使用存储、连接和动作。
Node.js 只用于开发构建，不随 App 分发。

```text
apps/host/          原生宿主、工作区表现、macOS 桥接和进程监督
builtins/          设置与 Agent 对话，分别包含 manifest、runtime 与 view
packages/contracts 消息、清单和状态契约
packages/app-sdk   Web 表现桥接与可失效订阅
packages/app-runtime 同步 Actor 定义
packages/agent-client 二进制协议、会话、流式任务和恢复规则
packages/ui        官方 shadcn 组件源码与共享样式
packages/tokens    单一令牌源与生成主题
tooling/           构建、打包、架构检查、原生验收与应用模板
```

在项目根目录运行 `make install`、`make dev` 和 `make client-check`。
原生 UI 测试会占用当前桌面的鼠标、键盘，安排空闲时段后使用
`SKYNET_FOREGROUND_UI_TESTS=1 make client-e2e`。
`make client-build` 的产物位于 `client/dist/macos/Skynet Agent.app`，当前为本机架构和本地签名；
公证、发布签名及其他平台另行接入。

新增应用使用 `tooling/create-app.mjs`，将源码打包成 `.skapp` 目录后，从设置的应用管理安装。
包仅含 manifest、Web 资源与业务 JS；不支持原生扩展。子应用数据由宿主保存，
更新失败不会清除数据，移除包也会保留数据。

实现前阅读[设计规范](../docs/design/CLIENT_DESIGN.md)与[运行时规范](../docs/architecture/CLIENT_RUNTIME.md)。
修改共享视觉后以实际 macOS App 验证，浏览器预览和编译成功不代表原生体验通过。
