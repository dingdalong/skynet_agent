# Skynet Agent

基于 Skynet 与 Lua 的 Agent 服务端，搭配 Astryx 工作区与独立 Web 子应用。
客户端提供桌面、Dock、设置、Agent 对话、后台与双应用分屏。
Agent 支持会话恢复、流式消息、模型选择、取消、失败重试及服务器工具记录。
服务端保留多会话、流式对话、模型选择、工具执行与权限管理能力。

项目尚未发布。服务端按用户名识别用户，聊天数据保存在进程内存。
客户端支持 macOS 与 iPhone/iPad 模拟器，移动端用于远程开发，真机与发行签名另行验收。

## 快速开始

准备 Docker Compose、Node.js、pnpm 和完整 Xcode，见[开发指南](docs/DEVELOPMENT.md)。

```bash
git clone --recurse-submodules git@github.com:dingdalong/skynet_agent.git
cd skynet_agent
make install
```

使用本机网关时，先准备配置并启动服务端。首次配置可从示例文件开始：

```bash
cp server/.env.example server/.env
# 在 server/.env 中填写模型 API Key、管理员令牌和四个独立的数据库密码
# MONGO_BOOTSTRAP_PASSWORD、GATEWAY_MONGO_PASSWORD、APP_CENTER_MONGO_PASSWORD、APP_CENTER_MONGO_PROVISION_PASSWORD
./server/start.sh
# 首次部署 Agent 时提交本地镜像，命令会返回申请编号
./server/appctl submit --app-id agent --name Agent --image skynet-agent-app:local
```

在另一终端运行 `make dev` 启动客户端。连接已有网关时，可以直接从这一步开始。
打开宿主后填写服务器地址和用户名。登录成功后进入工作区，Agent 自动使用这份身份。
默认网关为 `ws://127.0.0.1:18787/agent`。在「应用中心 → 服务管理」用管理员令牌解锁，找到 Agent 的待审申请并点击「批准」。状态变为「运行中」后即可使用 Agent。
空库启动时只有 MongoDB、App Center 和 Gateway。应用目录、审批和期望启停状态保存在 MongoDB 中，重启会恢复之前的选择。其他应用使用相同的提交流程，见[接入新应用](docs/DEVELOPMENT.md#接入新应用)。
服务管理使用 `./server/control.sh status|stop|force-stop`。客户端通过系统菜单或 `⌘Q` 退出。
连接配置、权限范围与恢复规则见 [Agent 客户端](docs/architecture/CLIENT_AGENT.md)。
`make build` 构建服务端及正式 macOS 客户端，更多入口见 `make help`。
运行 iOS 使用 `make install PLATFORM=ios`、`make client-dev PLATFORM=ios`；
指定 iPad、归档及能力边界见[平台接入](docs/architecture/CLIENT_PLATFORMS.md)。

## 文档

- [开发指南](docs/DEVELOPMENT.md)：环境、运行、构建、测试与服务管理。
- [配置说明](docs/CONFIGURATION.md)：渠道、模型、工具权限与偏好。
- [客户端运行时](docs/architecture/CLIENT_RUNTIME.md)：表现分离、Actor、生命周期与并发规则。
- [网关架构](docs/architecture/AGENT_GATEWAY.md)：服务、会话、协议与工具执行。
- [客户端设计规范](docs/design/CLIENT_DESIGN.md)：Astryx 主题、工作区分屏与多平台交互。
- [客户端开发](client/README.md)：宿主、独立应用包与构建入口。
- [仓库公共规范](AGENTS.md)：公共约束与分层阅读入口。
- [编码与协作规范](编码与协作规范.md)：公共开发约定与验收要求。
- [客户端规范](client/AGENTS.md)：客户端架构、编码与调用约定入口。
- [服务端规范](server/AGENTS.md)：服务端架构、编码与请求分发约定入口。

更多专题见[文档索引](docs/README.md)。

## 许可证

[MIT](LICENSE)
