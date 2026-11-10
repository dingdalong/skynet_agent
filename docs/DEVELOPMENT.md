# 开发指南

首次启动步骤见[项目首页](../README.md#快速开始)。本文说明环境准备、日常开发和验证入口；
参数及生效方式见[配置说明](CONFIGURATION.md)。下列命令除特别说明外，均在项目根目录执行。

## 环境准备

当前以 macOS App 和 Web 为主要验证平台。其他平台的能力与发布要求见
[平台矩阵](design/PLATFORM_MATRIX.md)，编译支持不代表已完成发布验收。

| 依赖                           | 用途                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Git 与 GitHub SSH 访问         | 获取仓库及子模块；部分子模块使用 SSH 地址                                                         |
| Node.js LTS 与 pnpm            | 客户端开发；Node.js 需满足依赖的 `engines`，pnpm 版本见 `client/package.json` 的 `packageManager` |
| Rust 稳定工具链与 Cargo        | 构建 Tauri 桌面客户端及原生测试                                                                   |
| Make、C 编译器、静态库归档工具 | 构建 Skynet、Lua C 模块及共用工具运行时                                                           |
| OpenSSL 3 以上开发文件         | 服务端 TLS 支持                                                                                   |
| Lua 5.5、LuaRocks 与 Busted    | 运行 Lua 单元测试；Skynet 自带运行所需的 Lua 源码                                                 |
| netcat（`nc`）                 | 使用服务端控制脚本                                                                                |

macOS 安装 Xcode Command Line Tools，提供编译器和系统 SDK；OpenSSL 可通过 Homebrew 安装：

```bash
xcode-select --install
brew install openssl@3
```

服务端构建默认通过 Homebrew 查找 OpenSSL。使用其他安装位置时，可传入 `OPENSSL_PREFIX`，
或分别传入 `OPENSSL_INCLUDE_DIR` 和 `OPENSSL_LIB_DIR`。MinGW 交叉构建需使用目标平台的 OpenSSL。

Linux 服务端构建还需 autoconf；本地工具执行需 bubblewrap，并允许创建 user/PID namespace
和挂载独立 proc。macOS 使用系统 `sandbox-exec`。隔离能力不可用时工具返回错误。

已有仓库可补齐子模块：

```bash
git submodule update --init --recursive
```

测试前安装 Busted，并确保它使用 Lua 5.5；客户端界面和 Web 端到端测试还需要 Playwright 浏览器：

```bash
luarocks install busted
pnpm --dir client exec playwright install chromium webkit
```

## 目录与日常命令

| 目录      | 内容                                                       |
| --------- | ---------------------------------------------------------- |
| `client/` | Vue/TypeScript 界面、设计系统、Tauri Rust 核心及客户端测试 |
| `server/` | Skynet 服务端、渠道配置、第三方依赖和服务端测试            |
| `common/` | Protobuf 协议、公共枚举及共用 C 工具核心                   |
| `docs/`   | 开发、配置、架构与客户端设计文档                           |

根目录提供统一入口，专项操作使用子项目命令：

| 命令                  | 用途                                                     |
| --------------------- | -------------------------------------------------------- |
| `make install`        | 安装客户端依赖并生成设计 Token；不构建或启动服务端       |
| `make dev`            | 启动桌面 App 开发模式及 Web 开发服务器；服务端另行启动   |
| `make build`          | 构建当前平台服务端和桌面 App                             |
| `make check`          | 两端格式与静态检查，以及 Lua、TypeScript、Rust 单测      |
| `make check-full`     | 基础回归、集成测试、原生/Web 真实模型端到端及多浏览器 UI |
| `make proto-generate` | 从共享 schema 生成客户端协议代码                         |
| `make help`           | 显示入口说明                                             |

## 开发运行与构建

服务端先完成构建，再使用 `./server/start.sh` 前台启动。它读取环境文件并检查模型密钥，
具体配置见[配置说明](CONFIGURATION.md#环境文件)。日常启动 App 使用 `make dev`。

只开发 Web 时可单独启动开发服务器，地址以终端输出和 `client/vite.config.ts` 为准：

```bash
pnpm --dir client dev
```

组件与视觉样例使用 Storybook：

```bash
pnpm --dir client storybook
```

客户端连接地址由 Vite 环境配置提供。修改原生连接地址或 Rust 代码后重启桌面开发进程；
修改 C 工具核心后重新构建并重启。Lua 的兼容方法修复可使用[热更新](#热更新)。

需要打包态验收时运行 `make build`，使用本次生成的 App 或安装包。
macOS 本地构建使用 ad-hoc 签名；正式分发另需开发者签名与公证。

协议文件位于 `common/proto`。修改后执行：

```bash
make proto-generate
pnpm --dir client proto:check
```

静态诊断使用 VS Code 的 sumneko.lua 插件，`.luarc.json` 声明 Lua 5.5 与代码风格检查。

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

验收层级及执行频率以[编码与协作规范](../编码与协作规范.md#测试用例)为准。
日常执行 `make check` 完成基础回归；任务收尾还需覆盖本次改动的端到端验收。
公共协议、连接框架、跨子系统变更及发布前按规范执行 `make check-full`。

业务端到端从真实客户端操作开始，连接真实网关与模型供应商。原生与 Web 入口为：

```bash
make -C server build
pnpm --dir client test:native
pnpm --dir client test:e2e:full
pnpm --dir client test:execution
```

原生夹具驱动真实 Vue 页面和 Rust 核心，运行整组场景。Web 全链路可追加
`--grep '<场景名称或正则表达式>'`，其他 Playwright 参数也会传递给测试。
`test:execution` 覆盖本地与远程执行。

主模型与权限模型复用 `server/.env` 或 `SKYNET_ENV_FILE` 中的凭据，使用开发渠道模型配置，
可通过 `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL` 覆盖。真实验收会产生模型用量；
缺少凭据、供应商失败或协议不兼容时测试失败，不跳过或回退假模型。
项目规则场景验证新任务重新加载根规则、更新与子目录规则；权限场景验证伪造授权不能放行越权动作。

确定性的异常注入、断流、超时及失败重试由假模型集成覆盖：

```bash
pnpm --dir client test:integration:native
pnpm --dir client test:integration:web
```

`make check-full` 顺序执行基础回归、服务端专项集成、原生/Web 假模型集成、原生/Web
真实模型验收、本地/远程执行验收、Storybook 构建及 Chromium、WebKit 和移动视口 UI 回归。
固定端口测试与会生成资源的构建顺序执行。原生夹具可生成测试资源，无需生成正式 App 或 DMG。

专项检查可直接使用子项目入口：

```bash
make -C server help
make -C server test
make -C server test-integration
pnpm --dir client check
pnpm --dir client check:native
pnpm --dir client test:e2e
```

服务端 `test-integration` 覆盖 Protobuf 跨 VM、服务生命周期、RPC、管理命令、热修、工具进程
和假模型网关。仅需验证真实模型网关连接时可运行 `make -C server test-live`，
它同样读取服务端凭据并消耗模型额度，不能替代客户端端到端验收。

测试截图、trace 和脱敏证据统一写入被忽略的 `client/test-artifacts/`：
`real-model/` 保存真实模型结果，`ui/` 保存 UI 产物，`web/` 保存 Web 全链路产物。
截图用于排查与人工查看，不维护像素基线；功能、布局、主题、颜色和无障碍继续通过断言验证。
