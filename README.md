# Skynet Agent

基于 Skynet 和 Lua 的 Agent 应用，提供桌面与 Web 客户端，支持连续对话、工具调用，
以及在云端或本机工作目录中执行开发任务。

项目尚未发布，当前主要验证 macOS App 与 Web。用户名仅用于识别用户，不提供密码认证；
聊天数据暂不持久化，服务端重启后清空。平台支持范围见[平台矩阵](docs/design/PLATFORM_MATRIX.md)。

## 主要能力

- **多会话与跨端同步**：同一用户名可在多个设备继续会话，查看流式回答和思考，停止或重试任务。
- **会话模型选择**：按会话选择模型，模型配置和 API Key 由服务端管理。
- **开发工具**：执行命令、交互式终端和文件补丁；支持云端工作目录、本机目录和远程继续桌面任务。
- **项目规则与权限**：读取项目的 AGENTS.md，以系统沙盒约束执行范围，并由独立模型判断工具权限。

## 快速开始

以下步骤以 macOS 开发环境为例。需要 Git 与 GitHub SSH 访问、Node.js/pnpm、Rust、C 构建工具和
OpenSSL 3 以上开发文件，准备方式见[开发指南](docs/DEVELOPMENT.md#环境准备)。

克隆项目及子模块，准备本机配置：

```bash
git clone --recurse-submodules git@github.com:dingdalong/skynet_agent.git
cd skynet_agent
cp server/.env.example server/.env
```

编辑 `server/.env`，填写 `DEEPSEEK_API_KEY`。模型及连接配置见[配置说明](docs/CONFIGURATION.md)。

安装客户端依赖并构建服务端：

```bash
make install
make -C server build
```

在当前终端启动服务端：

```bash
./server/start.sh
```

在另一个终端进入项目根目录，启动桌面 App：

```bash
make dev
```

输入用户名后即可开始对话。Web 可访问开发终端输出的本机地址。结束开发时，在项目根目录执行
`./server/control.sh stop` 关闭服务端，并在客户端开发终端按 `Ctrl+C` 停止开发进程。

## 文档

- [开发指南](docs/DEVELOPMENT.md)：环境、开发运行、构建、测试与热修操作。
- [配置说明](docs/CONFIGURATION.md)：渠道、模型、工具权限和客户端连接。
- [网关架构](docs/architecture/AGENT_GATEWAY.md)：服务、会话、协议与工具执行机制。
- [设计规范](docs/design/DESIGN_LANGUAGE.md)：共享界面与组件设计。
- [编码与协作规范](编码与协作规范.md)：开发约定与验收要求。

更多专题见[文档索引](docs/README.md)。可用命令通过 `make help` 查看。

## 许可证

[MIT](LICENSE)
