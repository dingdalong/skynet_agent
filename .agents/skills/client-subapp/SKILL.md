---
name: client-subapp
description: 在 Skynet Agent 客户端新增或修改内置子应用、能力动作和宿主桥接时使用。约束 React Native 宿主、shadcn Web 表现与独立业务运行时的边界；不用于服务端 Lua 修改。
---

# 客户端子应用

先读 `docs/architecture/CLIENT_RUNTIME.md` 和 `docs/design/CLIENT_DESIGN.md`，再查相邻应用的 manifest、runtime 和 UI。

- 原生宿主拥有目录、权限、存储、连接、任务和工作区。界面只订阅快照并发命令；重载界面不能清理宿主资源。
- Web UI 复用 `client/packages/ui` 的官方 shadcn 组件及共享令牌；React Native 只实现宿主布局与交互。
- 业务运行于每个应用独立的进程。状态转移同步、串行；异步工作经能力请求完成后重新入队。不得在 UI 创建业务 worker 或直接访问文件、网络和其他应用。
- manifest 公开能力和带 schema 的动作；调用由宿主绑定真实应用身份并检查权限。Agent 使用同一套动作协议，不通过模拟点击串联应用。
- 增加能力时同时更新契约、原生校验、拒绝场景及进程集成测试。不能只补 TypeScript 类型。
- 修改布局时保留桌面、Dock、后台、拖动分屏和比例吸附；检查窄窗口、主题、减少动态效果与实际 macOS。
- 按改动范围执行 `make client-check`、相关原生集成测试和 `make client-build`。服务端无改动时不启动真实模型回归。
- 新平台接入前实现对应隔离和资源适配器，不能将单进程错误边界描述为同等级隔离。
