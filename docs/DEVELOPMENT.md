# 开发指南

首次启动见[项目首页](../README.md#快速开始)，服务端配置见[配置说明](CONFIGURATION.md)。
除特别说明外，命令均在项目根目录执行。

## 环境准备

| 依赖 | 用途 |
| --- | --- |
| Git 与 GitHub SSH | 仓库及子模块 |
| Docker Engine 与 Compose v2 | 单机运行 MongoDB、App Center、Gateway 和业务应用。Skynet 节点使用 host 网络；MongoDB 仅向本机回环地址发布端口。Docker Desktop 需启用 host networking。 |
| Node.js 与 pnpm | 客户端 TypeScript、React 和 Astryx 工作区构建测试，版本见 `client/package.json` |
| 完整 Xcode、macOS/iOS SDK 与模拟器 | 苹果平台宿主、Swift Package Manager 与签名构建 |
| CMake 与 C++17 编译器 | 客户端公共宿主核心的独立编译测试 |
| Make、C 编译器、归档工具、OpenSSL 开发文件 | Skynet、Lua C 模块与公共 C 核心 |
| Lua 5.5、LuaRocks、Busted | 服务端单元测试 |
| netcat（nc） | 服务端控制脚本 |

已有仓库补齐子模块：`git submodule update --init --recursive`。
macOS 可通过 Homebrew 安装 OpenSSL；服务端默认从 Homebrew 查找，其他位置可指定
`OPENSSL_PREFIX`，或 `OPENSSL_INCLUDE_DIR`、`OPENSSL_LIB_DIR`。
使用 `luarocks install busted` 安装测试入口，并确认其使用 Lua 5.5。
原生 Linux 测试使用 autoconf、bubblewrap 和用户 namespace。Docker 中的 Agent 工作目录沙盒使用 Landlock，要求 Docker 的 Linux 内核支持 ABI 6 或更高版本。

## 目录与日常命令

| 目录 | 内容 |
| --- | --- |
| `client/apps/host` | 平台启动、原生视图接线、macOS 窗口与 iOS Scene |
| `client/native` | 公共 C++ 状态规则、苹果平台宿主资源与原生集成测试 |
| `client/builtins` | 设置、应用中心与 Agent 对话，各自包含清单、同步业务与 Web 表现 |
| `client/packages` | 共享 Web 工作区、宿主桥、契约、SDK 与令牌 |
| `client/tooling` | 构建、应用包模板、边界检查和原生验收 |
| `server` | Skynet 服务端及 Lua 单元、网络集成与真实模型测试 |
| `common` | 公共协议、测试向量及 C 工具核心 |

运行 `make install` 安装工作区依赖。服务端测试复用现有 Skynet 与 Lua 库。
`make dev` 构建并启动 macOS 客户端，修改源码后重新执行；菜单“工作空间 / 重新载入界面”
重新载入包内工作区页面，保留子应用、连接和原生宿主资源。
进入工作区前先在宿主登录可用网关。Agent 和应用中心复用本次登录的用户身份。
业务接入边界和并发模型见[客户端运行时](architecture/CLIENT_RUNTIME.md)。

服务端独立执行 `make -C server build` 与 `./server/start.sh`；模型密钥按配置文档准备。
修改公共 C 核心后重新构建并重启；Lua 的兼容方法修复可使用下文热更新。

`make client-build PLATFORM=macos` 构建 macOS App，`make build` 同时构建服务端。
`make dev PLATFORM=macos` 是统一的开发入口；不指定 PLATFORM 时根据当前操作系统选择。
`make client-platforms` 查询可构建状态，`make client-doctor` 查询锁定版本与构建主机。
未接入的平台会在产生构建副作用前明确失败，不会回退到 macOS。
`make client-core-test` 在具备 CMake、Node 和 C++17 编译器的主机上独立验证公共内核。
支持矩阵及后续接入门槛见[客户端平台接入](architecture/CLIENT_PLATFORMS.md)。
产物位于 `client/dist/macos/Skynet Agent.app`。
本机构建使用 ad-hoc 签名，不启用要求 Team ID 的 Hardened Runtime 库校验。
正式分发需配置同一开发者身份签名宿主与嵌入引擎、启用 Hardened Runtime 并公证。

iPhone/iPad 使用 `make install PLATFORM=ios`、`make dev PLATFORM=ios`；
`SKYNET_IOS_DEVICE` 可指定模拟器名字或 UDID。`make client-build PLATFORM=ios`
输出通用模拟器包，`make client-archive PLATFORM=ios` 输出默认未签名真机归档。
签名、发行边界与移动端资源生命周期见平台接入文档。iOS 不安装动态包或执行手机本地开发工具。

公共协议位于 `common/proto`，服务端和 Lua 网络探针直接加载 schema，无需生成测试代码。
修改协议后执行 `make check-full`，验证固定二进制向量、多 VM 编解码及真实网关交互。
Lua 静态诊断配置见 `.luarc.json`。

Node.js 与 pnpm 仅用于客户端开发，服务端构建与 Lua 测试独立运行。
客户端使用项目内的 Astryx 官方技能，项目 MCP 可查官方组件、布局与主题。分屏和多平台交互见[客户端设计规范](design/CLIENT_DESIGN.md)。
完整 Xcode 的路径由 `XCODE_DEVELOPER_DIR` 覆盖。

## 服务管理

```bash
./server/control.sh status
./server/control.sh stop
./server/control.sh force-stop
```

`./server/start.sh` 构建 Agent 镜像，依次启动 MongoDB、App Center 和 Gateway。每个节点启动本机的 `.database`。Gateway 在 `skynet_agent.user` 中取得持久用户身份，在内存中管理连接和路由。App Center 从 `skynet_agent.app_center` 读取应用记录，按期望状态恢复应用。单独重启 Gateway 后，用户重新登录即可继续访问运行中的 Agent。

首次部署 Agent 时，在部署机执行：

```sh
./server/appctl submit --app-id agent --name Agent --image skynet-agent-app:local
```

在「应用中心 → 服务管理」用 `APP_CENTER_ADMIN_TOKEN` 解锁并批准申请。Agent 容器启动并注册后，网关开始转发请求。重启时 App Center 根据 MongoDB 中的批准版本和期望启停状态恢复应用。
`stop` 让 App Center 在 Gateway 在线期间排空应用，随后关闭 Gateway 并回收基础容器。应用数据和管理员设置保存在命名卷中。
`force-stop` 强制结束本项目容器。使用自定义 `COMPOSE_PROJECT_NAME` 时，管理命令使用相同的项目名。

日志输出取决于 `server/etc/config` 的 logger 配置；网关错误输出到 stdout/stderr。
启动和关闭的内部机制见[服务生命周期](architecture/AGENT_GATEWAY.md#服务生命周期)。

## 接入新应用

在新镜像中复用 `server/Dockerfile` 的 `app` 阶段。外部项目可先在本仓库执行 `docker build -f server/Dockerfile --target app -t skynet-app-base .`，再以 `FROM skynet-app-base` 构建自己的镜像。
将 `.proto` 放在 `../common/proto/`，将应用入口放在 `src/service/app/<模块>/init.lua`。模块名取 `app_id` 并将连字符换成下划线。构建时运行 `bin/lua deploy/check_protocol.lua <app_id> <协议入口>`。
Actor 提供 `handle_request`、`disconnect`、`drain`，通知通过本节点的 `app_endpoint.publish` 发送。客户端应用用自己的描述建立编解码器。完整示例在 `server/tests/fixtures/echo/`。

在镜像中通过 `ENV APP_SCHEMA` 指定协议入口，可选 `APP_INSTANCES` 指定 Actor 数量。在运行 App Center 的部署机执行：

```sh
docker build -f server/Dockerfile --target echo-fixture -t skynet-echo:local .
./server/appctl submit --app-id echo --name Echo --image skynet-echo:local
```

命令返回申请编号。打开「应用中心 → 服务管理」，用管理令牌解锁，核对镜像及其 ID 后批准或拒绝。首次批准会分配专属库和账号，默认启用。已批准应用的更新也要提交，审批期间原版本继续服务，批准后沿用原库和之前的启停选择。下架结束在途任务，移除容器并撤销账号，旧库和工作卷保留。相同应用再次获批时从新的空库开始。仅 App Center 挂载 Docker socket。

App Center 按已批准的镜像 ID 启动容器，并注入 `APP_ID` 和注册凭据。应用加载协议与 Actor 后在本机回环地址监听随机端口，向 App Center 的 Cluster 端口报到。握手通过后 Gateway 安装路由。已在运行的应用直接与 Gateway 通信。

Agent 更新后运行 `make -C server test-live`。它构建当前工作区的 Agent，连接当前 Compose 项目正在使用的 Gateway，列出本次构建、已批准、运行中的镜像 ID，以及待审申请编号和对应的镜像 ID。版本一致后，用 `local-agent-e2e` 用户打开会话、读取最近一页并请求更早的消息。首次没有历史时会用真实模型创建一轮样本，后续复用同一用户的数据。测试结束后服务继续运行。

完成 Agent 端到端验收还需执行 `make macos-test-app`，通过 Computer Use 打开测试客户端，登录上一步输出的 Gateway 地址并操作本次改动涉及的功能。例如验收历史分页时，选择有多页历史的专用测试账号，打开会话，确认首屏显示最近的消息，再向上翻到开头，核对更早的消息和分页终点。记录实际看到的结果。

要专门验证 Agent 重启前后的真实模型续聊，在仓库根目录执行 `server/tests/integration/live_smoke.sh`。该脚本使用独立的 Compose 项目。

若本次镜像尚未提交，使用上面的 `appctl submit` 命令。若待审申请指向本次镜像，在应用中心批准它。若待审的是其他镜像，先核对那条申请的用途，再决定是否驳回。

运行 `node client/tooling/docker-apps-e2e.mjs` 可在随机项目和端口复验在线登记、请求与通知、协议冲突、停用及故障恢复。脚本结束时回收该测试项目的容器和卷。

## 热更新

热更新仅用于兼容的缺陷修复。新增功能、公开接口、配置、schema、持久数据格式、
第三方库与 C 模块变更通过重新构建或重启生效，完整编码约束见 [AGENTS.md](../AGENTS.md#热更新编码规范)。

`develop` 渠道在业务服务启动完成后监听该节点的 `src`。Compose 默认把源码打入镜像，本机源码改动需要重新构建对应镜像。使用源码绑定挂载的开发环境中，保存已有模块的兼容方法修改即可热修；
其他渠道不自动监听。启用监听器，以及新增或删除源码文件后，需要重启。

原生开发节点也可通过 Skynet `debug_console` 对指定实例手动发送模块名：

```text
dbgcmd .client_1 HOTFIX client client.user
```

目标使用以 `.` 开头的注册名或以 `:` 开头的数字地址。库文件映射到模块名，基础模块使用短名，
服务主体使用服务名，服务私有模块带服务名前缀，例如 `agent.handler`、`client.user`。手动命令只作用于指定 VM；
`skipped` 表示该 VM 未加载对应模块，不能据此判断其他实例已更新。

热修日志由节点汇总，包含实际更新文件、失败实例或部分更新结果。批次预检查、重试和稳定方法表机制见
[网关架构](architecture/AGENT_GATEWAY.md#服务生命周期)。

## 测试与验收

验收频率遵循[编码与协作规范](../编码与协作规范.md#测试用例)。

| 命令 | 覆盖 |
| --- | --- |
| `make check` | 服务端格式与单元测试（含公共协议和固定二进制向量）、客户端基础检查 |
| `make -C server check` | 服务端格式、单元测试及全部服务端集成 |
| `make client-check` | 格式、TypeScript、令牌、导入边界、几何逻辑与原生进程集成 |
| `make client-test` | 实际 JSC 子进程、权限、更新、故障、任务与本地 WebSocket 生命周期 |
| `make client-test PLATFORM=ios` | 模拟器内独立 JSC VM、移动权限、前后台恢复与真实 WebKit 触控布局 |
| `make check-full` | 基础回归、服务端集成、客户端原生集成与 Docker 跨应用验收 |
| `make -C server test-live` | 本机接口检查，核对 Agent 镜像、登录和历史分页；界面步骤通过 Computer Use 执行 |
| `make build` | 服务端与最新 macOS Release 构建 |

服务端集成覆盖 Protobuf 跨 VM、生命周期、RPC、管理命令、热修、工具进程与假模型网关。
网络探针与 HTTP/SSE 假模型均使用 Lua，运行在独立 Skynet 进程，通过真实网络访问被测服务。
Shell 包装负责启动、日志与进程回收；自动热修测试只修改临时源码副本。
仅修改服务端测试或脚本时，验收相应服务端流程，无需运行客户端 E2E。
`make -C server test-probe-support` 单独验证探针的响应等待、超时恢复、断线与消息编号边界。
真实模型探针读取 `server/.env` 或 `SKYNET_ENV_FILE`，使用已有模型配置并产生实际用量。
缺少凭据、供应商失败或协议不兼容时明确失败，不回退假模型。

工作区 E2E 不代表真实聊天已验收。
连接生命周期测试使用独立回环 WebSocket 服务核对物理连接身份，不依赖真实模型。
Agent 业务按规范从页面连接真实网关、模型并检查结果页面。
其他平台首次支持时分别验收；共享界面的日常体验以 macOS App 为主。

同一客户端工作区的依赖安装和原生构建串行执行。
在最新本地 macOS App 上使用 Computer Use 验收工作区交互、WebView 和偏好持久化。
截图、性能报告与脱敏证据统一写入被忽略的 `client/test-artifacts/`，不维护像素基线。
