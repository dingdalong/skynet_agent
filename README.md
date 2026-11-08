# skynet_agent

基于 Skynet 的 Agent。

## 跨平台客户端

客户端使用 Vue 3、TypeScript、Tauri 2 和 `@skynet/design-system`。Web 与 macOS 共享同一套界面，
Windows、Linux、iOS、Android 通过相同平台适配层扩展。整个客户端采用 Beautiful UI Vue 的设计语言，
共享本地 Inter、JetBrains Mono 字体及基础组件，通过设计 Token 统一主题；宿主行为遵循平台规范，无障碍以 WCAG 2.2 AA 为底线。

前端代码、依赖和产物统一位于 `client/`，Skynet 服务端及第三方子模块统一位于 `server/`。
根目录只提供依赖安装、开发、构建、检查与协议生成入口：

```bash
make help
make install
make dev
make build
make check
make check-full
make proto-generate
```

首次运行 `make install` 安装客户端依赖并生成开发所需的 Token。日常使用 `make dev` 启动桌面
App，Web 可同时访问它启动的开发服务器；`make build` 构建当前平台服务端和桌面 App，供打包态验收。
服务端在另一个终端通过脚本单独启动：

```bash
./server/start.sh
```

Web 开发使用子项目命令，监听端口见 [`client/vite.config.ts`](client/vite.config.ts)：

```bash
pnpm --dir client dev
```

设计规范位于 [`docs/design`](docs/design)，组件与视觉样例通过以下命令查看：

```bash
pnpm --dir client storybook
```

客户端连接地址通过 `client/.env.local` 的 `VITE_AGENT_WS_URL` 覆盖，配置示例见
[`client/.env.example`](client/.env.example)。桌面启动与构建读取同一套 Vite 环境配置；原生连接地址
在构建时注入，修改后需重启桌面开发进程或重新构建安装包。网关监听地址由服务端渠道配置指定。
生产环境必须在反向代理终止 TLS，并使用 `wss://`。
WebSocket 使用二进制 Protobuf 消息；共享 schema 位于 `common/proto`，客户端生成代码位于
`client/src/protocol/generated/`。

## 配置

将 `server/.env.example` 复制为 `server/.env`，填写 DeepSeek API Key 并选择渠道：

```dotenv
SKYNET_CFG_CHANNEL=develop
DEEPSEEK_API_KEY=your-api-key
```

服务器运行参数位于 `server/etc/cfg`。`init.lua` 会按 `SKYNET_CFG_CHANNEL` 加载
`channel/<name>.lua`，再与 `common.lua` 深度合并并统一校验；未设置渠道时使用 `develop`。
监听地址、端口、WebSocket 路径、服务实例数、登录超时、模型请求超时、
对话消息限制和模型参数都从这里配置。超时字段以 `_ticks` 结尾，单位为厘秒。
三类服务实例数默认取 Skynet 工作线程数，渠道配置可以分别覆盖。

当前接入的是 DeepSeek；`llm.base.new` 负责构造 OpenAI 兼容客户端，
`llm.base.stream_responses` 统一处理 Responses API 流事件。

`server/.env` 使用 shell 兼容语法，只保存本机密钥和渠道选择，不提交真实密钥。
Skynet 运行日志写入 `server/logs/skynet.log`，网关日志输出到 stdout 和 stderr。模型密钥只由
Skynet 进程读取，不进入客户端。

## 模型连续对话

`agent` 导出 Agent 类，保存完整对话历史，并在首次 `chat` 时根据最新配置延迟创建 LLM 客户端。
构造时传入的 system prompt 会作为首条 `role=system` 消息发送，不使用 Responses API 的
顶层 `instructions` 参数。

```lua
local Agent = require("agent")

local agent = Agent:new({
    api_key = api_key,
    base_url = base_url,
    model = model,
    request_timeout_ticks = request_timeout_ticks,
}, "你是一个简洁、可靠的中文助手。")

local text, err = agent:chat("介绍一下 Lua", function(delta)
    io.write(delta)
end)
```

运行时可通过 `agent:set_llm(llm_config)` 更新配置。切换后已有历史保持不变，
下一次 `chat` 使用新配置重新创建 LLM 客户端。同一个 Agent 对象的 `chat` 和 `set_llm`
需要由调用方串行执行。

## Agent WebSocket 网关

默认启动模式是 WebSocket 网关。客户端协议、并发、取消与安全边界见
[`docs/architecture/AGENT_GATEWAY.md`](docs/architecture/AGENT_GATEWAY.md)。

`main` 统一创建、初始化和回收服务，固定单例 `gateway` 监听端口并分发连接；
`websocket`、`logind` 和 `client` 分别组成工作池。
三类工作池默认按 Skynet 工作线程数启动实例，也可在渠道配置中分别覆盖为 1 到 32。
生产反向代理配置 WSS 后转发到 `agent_gateway.socket` 指定的地址和端口。

客户端首次输入用户名，后续重开和断线重连自动恢复该用户名。App 由 Rust 核心持有 WebSocket、
登录会话、请求编号和本地缓存，界面重载后重新订阅，连接、草稿和会话选择继续保留；退出 App 后
清空本地内存缓存。App 隐藏 Reload 菜单，数据变化自动同步。Web 保留浏览器刷新，页面重载后
重建连接并恢复服务器数据。`logind` 按用户名固定路由
到 `client` 服务，并绑定存活连接。相同用户名共享用户数据，允许多个 App、浏览器或标签页同时在线。
当前仅用用户名识别用户，不提供密码认证。用户名区分大小写，长度为 1–32 个 Unicode 字符。

`client` 是业务承载服务；`connection` 只表示网络连接；`user` 持有会话、消息、模型上下文和任务；
`session` 是聊天会话，`Agent` 管理模型调用与已成功提交的历史。断线不删除数据、不取消生成，
服务器重启前可随时按用户名取回。数据暂不落盘，服务器重启后清空。

各端独立选择会话、编辑草稿。会话与消息实时同步，同一会话串行生成，不同会话可以并发。
任一端可停止任务。失败、停止和部分回答保留在展示历史中，只有成功轮次提交模型上下文；
最新失败轮次可原位重试。切换用户仅离开当前用户，不删除其服务器数据或取消后台生成。

协议按公共、登录和 Agent 会话拆分在 `common/proto`。每个 WebSocket 二进制消息由 9 字节头
和 Protobuf args 组成：压缩标志、消息 ID、完整消息类型名的 FNV-1a 32 位哈希。WebSocket
本身提供消息边界、长度和分帧重组，因此不增加应用层长度字段。当前不启用业务压缩，压缩标志
必须为 0。消息 ID 在连接内严格递增，普通响应复用请求 ID，主动推送使用 ID 0；生成任务使用独立的业务 `run_id`。
当前 WebSocket 入站消息上限为 256 KiB，客户端文本输入限制由 `etc/cfg` 配置；附件和大文件
后续使用独立 HTTP 数据通道，不把大块数据塞入单个 WebSocket 消息。

修改 proto 后重新生成单个客户端协议模块并检查一致性：

```bash
make proto-generate
pnpm --dir client proto:check
```

## Protobuf 编解码

`helper.protobuf` 接收 schema 目录，并加载目录第一层的全部 `.proto`：

```lua
local protobuf = require("helper.protobuf")

protobuf.load("schemas")

local data = protobuf.encode("agent.Message", {
    text = "hello",
    count = 1,
})
local message = protobuf.decode("agent.Message", data)
```

文件按名称排序后通过标准 import 关系一次加载。目录中存在 `pb.bytes` 时只加载该预编译
FileDescriptorSet，不再扫描或校验 proto；`pb.bytes` 必须使用 `--include_imports` 生成。
多个 proto 仍编译为这一个预编译文件。接口失败采用 Lua error，需要捕获时由调用方使用
`pcall`。

`main` 显式加载 `protocol.agent_gateway_schema_dir`，并在进程生命周期内持有唯一共享 schema。
其他服务在初始化时调用 `helper.protobuf.attach()` 接入只读 schema，不能再次加载或修改它。
`network.protocol` 独立负责 9 字节帧与类型哈希映射，每个 WebSocket 服务都在自己的 VM 中创建和
初始化该协议对象。模块 require 本身不加载文件或切换 Protobuf 状态。

schema、helper 公开接口或 `pb.so` 发生变化时必须重启进程。共享 schema 的持有者不能提前退出。

## 服务基础层与管理

业务服务共用 `src/service/init.lua`，入口调用 `service.start(SERVICE_NAME)`。
业务类通过 `commands` 声明命令白名单，
方法接收包含 `source`、`session` 的上下文。基础层统一处理初始化、状态、关闭、异常和热修注册。
内部消息统一经过 `rpc`，固定使用 Lua 协议，调用返回 `状态码, 业务结果...`。
`rpc.call` 带默认超时，`call_no_timeout` 持续等待远端完成，`send` 用于异步发送。
RPC 不自动重试；超时只结束调用方等待，不代表远端工作已经取消。启动和关闭统一使用无超时调用。

`main` 先开放本机控制台，再按 `client → logind → websocket → gateway` 初始化，依赖全部就绪后
才开放业务监听。初始化期间只额外允许显式强制关闭命令。
服务注册为 `.client_1`、`.logind_1`、`.websocket_1` 等，网关注册为 `.gateway`。
启动失败会清理已创建服务；关闭时逆序停止接入、关闭连接、取消生成，并等待在途命令和后台请求收尾。
启动和关闭均不设超时，重复关闭等待同一次清理结果。清理完成后统一退出进程，成功退出码为 0，
失败为 1。异常情况下可以显式强制关闭，跳过清理并以退出码 1 结束进程。
服务重启由外部进程管理器负责。

模型响应流支持主动取消；连接建立或等待响应头期间先标记取消，取得响应流后立即释放，
模型请求本身的超时仍然生效，关服等待不另设截止时间。

```bash
./server/control.sh status
./server/control.sh stop
./server/control.sh force-stop
```

管理命令通过仅监听回环地址的 Skynet 控制台访问 `.main`；控制台端口由
`runtime.control_port` 配置。`control.sh` 的可选第二个参数指定目标控制台端口。
`stop` 的控制台响应只表示命令已接收；进程退出码表示最终清理结果。
`force-stop` 可在启动卡住、正常运行或关服等待期间由异常处理脚本显式调用，不会自动触发。
指定端口时使用 `./server/control.sh force-stop <控制台端口>`。

服务端以服务为主体组织：`src/service/<name>/<name>.lua` 返回服务稳定类表，使用服务名作为唯一模块名。
Skynet 先查找独立脚本和内置服务，再通过公共入口按 loader 提供的 `SERVICE_NAME` 加载业务主体。
`gateway`、`websocket`、`logind`、`client` 分别管理接入、连接、登录和会话业务。

`src/lualib/` 保存服务创建的对象和公共模块：`user.lua` 保存用户业务状态，`agent/` 保存模型对话对象，`network/` 保存协议对象，
`base/` 提供生命周期、RPC、日志与热修，`helper/` 提供 Protobuf、服务池和开发渠道热修监听。
`src/main.lua` 通过 `node.init(callback)` 定制业务 schema、服务数量、依赖顺序和初始化参数。
`node` 在回调前启动公共服务，业务启动完成后进入就绪状态，统一处理服务登记、状态查询和进程关闭。
未来其他节点可在各自的 main 中传入启动回调，复用相同的公共流程。
回调接收节点实例，使用 `instance:launch(name, count, params, registered_name)` 创建并初始化服务，
默认注册名为 `.<name>_<index>`；单实例可显式指定名称，例如网关的 `.gateway`。

`base/` 已加入模块搜索路径，基础模块直接使用 `require("class")`、`require("rpc")` 等短名加载。
统一预加载脚本在每个服务 VM 启动时加载 `luaext.table`，将复制工具扩展到标准库，业务代码直接调用
`table.copy` 和 `table.deep_copy`。Busted 使用同一预加载脚本作为 helper，在加载测试前初始化扩展。

## 热更新

热更新只用于修复缺陷。功能、公开接口、持久数据格式和第三方库升级仍通过重启发布。
基于 `service` 启动的服务会自动注册热修调试命令。

长期对象只在实例字段保存数据，方法放在模块返回的共享类表中。已有实例的 metatable 必须指向该稳定类表，
不得在实例字段或长期闭包中缓存方法函数。完整编码约束见 [`AGENTS.md`](AGENTS.md)。

已经进入执行的方法继续运行旧字节码；热修完成后的新方法调用使用新实现。服务、对象和数据不会重建。
`node.Node` 导出的公共运行期方法可通过 `dbgcmd .main HOTFIX node` 修复缺陷。
主入口回调只在启动时执行，不保存到节点实例；业务编排与公共启动流程的调整通过重启生效。

`develop` 渠道在业务服务启动完成后自动监听 `server/src`，保存兼容的方法修改即可热修，
无需额外运行监听脚本。节点每 500ms 比较源码内容，连续保存稳定至少 200ms 后合并为一个批次。
监听覆盖 `.main` 和节点登记的全部已就绪服务实例，运行期通过 `Node:launch` 创建的实例也会加入后续批次；
其他渠道不自动监听。首次启用监听器需重启进程。

库文件转换为对应模块名，基础目录使用短模块名，服务主体使用服务名，例如
`lualib/user.lua` 对应 `user`，`lualib/base/rpc.lua` 对应 `rpc`，
`service/websocket/websocket.lua` 对应 `websocket`。主入口、公共服务入口、热修器、监听器自身、
预加载脚本和 `luaext/` 不进入热修；这些代码以及配置、schema、新增或删除文件的变更通过重启生效。

通知服务前，节点先编译整批源码，包括此前失败保留的模块。预检查只检查语法，不执行模块顶层；
任一文件编译失败，整个批次都不分发，修正后保存会连同其它待更新文件一起重试。
编译通过后，各 VM 继续执行模块、校验返回值与结构兼容性，整批通过才原位替换方法。
某实例校验失败或响应超时，会保留该实例的整个待更新批次，后续源码变更时合并重试；静止文件不会重复刷错。

服务只返回结果，节点统一记录一次实际更新的文件列表，路径去重并排序；未加载模块不会出现在更新列表中，
全部跳过时不记录成功日志。预检查或服务更新失败也只由节点汇总一次，包含文件位置或失败实例及原因；
部分成功时明确标记“部分更新”。各 VM 的更新结果独立，不保证跨 VM 同时生效。
关闭节点时先停止监听并等待当前批次结束，再回收业务服务。

也可以通过 `debug_console` 对指定实例手动发送模块名：

```text
dbgcmd .client_1 HOTFIX client user agent llm.base openai.ltn12 openai.url openai.sse openai.skynet_compat
```

服务地址使用 Skynet 注册名（以 `.` 开头）或数字地址（以 `:` 开头）。手动命令只更新指定 VM，
模块未加载时会返回 `skipped`，不能据此判断其他服务实例已经更新。

## 构建与运行

构建前需安装 OpenSSL(版本3以上) 开发文件；MinGW 交叉构建还需指向 MinGW 版本的 OpenSSL。

```bash
make -C server build
./server/start.sh
```

## 测试

验收规则统一见[编码与协作规范](编码与协作规范.md#测试用例)。基础回归使用：

```bash
make check
```

该命令执行两端格式与静态检查，以及 Lua、TypeScript、Rust 单测，包含测试所需的 C 模块和
Rust 编译。Lua 单元测试使用 Busted，需要提前运行 `luarocks install busted`。

每个任务还必须完成覆盖本次改动的端到端验收。客户端业务按改动选择原生夹具或 Web 真实网关链路：

```bash
make -C server build
pnpm --dir client test:native
pnpm --dir client test:e2e:full
```

原生夹具运行整组场景，驱动真实 Vue 页面和 Rust 核心；Web 全链路可在命令后追加
`--grep '<场景名称或正则表达式>'` 筛选本次场景，其他 Playwright 参数也会原样传递。

完整检查使用：

```bash
make check-full
```

完整检查先运行基础回归，再追加服务端全部专项集成、macOS 原生夹具、Web 真实网关全链路、
Storybook 构建和 Chromium、WebKit、移动视口 UI 回归。原生夹具会生成前端测试资源；固定端口
测试与会生成资源的构建顺序执行。
测试使用隔离配置和本地假模型，不调用付费模型；执行前需安装客户端依赖及 Playwright 浏览器。

专项检查直接使用子项目入口：

```bash
make -C server help
make -C server test
make -C server test-integration
pnpm --dir client check
pnpm --dir client check:native
pnpm --dir client test:e2e
```

单独运行原生夹具或 Web 全链路前需完成服务端构建。`test-integration` 覆盖 Protobuf 跨 VM、
服务生命周期与 RPC、管理命令、热修和假模型网关测试。其他定向命令见子项目帮助。

测试截图只用于排查和人工查看，不进行像素基线对比。UI 与 Web 全链路的截图、失败证据和
trace 分别写入 `client/test-artifacts/ui/` 和 `client/test-artifacts/web/`，整个目录忽略、不提交 Git。
功能、布局、主题、颜色和无障碍要求继续通过断言验证。

真实接口冒烟测试通过正式 WebSocket 网关调用模型，会读取 `server/.env` 并消耗少量 API 额度：

```bash
make -C server test-live
```

静态诊断统一使用 VS Code 的 sumneko.lua 插件；`.luarc.json` 固定 Lua 5.5 并启用代码风格检查。
