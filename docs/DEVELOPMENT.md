# 开发指南

首次启动见[项目首页](../README.md#快速开始)，服务端配置见[配置说明](CONFIGURATION.md)。
除特别说明外，命令均在项目根目录执行。

## 环境准备

| 依赖 | 用途 |
| --- | --- |
| Git 与 GitHub SSH | 仓库及子模块 |
| 项目 `.tools/flutter` SDK | Dart、Flutter 开发与测试；可通过根 makefile 变量覆盖 |
| 完整 Xcode 与 macOS SDK | macOS 原生宿主、Swift Package Manager 与签名构建 |
| Make、C 编译器、归档工具、OpenSSL 开发文件 | Skynet、Lua C 模块与公共 C 核心 |
| Lua 5.5、LuaRocks、Busted | 服务端单元测试 |
| netcat（nc） | 服务端控制脚本 |

已有仓库补齐子模块：`git submodule update --init --recursive`。
macOS 可通过 Homebrew 安装 OpenSSL；服务端默认从 Homebrew 查找，其他位置可指定
`OPENSSL_PREFIX`，或 `OPENSSL_INCLUDE_DIR`、`OPENSSL_LIB_DIR`。
使用 `luarocks install busted` 安装测试入口，并确认其使用 Lua 5.5。
Linux 服务端还需要 autoconf；工具沙箱需要 bubblewrap 和相关 namespace 能力。

## 目录与日常命令

| 目录 | 内容 |
| --- | --- |
| `client/apps/client` | 正式 Flutter 客户端、macOS 宿主及测试 |
| `client/packages/apple_ui` | 统一 Apple 主题、图标与共享控件 |
| `client/apps/component_gallery` | 独立的可选组件预览 |
| `client/tool` | UI 与依赖边界检查 |
| `server` | Skynet 服务端及 Lua 单元、网络集成与真实模型测试 |
| `common` | 公共协议、测试向量及 C 工具核心 |

运行 `make install` 安装 Flutter 工作区依赖。服务端测试复用现有 Skynet 与 Lua 库。
`make dev` 启动 macOS 开发态客户端，可在终端输入 `r` 热重载、`R` 热重启、`q` 退出。
客户端当前提供工作区、设置与空白 Chat，无需服务端即可验证界面。
业务接入边界和并发模型见[客户端运行时](architecture/CLIENT_RUNTIME.md)。

服务端独立执行 `make -C server build` 与 `./server/start.sh`；模型密钥按配置文档准备。
修改公共 C 核心后重新构建并重启；Lua 的兼容方法修复可使用下文热更新。

`make gallery-dev` 启动现有组件预览；开发新页面无需先登记画廊。
`make client-build` 构建正式 macOS App，`make build` 同时构建服务端。
产物位于 `client/apps/client/build/macos/Build/Products/Release/Skynet Agent.app`。
本机构建使用 ad-hoc 签名，正式分发需另行配置开发者签名与公证。

公共协议位于 `common/proto`，服务端和 Lua 网络探针直接加载 schema，无需生成测试代码。
修改协议后执行 `make check-full`，验证固定二进制向量、多 VM 编解码及真实网关交互。
Lua 静态诊断配置见 `.luarc.json`。

开发、构建和测试不依赖 Node.js 或 pnpm。项目级 HIG Review MCP 独立使用 Node.js，
仅供设计规范查询与审查辅助；安装说明见[工具说明](../.codex/mcp/hig-review/README.md)。

## 服务管理

```bash
./server/control.sh status
./server/control.sh stop
./server/control.sh force-stop
```

控制脚本通过仅监听回环地址的 Skynet 控制台访问 `.main`。调整 `runtime.control_port` 后，
在命令的第二个参数传入目标端口，例如 `./server/control.sh status <控制台端口>`。

`stop` 的响应表示关闭命令已接收，最终清理结果以服务端进程退出码为准：成功为 0，失败为 1。
正常关闭等待在途任务和资源清理；`force-stop` 可在启动、运行或关闭等待期间显式调用，
跳过清理并以 1 退出，不会自动触发。进程重启交给外部管理器。

日志输出取决于 `server/etc/config` 的 logger 配置；网关错误输出到 stdout/stderr。
启动和关闭的内部机制见[服务生命周期](architecture/AGENT_GATEWAY.md#服务生命周期)。

## 热更新

热更新仅用于兼容的缺陷修复。新增功能、公开接口、配置、schema、持久数据格式、
第三方库与 C 模块变更通过重新构建或重启生效，完整编码约束见 [AGENTS.md](../AGENTS.md#热更新编码规范)。

`develop` 渠道在业务服务启动完成后自动监听 `server/src`。保存已有模块的兼容方法修改即可热修；
其他渠道不自动监听。启用监听器，以及新增或删除源码文件后，需要重启。

也可通过 Skynet `debug_console` 对指定实例手动发送模块名：

```text
dbgcmd .client_1 HOTFIX client user agent.agent agent.llm.base
```

目标使用以 `.` 开头的注册名或以 `:` 开头的数字地址。库文件映射到模块名，基础模块使用短名，
服务主体使用服务名，例如 `user`、`rpc`、`websocket`。手动命令只作用于指定 VM；
`skipped` 表示该 VM 未加载对应模块，不能据此判断其他实例已更新。

热修日志由节点汇总，包含实际更新文件、失败实例或部分更新结果。批次预检查、重试和稳定方法表机制见
[网关架构](architecture/AGENT_GATEWAY.md#服务生命周期)。

## 测试与验收

验收频率遵循[编码与协作规范](../编码与协作规范.md#测试用例)。

| 命令 | 覆盖 |
| --- | --- |
| `make check` | 服务端格式与单元测试（含公共协议和固定二进制向量）、Flutter 基础检查 |
| `make -C server check` | 服务端格式、单元测试及全部服务端集成 |
| `make client-check` | Dart 格式、分析、UI/导入边界、工具及全部组件/单元测试 |
| `make client-e2e` | macOS Profile 真实交互、生命周期、偏好保存及帧耗时 |
| `make gallery-e2e` | 可选组件画廊的 macOS 原生交互 |
| `make check-full` | 基础回归、服务端集成及上述两组原生 E2E |
| `make -C server test-live` | 服务端真实模型网关探针 |
| `make build` | 服务端与最新 macOS Release 构建 |

服务端集成覆盖 Protobuf 跨 VM、生命周期、RPC、管理命令、热修、工具进程与假模型网关。
网络探针与 HTTP/SSE 假模型均使用 Lua，运行在独立 Skynet 进程，通过真实网络访问被测服务。
Shell 包装负责启动、日志与进程回收；自动热修测试只修改临时源码副本。
仅修改服务端测试或脚本时，验收相应服务端流程，无需运行客户端和组件画廊 E2E。
`make -C server test-probe-support` 单独验证探针的响应等待、超时恢复、断线与消息编号边界。
真实模型探针读取 `server/.env` 或 `SKYNET_ENV_FILE`，使用已有模型配置并产生实际用量。
缺少凭据、供应商失败或协议不兼容时明确失败，不回退假模型。

当前客户端未接入聊天，因此工作区 E2E 不代表真实聊天或连接持续已验收。
真实业务接入后，按规范补充从页面到真实网关、模型与结果页面的全链路测试。
其他平台首次支持时分别验收；共享界面的日常体验以 macOS App 为主。

同一 Flutter 工作区的依赖解析、分析、构建和原生测试串行执行。
原生测试结束后再执行外部辅助功能检查，避免干扰测试语义生命周期。
截图、性能报告与脱敏证据统一写入被忽略的 `client/test-artifacts/`，不维护像素基线。
