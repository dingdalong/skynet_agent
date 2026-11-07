# Agent WebSocket 网关

## 边界

Web 和 Tauri 客户端通过 WebSocket 连接 Skynet。模型对话、会话历史、模型配置和 API Key
都位于服务端，以 `user` 为所有者，服务器重启前保留。客户端输入用户名进入，同名共享数据并实时同步；
刷新、断线和退出只改变网络连接，不删除会话或停止生成。用户名识别不提供密码认证，数据暂不落盘。

## 术语与职责

| 名称           | 含义                                                   |
| -------------- | ------------------------------------------------------ |
| `client`       | 承载客户端业务的 Skynet 服务，一个实例可以管理多条连接 |
| `connection`   | 单条网络连接及用户订阅                                 |
| `session`      | 聊天会话，保存消息与对话历史                           |
| `Conversation` | 模型调用与历史管理对象，由 `agent.conversation` 导出   |
| `user`         | 用户身份、会话集合和后台任务的所有者                   |
| `Agent`        | 保留给智能体业务概念，实体模型后续设计                 |

```mermaid
flowchart LR
    C["client 服务"] -->|"1:N"| U["user"]
    U -->|"1:N"| N["connection 订阅"]
    U -->|"1:N"| S["session"]
    S -->|"1:1"| V["🧠 Conversation"]
```

服务池实例数表示承载容量；连接数、用户数与智能体数分别描述。当前模型对话对象不承担独立智能体身份。
`config.agent`、`agent_gateway`、`skynet.agent.v1` 和 `/agent` 继续用于智能体业务配置或协议命名。

## 服务生命周期

`main` 是进程的生命周期所有者，持有共享 Protobuf schema 和服务地址列表。它按依赖顺序创建、
命名和初始化服务，最后开放网关监听；启动失败则回收已创建服务。本机控制台在业务服务启动前开放，
启动卡住时也可显式强制关闭。关闭时先停止热修监听并等待当前批次结束，再停止接入、依次回收
WebSocket、登录和 client 服务，等待在途命令、连接读循环和后台生成退出后统一结束进程。
启动和关闭均无超时，正常关闭保留服务 VM 至进程结束。清理成功退出 0，清理失败退出 1；
显式强制关闭跳过清理并退出 1。进程重启由外部管理器负责。

| 目录 / 服务                                     | 职责                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `base/service.lua`                              | 命令白名单、上下文、初始化、状态、关闭、异常边界、热修注册  |
| `service/init.lua`                              | 根据 loader 提供的服务名加载业务主体                        |
| `main.lua`                                      | 业务 schema、服务数量、依赖顺序和初始化参数                 |
| `base/node.lua` / `main`                        | 公共初始化、服务登记、启动失败回收、状态汇总、进程关闭      |
| `base/rpc.lua`                                  | 固定 Lua 协议、有超时与无超时调用、状态码、完整多返回值     |
| `helper/`                                       | Protobuf 加载与接入、服务池轮询与固定路由、开发渠道热修监听 |
| `service/gateway/gateway.lua` / `gateway`       | 单例监听和新连接分发                                        |
| `service/websocket/websocket.lua` / `websocket` | 连接生命周期、编解码、协议守卫、写队列和消息路由            |
| `service/logind/logind.lua` / `logind`          | 按用户名固定路由、绑定、登录响应、失败关闭                  |
| `service/client/client.lua` / `client`          | 用户集合、连接路由和更新推送                                |
| `user.lua`、`agent/conversation.lua`            | 用户业务状态、模型对话与历史提交                            |

`src/service/init.lua` 是公共业务入口，统一调用 `service.start(SERVICE_NAME)`。
独立脚本和 Skynet 内置服务优先于公共入口。`src/service/<name>/<name>.lua` 返回稳定类表，
使用服务名作为唯一模块名，例如 `require("gateway")`。
`src/lualib` 保存服务创建的对象与公共模块。各节点的 main 通过 `node.init(callback)` 定制业务启动，
回调接收节点实例；`node` 先完成公共初始化，再执行回调，最后进入就绪状态。
`node` 复用服务基础层的初始化与命令分发，统一管理进程生命周期，业务服务清单由 main 决定。
节点实例的 `launch(name, count, params, registered_name)` 默认按服务名和编号注册；
单实例可指定注册名，网关的 `.gateway` 由 main 显式传入。
基础目录加入搜索路径后，以 `class`、`rpc`、`service` 等短名加载模块。
Skynet 每个服务 VM 和 Busted 都先执行统一预加载脚本，将 `luaext.table` 的复制方法扩展到标准库，
业务代码直接调用 `table.copy`、`table.deep_copy`。
业务类的 `commands` 把公开命令映射到方法名，执行时动态查找方法；`ctor` 和私有方法不会直接暴露。
方法第一参是 `{source, session}` 上下文，后面是业务参数。基础层只对同步调用发送返回值，
返回格式为 `状态码, 业务结果...`；Lua 异常会被记录并转换为 `call_fail`。

初始化只能执行一次。服务就绪前拒绝业务命令；初始化期间仅放行 `initializing_commands` 显式登记的
命令，main 只登记 `force_shutdown`。关闭由初始化所有者发起并保持幂等。
`close` 成功表示清理完成，重复调用等待同一次结果。关闭期间拒绝新业务，仅允许
`closing_commands` 显式登记的收尾命令，例如回收迟到的接入 fd 和断线清理。
在途命令异常也会释放计数，client 服务的独立请求集合继续跟踪已断开连接的后台生成。

关服与用户取消都会主动关闭已有模型响应流，并等待生成协程收尾；取消确认先于取消终态。
底层 HTTP 在连接建立及响应头返回前没有可用流句柄，此阶段先标记取消，取得流后立即释放；
模型请求超时仍生效，关服等待不另设截止时间。请求上下文通过稳定 Client 类传给 HTTP 兼容层，
各请求互不串扰。
基础层不对整个服务加串行锁，因为同一服务中的其他连接及跨服务回调必须继续运行。
长期对象的状态保存在实例中，方法位于模块导出的稳定类表，长期回调通过 `self:method()` 查找实现。
结构、接口、schema 和配置变化通过重启发布；后续兼容的缺陷修复才使用热修。
服务主体也通过稳定模块表热修，例如 `dbgcmd .gateway HOTFIX gateway`。
`node` 导出稳定的 `Node` 类表，公共运行期方法的缺陷修复可使用 `dbgcmd .main HOTFIX node`。
节点启动回调只执行一次，不保存在节点实例中；业务编排与公共启动流程的调整通过重启生效。
`develop` 渠道由 node 在业务服务启动完成后创建 `helper.hotfix_watch` 并建立源码基线，
在节点内协程轮询文件内容，连续保存稳定后串行发起批次。目标是 `.main` 与全部登记且已就绪的业务实例，
运行期新建实例加入后续批次。其他渠道不自动监听。
监听同时覆盖库文件与服务主体，基础目录文件映射为短模块名；排除主入口、公共服务入口、
热修器、监听器自身、预加载脚本和标准库扩展。这些启动代码以及新增、删除文件的变更通过重启生效。
节点先合并本次变更和失败实例积压的模块，对扫描到的源码内容进行编译，不执行候选函数。
任一文件语法错误都阻止整批分发，保留全部待更新模块供后续保存时重试。
通过预检查后，每个 VM 独立执行模块、校验并提交整批方法替换，返回 `updated` 和 `skipped` 模块列表；
某实例失败或响应超时，其完整待更新模块集保留至后续源码变更时合并重试，其他实例仍可完成更新。
服务不单独记录热修日志。节点根据实际更新结果，将模块映射为文件路径、去重排序，统一记录一次；
失败或部分成功也只输出一次汇总，全部跳过时不输出成功日志。
节点关闭先停止监听并等待在途批次结束，之后再清理业务服务。

内部调用使用 `rpc.call`、`call_no_timeout` 和 `send`。`call` 有默认超时，`call_no_timeout`
用于无超时等待服务初始化和清理完成。RPC 不自动重试：超时表示调用方停止等待，远端仍可能完成。
`send` 成功仅表示消息已交给 Skynet，不能当作远端执行确认。

管理命令为 `make server-status`、`make server-stop` 和 `make server-force-stop`。
它们通过回环地址的控制台访问 `.main`；普通关闭等待清理完成，强制关闭可在启动、运行或关服等待期间
由脚本显式触发，重复触发保持幂等。控制响应表示命令已接收，进程退出码表示最终结果。
`CONTROL_PORT` 可以覆盖目标端口。工作服务使用 `.client_1`、`.logind_1`、`.websocket_1` 等注册名，
网关使用 `.gateway`。状态查询并行收集服务状态，失联服务显示 `unavailable`。

## 连接与内部消息

```mermaid
sequenceDiagram
    participant C as 客户端
    participant G as gateway
    participant W as websocket
    participant L as logind
    participant A as client
    G->>W: accept(fd, address, logind)
    C->>W: LoginReq(username)
    W->>L: call handle_request(connection_id, ...)
    L->>A: call open(connection_id, websocket, username)
    A-->>L: 用户快照
    L->>W: call bind_client(connection_id, client_address)
    L->>W: call send_response(LoginRes)
    W-->>C: LoginRes
    L-->>W: 已处理
    C->>W: MessageSendReq
    W->>A: send handle_request(connection_id, ...)
    A->>W: send send_response(MessageSendRes)
    W-->>C: 任务已接受
    A->>W: 向用户所有连接推送更新
    W-->>C: SessionUpdatedNtf / MessageDeltaNtf
```

WebSocket 只按连接是否绑定 client 服务选择路由。未绑定时同步等待 logind，暂停当前连接的读取；
其他连接仍可并发处理，logind 对 WebSocket 的绑定和写入回调也能执行。绑定后异步转发给 client 服务。
`logind` 不保存连接级登录状态，也不参与登录后的转发。

登录严格按 `client.open → websocket.bind_client → websocket.send_response(LoginRes)` 编排。
绑定先于成功响应，客户端收到成功响应后可以立即发送业务消息。失败时先同步写响应，再关闭连接；
绑定前失败由 logind 清理该连接订阅，绑定后断线或写入失败由 WebSocket 通知 client 服务。
调用超时或处理结果不是 `true` 时，WebSocket 以 1011 关闭连接。

每次接入生成独立 `connection_id`，服务之间用该标识操作连接，fd 只用于本地 socket。
迟到回调、超时回调和写队列执行前都检查连接对象身份，避免 fd 复用时影响新连接。
连接移除与 client 服务断线通知至多发生一次。登录超时从接入开始计时，覆盖未完成握手的连接。

WebSocket 提供以下通用命令，第一参均为基础层上下文：

- `bind_client(connection_id, client_address)`：绑定存活连接，拒绝覆盖其他 client 服务。
- `send_response(connection_id, message_id, name, args)`：编码并串行写入；写完返回 `true`。
- `close_connection(connection_id, code, reason)`：移除连接、通知 client 服务并关闭；重复操作无副作用。

WebSocket 入口校验 protobuf 消息存在且属于 `Req` 请求方向。
client 服务以 WebSocket 的消息来源地址校验连接归属，再按协议短消息名调用 User 的同名方法。
命名与分发规则见[隐式约定](../../隐式约定.md)。
未知业务请求（包括重复登录）以 1008 关闭，处理异常以 1011 关闭。

## 配置与传输

服务器配置由 `server/etc/cfg/common.lua` 和 `channel/<name>.lua` 合并并统一校验，渠道通过
`SKYNET_CFG_CHANNEL` 选择。配置在启动时加载，变更后重启。

| 配置                                | 可用值 / 含义                                                               |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `runtime.control_port`              | 1..65535，仅回环监听的管理端口                                              |
| `agent_gateway.socket`              | `host`、`port`、以 `/` 开头的 `path`                                        |
| `agent_gateway.instance`            | `client`、`logind`、`websocket` 各为 1..32                                  |
| `agent_gateway.login_timeout_ticks` | 正整数，未绑定连接的存活时间                                                |
| `agent.llm`                         | `api_key`、`base_url`、`model`、正整数 `request_timeout_ticks`              |
| `agent`                             | 非空 `system_prompt`，正整数 `max_message_length` 与 `session_title_length` |
| `protocol.agent_gateway_schema_dir` | schema 目录                                                                 |

所有 `_ticks` 时间单位为厘秒。模型请求使用从发送到流结束的总截止时间，包含停滞流；超时后关闭
供应商连接并释放该会话的本轮占用。客户端发送命令只等待接受确认，任务通过推送跟踪。
本地回环连接可使用 `ws://`，其他地址必须使用 `wss://`，由反向代理终止 TLS。

`helper.protobuf.load` 只由 main 执行。消费者初始化时 `attach` 共享只读 schema，再由各自 VM 中的
`network.protocol` 对象建立本地类型映射。require 顶层不进行文件读取或切换 Protobuf 状态。
main 在整个进程生命周期内存活，不提前释放 schema。

## 外部消息格式

共享协议位于 `common/proto`，客户端生成代码位于 `client/src/protocol/generated`。
修改后执行 `make proto-generate` 和 `make proto-check`。

每帧是 `压缩标志 uint8 | 消息 ID uint32 | 类型哈希 uint32 | Protobuf args`，固定头为 9 字节，
多字节整数使用网络字节序。类型哈希按完整 Protobuf 消息名计算 FNV-1a 32 位哈希。
WebSocket 负责消息边界、长度和分片重组，业务层不再增加长度字段。

请求消息 ID 从 1 严格递增，达到 `2^32 - 1` 后关闭连接，服务端忽略已处理 ID。
普通响应复用请求 ID；`Ntf` 主动推送使用 ID 0，不进入请求的 pending 表。
`ret` 与 `common/enum/error_code.lua` 一致，1 为成功。错误详情与供应商堆栈只记录在服务器。

| 请求                                              | 成功内容                           |
| ------------------------------------------------- | ---------------------------------- |
| `LoginReq(username)`                              | 用户身份和所有会话的完整快照       |
| `UserSnapshotReq`                                 | 最新用户快照，用于重新建立同步基线 |
| `SessionCreateReq`                                | 新会话完整状态                     |
| `MessageSendReq(session_id, text, retry_run_id?)` | 接受确认和当前会话状态             |
| `MessageCancelReq(session_id, run_id)`            | 取消已确认，任务退出后再推送终态   |

`SessionUpdatedNtf` 在创建、开始生成、取消请求和最终完成时携带完整会话状态；
`MessageDeltaNtf` 携带会话、任务、消息 ID、增量和递增会话版本。
快照包含消息状态、部分回答和活动任务。消息状态分为生成中、完成、停止和失败。
时间为毫秒时间戳，业务 ID 为不透明字符串；`run_id` 跨连接稳定，与线路请求编号分离。

只接受二进制帧和 `Req` 方向消息。文本帧以 1003 关闭，损坏数据、未知哈希、非零压缩标志或消息 ID 0
以 1007 关闭，错误消息方向以 1008 关闭。未绑定时只接受 `LoginReq`，其他业务请求先返回登录错误，
再以 1008 关闭。入站消息上限为 256 KiB；附件应使用独立 HTTP 数据通道。

## 客户端请求与取消

客户端按三层组织：`WebSocketChannel` 管 socket，`RequestClient` 管编解码、消息 ID、pending、
超时和连接代次，`ChatClient` 把协议转换为业务对象。store 只使用业务 API，不解析 Protobuf。
Mock 实现二进制通道，复用相同的编解码和请求管理。

`connect(username)` 返回用户快照；`snapshot`、`createSession`、`sendMessage`、`cancelRun`
返回普通 Promise。主动更新通过 `subscribeUpdates` 订阅，连接状态通过 `subscribeConnection` 订阅。
超时、损坏响应或类型错配关闭连接并拒绝等待请求；业务错误只拒绝对应请求。
旧 socket、旧登录和旧命令的迟到结果不能修改新连接状态。

客户端先安装快照基线，再按会话版本合并登录期间缓冲的更新。重复和旧版本无副作用；
增量出现缺口时拉取完整快照，期间继续缓冲。完整会话状态可以跨版本直接覆盖较旧记录。
服务端快照复制可变消息，保证版本与内容对应。

选中会话按用户名保存在当前页面的 sessionStorage，用户名保存在 localStorage。
草稿只保留页面内存，各端互不干扰；会话选择不修改服务端用户数据。
断线保留已有展示，自动重连后取回用户数据，不自动重放发送命令。存储不可用时仍可输入用户名进入。
服务器重启后用户 ID 改变，客户端清除旧缓存并使用新快照。

每个会话最多一个生成，不同会话可以并发。生成任务由用户持有，全部连接离线后仍继续执行。
停止按会话和任务 ID 定位，所有端看到取消中状态；确认不表示占用已释放，任务退出后再广播停止终态。
取消已结束任务幂等成功，不存在的会话返回失败。服务关闭时取消所有任务并等待上游资源释放。

展示历史保留全部轮次，只有成功完成的对话进入模型上下文。最新失败轮次允许原位重试，
保留原用户消息和助手消息 ID，为新一轮生成分配新 run_id；后续已有新消息时旧失败轮次不能重试。
用户数据在进程存活期间保留，暂不设置离线过期或持久化。

## 安全与验证

控制台仅在回环地址监听。WebSocket 路径在握手阶段校验，模型密钥不进入客户端。
当前没有身份认证，非回环监听限于受控网络；对公网发布前需要认证、授权、限流和连接配额。
Tauri 不启用 shell、文件系统或任意命令插件，WSS 证书配置由反向代理管理。

`make check-all` 覆盖两端检查、真实 Skynet RPC 与热修、Protobuf 跨 VM、管理命令和假模型消息链路。
`make e2e` 验证真实 WebSocket 浏览器聊天；`make ui-e2e` 验证 Mock 场景的桌面、WebKit 和移动界面。
假模型可稳定复现取消、供应商失败和停滞流超时，不消耗真实模型额度。
