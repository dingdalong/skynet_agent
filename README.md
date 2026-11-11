# Skynet Agent

基于 Skynet 与 Lua 的 Agent 服务端，搭配 Flutter Apple 风格客户端。
客户端目前提供 macOS 桌面、Dock、设置、空白 Chat、后台与双应用分屏；聊天业务尚未接入新界面。
服务端保留多会话、流式对话、模型选择、工具执行与权限管理能力。

项目尚未发布。服务端按用户名识别用户，聊天数据保存在进程内存。
客户端架构面向移动与桌面跨平台，首版以 macOS 原生体验为验收基准。

## 快速开始

准备项目 Flutter SDK、完整 Xcode 和服务端构建环境，见[开发指南](docs/DEVELOPMENT.md)。

```bash
git clone --recurse-submodules git@github.com:dingdalong/skynet_agent.git
cd skynet_agent
make install
make dev
```

客户端界面可独立运行。需要开发或测试服务端时，准备模型凭据并单独启动：

```bash
cp server/.env.example server/.env
# 在 server/.env 中填写模型 API Key
make -C server build
./server/start.sh
```

服务管理使用 `./server/control.sh status|stop|force-stop`。客户端开发终端输入 `q` 退出。
`make build` 构建服务端及正式 macOS 客户端，更多入口见 `make help`。

## 文档

- [开发指南](docs/DEVELOPMENT.md)：环境、运行、构建、测试与服务管理。
- [配置说明](docs/CONFIGURATION.md)：渠道、模型、工具权限与偏好。
- [客户端运行时](docs/architecture/CLIENT_RUNTIME.md)：表现分离、Actor、生命周期与并发规则。
- [网关架构](docs/architecture/AGENT_GATEWAY.md)：服务、会话、协议与工具执行。
- [Flutter Apple 设计规范](docs/design/APPLE_FLUTTER_DESIGN.md)：统一视觉与交互入口。
- [组件预览](docs/design/COMPONENT_GALLERY.md)：可选 Flutter 预览，使用 `make gallery-dev`。
- [编码与协作规范](编码与协作规范.md)：开发约定与验收要求。

更多专题见[文档索引](docs/README.md)。

## 许可证

[MIT](LICENSE)
