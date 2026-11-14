---
name: client-subapp
description: 在 Skynet Agent 客户端新增或修改内置子应用、能力动作和宿主桥接时使用。约束 React Native 宿主、shadcn Web 表现与独立业务运行时的边界；不用于服务端 Lua 修改。
---

# 客户端子应用

先读 `docs/architecture/CLIENT_RUNTIME.md` 和 `docs/design/CLIENT_DESIGN.md`，再查相邻应用的 manifest、runtime 和 UI。
平台接入同时读 `docs/architecture/CLIENT_PLATFORMS.md`。

- 原生宿主拥有目录、权限、存储、连接、任务和工作区。界面只订阅快照并发命令；重载界面不能清理宿主资源。
- Web UI 复用 `client/packages/ui` 的官方 shadcn 组件及共享令牌；React Native 只实现宿主布局与交互。
- 共享工作区位于 `packages/workspace`，不直接导入平台实现。原生组件、图标映射和通信在平台入口注入；
  `packages/host-bridge` 只管理界面租约与快照，不持有原生资源。
- `native/core` 放平台无关的 C++ 状态规则，苹果平台资源所有权保留在 `native/apple`。
  不把连接和任务迁入可重载的 RN JS 运行时；不复制第二套平台状态机。
- macOS 业务运行于每应用独立进程；iOS 可信内置应用各用独立 JSC VM 与队列，属于进程内隔离，不开放动态安装和本地工具。状态转移同步、串行；异步工作经宿主完成后重新入队。不得在 UI 创建业务 worker 或直接访问文件、网络和其他应用。
- manifest 公开能力和带 schema 的动作；调用由宿主绑定真实应用身份并检查权限。Agent 使用同一套动作协议，不通过模拟点击串联应用。
- 增加能力时同时更新契约、原生校验、拒绝场景及进程集成测试。不能只补 TypeScript 类型。
- 修改布局时保留桌面、Dock、后台、拖动分屏和比例吸附；检查实际 macOS 与受影响的 iPhone/iPad，覆盖窄宽度、主题、减少动态效果、安全区和键盘。
- 按改动范围执行 `make client-check`、相关原生集成测试和 `make client-build`。服务端无改动时不启动真实模型回归。
- 新平台接入前实现对应隔离和资源适配器，不能将单进程错误边界描述为同等级隔离。
- 使用统一构建入口查询真实支持状态；共享内核测试、RN 依赖图打包不等于原生平台验收。
