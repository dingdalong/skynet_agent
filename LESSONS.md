# Project Lessons

后续 agent 在相关多步骤任务开始前，先读本文件的强制检查，再检索与当前问题匹配的经验明细。

## 强制检查

<!-- 仅有三次不同日期复现且 Verified 的经验进入这里。 -->

## 经验明细

### L-001: 调用 Skynet 服务时必须显式传入协议名

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet, 服务间消息, `skynet.send`
- 触发：一个服务向另一个服务发送 Lua 命令或事件。
- 根因：`skynet.send(address, typename, ...)` 的第二个参数是协议名；省略后业务参数整体错位，接收端无法进入预期的 Lua dispatch。
- 解法：所有服务间调用都显式传入 `"lua"`，例如 `skynet.send(address, "lua", command, ...)`；单元测试同时断言协议参数。
- 证据：四服务网关首次集成时连接分发失败，补齐 `"lua"` 后同一 WebSocket 集成测试通过。
- Done right：新增服务间调用时，把地址、`"lua"`、命令和业务参数作为固定顺序检查，并用集成测试覆盖实际 dispatch。
- Seen: 1× (2026-11-04; task: 20261104T111203-agent-gateway-service-split.md)

### L-002: 引入 `etc/cfg/init.lua` 时同步配置模块搜索路径

- 类型：Success
- 状态：Verified
- 范围：Skynet, Busted, Lua 模块加载, `etc/cfg`
- 触发：新增项目根目录的 `etc/<name>/init.lua`，并在服务或单元测试中通过目录模块名加载。
- 根因：现有 Lua 搜索路径只覆盖 `src/lualib` 等业务目录，项目根目录下的 `?/init.lua` 不会自动命中。
- 解法：Skynet 的 `etc/config.path` 和 Busted 的 `BUSTED_LPATH` 都加入根目录 `?/init.lua`，随后用目录模块名直接加载配置。
- 证据：`server/etc/config.path` 与 `server/makefile` 加入根目录路径后，74 个单元测试和真实四服务进程集成测试通过。
- Done right：新增目录模块时同时检查运行时、测试和独立工具在使用的完整搜索路径。
- Seen: 1× (2026-11-04; task: 20261104T121127-server-cfg-layout.md; reused by: 20261104T202045-common-error-code-enum.md, 20261105T205715-base-module-path.md)

### L-003: 跨 realm 二进制消息使用 `ArrayBuffer.isView` 判断

- 类型：Pitfall
- 状态：Verified
- 范围：JavaScript, WebSocket, Node, Vitest, TypedArray
- 触发：协议层接收来自浏览器、Node 或测试环境的二进制视图。
- 根因：不同 JS realm 可以创建不同的 `Uint8Array` 构造器，依赖 `instanceof Uint8Array` 会漏判合法视图。
- 解法：用 `ArrayBuffer.isView` 判断二进制视图，并按 `buffer`、`byteOffset`、`byteLength` 归一化成 `Uint8Array`。
- 证据：修正 Websocket transport 的跨 realm 判断后，21 项客户端单测和 3 项浏览器全链路测试通过。
- Done right：在协议边界统一归一化二进制视图，业务层只处理 `Uint8Array`。
- Seen: 1× (2026-11-04; task: 20261104T154846-protobuf-directory-split.md)

### L-004: 跨语言协议向量同时锁定类型哈希和完整二进制业务帧

- 类型：Success
- 状态：Verified
- 范围：Protobuf, Lua, TypeScript, 跨语言协议测试
- 触发：两种语言通过消息名哈希和二进制信封通信。
- 根因：只校验业务消息 args 无法发现固定头字节序、消息 ID 或 FNV 哈希不一致；手工转录十六进制也容易破坏头部字段。
- 解法：共享向量同时保存完整类型名哈希和完整二进制业务帧十六进制，两端分别校验哈希、消息 ID 与解码结果。
- 证据：9 字节二进制帧向量接入后，Lua 协议单测、TypeScript codec 单测和四服务集成测试通过。
- Done right：协议变更时先生成完整业务帧向量，再让两端用同一向量验证编码器和解码器。
- Seen: 1× (2026-11-04; task: 20261104T154846-protobuf-directory-split.md)

### L-005: 使用 Protobuf 的 Skynet 服务必须在自身 VM 中加载 schema

- 类型：Pitfall
- 状态：Superseded
- 备注：2026-11-05 被 L-017 替代。原证据只证明各 VM 缺少本地哈希映射，不能证明 C schema 无法共享；
  当前依赖的 `pb.unsafe` 支持跨 VM 接入同一 schema，已通过真实多服务测试。
- 范围：Skynet, Protobuf, 独立 Lua VM, 服务初始化
- 触发：某个服务需要编码或解码 Protobuf，而启动脚本或其他服务已经调用过 `protobuf.load`。
- 根因：Skynet 每个服务拥有独立 Lua VM，通过 `pb.unsafe` 建立的全局 schema 和类型映射不会跨服务共享。
- 解法：在每个实际编解码服务的 `skynet.start` 回调中，按根配置重新加载 schema 并建立本地类型映射。
- 证据：WebSocket 服务缺少映射时首次集成报 `attempt to index a nil value (field 'hash_to_name')`；服务内加载后四服务 WebSocket 集成测试和完整 `server make check` 通过。
- Done right：把 Protobuf 初始化放在服务生命周期入口，并用真实多服务集成测试验证，不只测试启动脚本所在 VM。
- Seen: 1× (2026-11-04; task: 20261104T190820-binary-frame-routing.md)

### L-006: 公共 Lua 枚举放入 `common/enum` 并通过稳定模块名加载

- 类型：Success
- 状态：Verified
- 范围：Lua, Skynet, Busted, 公共枚举, 模块搜索路径
- 触发：多个服务或测试需要使用同一组协议值或错误码，并且项目禁止新增全局变量。
- 根因：把整数直接写到调用点会隐藏业务含义；建立公共枚举后若未同步运行时和测试搜索路径，又会在不同进程中出现加载差异。
- 解法：在 `common/enum/<name>.lua` 返回带 `---@enum` 注释的稳定 table，业务模块通过 `require("enum.<name>")` 使用；Skynet 与 Busted 的 Lua 路径都加入仓库级 `common` 目录。
- 证据：WebSocket 关闭码迁移后，`server make check` 的 81 项单测、四服务 WebSocket 和 hotfix 集成测试全部通过。
- Done right：只收录当前使用的枚举成员，用领域前缀避免公共表字段歧义，并用异常路径单测锁定映射值。
- Seen: 1× (2026-11-04; task: 20261104T202045-common-error-code-enum.md)

### L-007: 调整 require 加载时机时显式维护测试依赖

- 类型：Pitfall
- 状态：Verified
- 范围：Lua, Busted, 模块加载, 测试依赖注入
- 触发：将 `require` 提升到顶层或改为惰性加载，改变模块及其传递依赖的初始化时机。
- 根因：顶层加载可能让测试缺少下游依赖；改为惰性加载后，依赖其他模块间接预加载的测试也会失效。
- 解法：先列出完整传递依赖链，测试显式加载自身使用的依赖；重新加载被测模块前注入必要 mock，只清除受影响的模块缓存。
- 证据：`http.httpc` 提升到 `openai.skynet_compat` 顶层后，Agent 单测首次出现 12 项加载错误；补齐传递链 mock 后 82 项单测和完整 `server make check` 通过。
- 证据：LLM 合并后，适配器延迟到客户端初始化时加载；测试显式加载适配器后，213 项 Lua 单测通过。
- Done right：每个用例保存并恢复全部被替换的 `package.loaded` 项，避免测试顺序导致依赖串扰。
- Seen: 2× (2026-11-04; task: 20261104T204103-remove-runtime-accessors.md; 2026-11-08; task: consolidate-agent-llm)

### L-008: Protobuf 生成类型的标量属性按可缺省输入处理

- 类型：Pitfall
- 状态：Verified
- 范围：Protobuf, protobufjs, TypeScript, 协议边界
- 触发：消费 protobufjs 生成的 `$Properties` 标量字段，尤其是错误码、状态码或数值配置。
- 根因：生成类型把标量字段声明为可缺省且可空；即使 proto3 解码结果通常提供默认值，普通测试对象和局部消息对象也不保证字段已设置。
- 解法：协议边界的接收函数显式接受 `null | undefined` 并归一化默认值；业务成功判断仍严格要求等于对应成功码，不能把缺省值当作成功。
- 证据：响应 `ret` 改为 `int32` 后，`pnpm --dir client check` 首次出现 5 处 TS2345；归一化协议输入后，完整客户端检查、服务端检查和浏览器全链路测试通过。
- Done right：在协议边界统一处理缺省值，业务层只接收已归一化且含义明确的数据。
- Seen: 1× (2026-11-04; task: 20261104T210323-protobuf-ret-status.md)

### L-009: 进程级静态配置由实际消费者直接读取

- 类型：Success
- 状态：Verified
- 范围：Lua, Skynet, `etc.cfg`, 服务构造与依赖注入
- 触发：某个类需要读取进程启动时加载、变更后需重启的服务器配置。
- 根因：把静态配置当成多实例运行参数逐层传递，会让服务入口和业务类重复携带同一配置，并容易把测试 seam 混入构造接口。
- 解法：由实际使用配置的类直接 `require("etc.cfg")`；上层只接收动态值、连接级回调和实例相关数据。
- 证据：`AgentConnection`、`Gateway`、`WebsocketService` 改为配置直读后，格式检查、90 项单测和完整服务端集成检查通过。
- Done right：先判断配置的生命周期和作用域，再决定是否确实需要构造参数。
- Seen: 1× (2026-11-04; task: 20261104T233107-server-config-direct.md)

### L-010: 打包态验证必须使用最新桌面产物

- 类型：Pitfall
- 状态：Verified
- 范围：Tauri, Vite, macOS App, WebSocket 协议, 默认网关地址
- 触发：修改前端协议代码或默认网关地址后，通过已存在的 `.app`、快捷方式或安装包启动桌面客户端。
- 根因：生产桌面 App 在 Tauri 构建时嵌入 `dist`，重新打开旧 App 不会读取最新前端源码。
- 解法：日常使用 `make dev` 加载最新前端源码；Rust 或构建时注入的连接地址修改后重启开发进程。
  打包态验证执行 `make build` 或 `pnpm --dir client build:desktop`，确认实际运行的是最新产物。
- 证据：旧 App 构建于 11:13，当前协议源码更新于 20:58；重建后的 App 构建于 23:40，用户实测连接、登录和聊天正常。
  默认端口调整后，前端 dist 包含新网关地址；重建 App 的可执行文件包含对应资源名称且构建时间晚于该资源。
- Done right：按改动运行对应运行时的测试并验证 macOS App；仅在验证打包态时要求重新构建安装包，
  不把每次共享界面修改都升级为全平台打包验收。签名后的产物检查见 L-044 与 L-046。
- Seen: 1× (2026-11-04; task: 20261104T234320-tauri-stale-app.md; reused by: 20261105T202717-high-ports.md)

### L-011: 热更新类的构造函数不能捕获候选类表

- 类型：Pitfall
- 状态：Verified
- 范围：Lua, Skynet, class, metatable, hotfix
- 触发：模块返回类表，并通过模块内构造函数创建实例；热更新会替换类表中的函数。
- 根因：若构造函数闭包捕获候选类表，首次热修后新建实例会挂到不同于原模块表的类表；后续热修无法从稳定模块表更新这些实例。
- 解法：将 `base.class` 做成 callable table，由 `class()` 创建固定结构类表，并让 `new` 指向共享构造器；`ClassName:new()` 的冒号调用将稳定类表作为 `self`，构造函数只负责 `setmetatable({}, self)` 和动态调用 `ctor`。
- 证据：`class_fixture` 在单测和真实 Skynet runtime 中连续 v1→v2→v3 热修后，存量及新建实例均保持类表身份；迁移为 `class()` 后，94 项单测和完整服务端检查再次通过。
- 证据：LLM 收敛到单文件后，真实 runtime 连续两次热修保持 Base、Client、Request 及存量和新建实例的类表身份，SDK 方法继续动态委托。
- Done right：类工厂保持为 callable table，构造器不捕获具体类表，实例只保存数据，方法通过稳定类表动态查找。
- Seen: 1× (2026-11-05; task: 20261105T001954-lightweight-class-hotfix.md; reused by: 20261105T002822-callable-class-factory.md)

### L-012: 清理接口不能只看生产调用点数量

- 类型：Success
- 状态：Verified
- 范围：Lua, 服务端重构, 公开接口, 死代码清理
- 触发：准备删除生产环境没有调用、只有测试引用的函数，或合并一次性辅助方法。
- 根因：测试调用不能证明接口是公开能力，生产调用也不能证明接口没有文档承诺；只看调用点会把 `Agent:set_llm()` 这类已文档化能力误删，或保留纯转调层。
- 解法：同时检查生产调用、README/文档承诺和独立业务职责；保留真实协议、第三方兼容与热修边界，删除纯别名和未文档化的测试专用接口。
- 证据：保留 `Agent:set_llm()`，删除 `AgentService:connection_count()` 等接口并内联单调用辅助方法后，94 项单测和完整 `make check` 通过。
- Done right：先按边界和契约分类，再做机械清理；测试改为验证实际状态或真实业务路径。
- Seen: 1× (2026-11-05; task: 20261105T005124-over-abstraction-cleanup.md)

### L-013: 对照参考架构时必须追踪入口、协调者和状态载体

- 类型：Success
- 状态：Verified
- 范围：架构对照, Skynet, 服务职责, 登录流程
- 触发：参考项目有明显更简洁的服务文件，准备迁移其职责划分或解释当前实现为何更复杂。
- 根因：参考架构的完整流程通常分散在监听入口、连接协调服务、登录状态对象和业务服务中；只看单个子类文件会漏掉跨服务消息和状态归属。
- 解法：从监听入口沿调用链检查协调者、状态类、回调路径和断线清理，再按生命周期决定每个服务负责什么。
- 证据：对照 `skynet_server` 的 gated、logind 和 client 链路后，将登录编排集中到 logind；98 项单测、四服务聊天、协议边界、跨 VM Protobuf 和 hotfix 检查全部通过。
- Done right：先画清消息与状态生命周期，再比较代码量；不要把文件行数差异直接当成过度设计的证据。
- Seen: 1× (2026-11-05; task: 20261105T100120-logind-login-orchestration.md)

### L-014: 多服务共用命令名时保持线上参数一致

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet, 服务间消息, `handle_request`, 消息来源
- 触发：同一个命令会按连接状态发送给不同服务，或者多个服务实现同名命令。
- 根因：发送方只按目标地址切换时，容易复用一个服务的参数格式；接收方若还需要来源地址，直接从业务参数开头补齐会造成整体错位。
- 解法：发送方对各目标使用相同线上参数；接收服务在 `skynet.dispatch` 中使用 Skynet 提供的 `source` 补齐来源身份等传输上下文。
- 证据：WebSocket 统一发送 `handle_request(fd, message_id, name, args)` 后，logind 首次集成把 fd 当作来源地址并登录超时；改为 dispatch 注入 `source` 后，99 项单测、四服务探针和完整 `make check` 通过。
- Done right：统一命令接口先对齐参数顺序，再按服务职责决定哪些上下文由 dispatch 提供，并用真实多服务日志验证。
- Seen: 1× (2026-11-05; task: 20261105T101929-websocket-agent-routing.md)

### L-015: 短生命周期跨服务流程由调用方持有完成状态

- 类型：Success
- 状态：Superseded
- 范围：Skynet, 服务边界, 登录流程, 连接生命周期
- 触发：一个服务发起请求后调用另一个服务，又要求下游回调原发起服务来完成绑定、响应或清理。
- 根因：如果调用双方都保存同一次请求的完成状态，就必须额外协调重复请求、断线、回调失败和取消，容易形成状态表与生命周期竞态。
- 解法：流程能在一个调用结果中完成时，下游只返回结构化结果，调用方负责响应、绑定和基于结果的清理；只有确实需要跨多个请求或长期异步执行时才引入状态载体和回调。
- 证据：WebSocket 改为同步调用 logind 并接收 `LoginResult` 后，删除了 logind 的登录状态表、fork、取消和回调接口；104 项单测、全部服务端集成检查、前后端检查和 3 条浏览器全链路测试通过。
- Done right：先确认流程是否必须跨请求异步，再决定状态归属；不要仅因跨服务调用就复制连接生命周期。
- Seen: 1× (2026-11-05; task: 20261105T140754-stateless-logind-login.md)
- 备注：2026-11-05 被 L-016“流程所有者负责编排”的架构决策替代：登录由 logind 完成绑定、响应和
  失败关闭，WebSocket 同步等待布尔处理结果，仍无需 logind 维护连接级状态或消息队列。

### L-016: 流程所有者负责编排，同步等待维持连接内消息顺序

- 类型：Success
- 状态：Verified
- 范围：Skynet, WebSocket, logind, 服务职责, 连接生命周期
- 触发：业务流程需要回调传输服务完成绑定、响应和关闭，但不需要跨多个请求保存业务状态。
- 根因：只按调用方向划分编排职责，会使传输服务继续解释业务结果；复制登录状态又会增加生命周期协调。
- 解法：由 logind 按 `agent.open → websocket.bind_agent → websocket.send_response` 编排登录。
  WebSocket 同步等待布尔处理结果，暂停当前连接读取；logind 同步等待失败响应写入后关闭连接。
  绑定前失败由 logind 清理新建 Agent，绑定后断线或写入失败由 WebSocket 通知 Agent。
- 证据：调用顺序、响应写入等待和不同连接并发的协程单测通过；`make check-all` 通过 130 项服务端单测、
  全部服务端集成检查及前端检查；网关探针覆盖登录后紧接建会话帧、重复登录和非法首帧失败关闭；
  `make e2e` 的 3 条浏览器全链路测试通过。
- Done right：先确定业务流程所有者，再用同步等待维持同连接顺序；传输服务只提供通用接口，
  不解析业务结果，不为一次同步流程复制连接状态。
- Seen: 1× (2026-11-05; task: 20261105T144251-logind-flow-owner.md)

### L-017: 共享 Protobuf schema 与每 VM 的类型映射分别初始化

- 类型：Success
- 状态：Verified
- 范围：Skynet, lua-protobuf, schema 所有权, 服务启动
- 触发：多个独立 Lua VM 使用同一套 Protobuf 消息。
- 根因：`pb.unsafe` 的 C state 可以共享，Lua 哈希映射不能跨 VM；拥有共享 state 的 VM 必须长期存活。
- 解法：main 唯一执行 `helper.protobuf.load`，消费者初始化时显式 `attach`，再由各自的
  `network.protocol` 实例建立映射。require 顶层不进行 I/O 或共享状态切换。
- 证据：`protobuf_shared_smoke.sh` 验证独立 VM 编解码；四服务网关与 `make check-all` 通过。
- Done right：分别检查原生状态的所有权、启动顺序和本地索引；共享 schema 只读，持有者活到进程结束。
- Seen: 1× (2026-11-05; task: 20261105T154709-service-foundation-refactor.md)

### L-018: 取消确认不能作为生成占用已释放的依据

- 类型：Pitfall
- 状态：Verified
- 范围：Agent, 流式生成, 取消, 历史回滚
- 触发：客户端停止生成后立即再次发送，或取消发生于最后一个增量之后。
- 根因：取消确认早于模型调用退出；提前发送终态会让客户端开始下一轮，而服务端仍占用或提交已取消历史。
- 解法：取消先确认，模型退出后检查取消状态、回滚历史、释放占用，再发送唯一取消终态。
  客户端在终态前保持 `cancelling`，不靠固定延迟判断完成。
- 证据：网关探针与浏览器测试移除取消后的固定等待仍通过；conversation 单测覆盖最后增量后取消不提交历史。
- Done right：把确认和完成分成两个事件，并验证终态后立即操作和模型历史一致性。
- Seen: 1× (2026-11-05; task: 20261105T154709-service-foundation-refactor.md)

### L-019: 重连时异步失败清理也必须检查连接代次

- 类型：Pitfall
- 状态：Verified
- 范围：TypeScript, WebSocket, Promise, 登录流程
- 触发：旧连接已发送 LoginReq、尚未收到响应时开始重连。
- 根因：旧 Promise 被关闭后进入 catch，无条件清理共享 RequestClient 会关闭已经建立的新连接。
- 解法：业务登录流程也持有 generation，在 await 后和 catch 清理前检查归属，close 使旧代次失效。
- 证据：恢复旧无条件 close 逻辑时登录替换用例失败；恢复代次检查后同一用例通过，客户端完整检查通过。
- Done right：异步成功写入、失败清理和事件回调都检查归属，底层 socket 隔离不能替代上层流程检查。
- Seen: 1× (2026-11-05; task: 20261105T154709-service-foundation-refactor.md)

### L-020: skynet.send 的成功同时取决于异常和返回值

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet, RPC, 异步消息, 连接移交
- 触发：向失效服务发送消息，或发送的消息超过 Skynet 限制。
- 根因：`skynet.send` 对失效地址返回 nil、超大消息返回 false，均可能不抛异常；成功异步 session 是 0。
- 解法：`base.rpc.send` 同时检查 pcall 成功且返回 0；失败时记录日志并返回 `call_fail`，调用方回收未移交资源。
- 证据：底层 `lua-skynet.c` 返回契约、RPC 单测的 0/nil/false/异常分支、真实 VM 的存活/死亡服务发送通过。
- Done right：封装底层调用时先核对返回值契约，不能把不抛异常视为消息被接收。
- Seen: 1× (2026-11-05; task: 20261105T154709-service-foundation-refactor.md)

### L-021: 流式模型请求使用覆盖响应头和流读取的总截止时间

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet HTTP, SSE, 模型超时, 资源释放
- 触发：供应商已发送响应头或首个增量，后续流一直保持连接但无数据。
- 根因：`httpc.request_stream` 的响应头超时不约束后续迭代读取，单个连接可能长期处于忙碌状态。
- 解法：请求开始时计算 deadline，流读取期间用剩余预算定时关闭 stream；close 先置位以保证幂等。
- 证据：假模型 `[e2e:stall]` 超时后同连接可继续发送；单测验证超时和正常结束后的迟到定时器不重复释放。
- Done right：同时测试首包等待、流停滞、资源释放与下一轮可用性，RPC 超时不能替代外部 I/O 取消。
- Seen: 1× (2026-11-05; task: 20261105T154709-service-foundation-refactor.md)

### L-022: 进程关闭测试必须检查正常退出码

- 类型：Success
- 状态：Verified
- 范围：Skynet, 管理命令, 进程关闭, macOS
- 触发：管理命令关闭服务，探针发现 PID 或端口已经消失。
- 根因：进程消失同样可能来自原生崩溃，不能单独证明正常关闭。
- 解法：探针确认服务状态和进程结束后，启动脚本还需 wait 并校验退出码；节点在业务资源回收后直接退出。
- 证据：初版管理探针判成功但 shell 报原生崩溃；补充退出码校验、采用节点退出路径后，同一测试正常退出 0。
  真实网络探针验证空闲连接和两个在途模型请求均释放；隔离 fixture 验证正常、在途登录、慢初始化和
  慢清理退出 0，清理失败及启动、运行、关服阶段的显式强制关闭退出 1，单个服务失败不阻止其他清理。
- Done right：关闭测试同时验证资源释放、进程消失和退出码，失败时保留日志。
  进程退出前的异步日志不能单独作为完成标志；fixture 使用明确的 stderr 标记与退出码。
  测试脚本持有进程 PID 并独立限制等待，不能仅依赖被测服务内的 watchdog：服务退出会同时销毁定时器。
- Seen: 1× (2026-11-05; task: 20261105T154709-service-foundation-refactor.md; reused by: 20261105T171744-graceful-shutdown.md, 20261105T184136-endless-lifecycle.md)
- 备注：本机 `skynet.abort` 后在 `_pthread_tsd_cleanup` 崩溃的底层原生组件根因仍为 Open；未修改第三方库。

### L-023: 服务主体归入服务目录，main 保持独立入口

- 类型：Success
- 状态：Verified
- 范围：Skynet, 服务目录, 模块搜索路径, 热更新
- 触发：新增服务或调整服务主体、服务对象与公共模块的归属。
- 根因：用户明确要求以 service 为主体组织代码；服务主体若混入 lualib，会模糊服务与其创建对象的边界。
  目录迁移还会改变模块解析与热修监听映射，必须保持二者使用同一模块名。
- 解法：业务服务共用 `service/init.lua`，通过 SERVICE_NAME 加载 `service/<name>/<name>.lua` 主体，
  服务创建的对象与公共模块保留在 lualib；独立 `src/main.lua` 通过 `node.init(callback)` 定制业务启动，
  node 统一公共初始化、服务登记、状态与关闭，复用 Service 实例的初始化与命令分发。
  node 不识别业务服务名称；业务 schema、服务清单、依赖参数与显式注册名由 main 决定。
  Node 类表从模块导出，运行期缺陷可热修；启动回调只执行一次且不保存到实例，启动编排调整通过重启生效。
  运行时、Busted、LuaLS 与热修监听器同步采用唯一服务模块名，不保留旧别名。
  基础目录直接使用短模块名，require、package.loaded 缓存键与 watcher 映射保持一致。
  通用 Service.start 只按模块名加载服务主体，主节点的启动与初始化统一由 node.init 承担。
- 证据：`make server-check` 的 123 项单测及全部集成检查通过，`make e2e` 的 3 项浏览器链路通过；
  service runtime 测试从新目录加载模块并执行真实 `debug/HOTFIX`，已有实例的方法版本更新，
  类表身份与业务数据保持不变；watcher smoke 验证服务主体映射和启动脚本过滤。
  基础模块短名迁移后，150 项单测及全部服务端集成通过，watcher 同批与单独保存基础文件均发送短模块名。
  main 合并生命周期后，151 项单测及全部服务端集成通过；单测与关服 fixture 直接加载真实 main 入口，
  覆盖启动失败回收、状态查询、重入、慢初始化及慢清理、在途登录和三个阶段的显式强制退出。
  调整为 main 启动回调与共享 node 后，158 项单测及全部服务端集成通过；两个不同节点回调复用公共初始化，
  关服 fixture 使用公开 node.init 接口创建测试服务，业务名称与 schema 留在 main。
  公共服务入口合并后，161 项单测及全部服务端集成通过；服务主体的短模块名与既有实例热修保持有效。
- Done right：main 定制节点业务，node 复用公共生命周期；模块名贯穿加载、测试和热修，用真实 HOTFIX 验证已有实例。
- Seen: 1× (2026-11-05; task: 20261105T161319-service-layout-hotfix.md; reused by: 20261105T205715-base-module-path.md, 20261105T231206-main-lifecycle.md, 20261105T233921-shared-node.md)
- 备注：目录迁移本身需重启生效；热更仍仅适用于接口和数据格式兼容的缺陷修复。
  LuaLS 存在既有告警，本次迁移未引入新的业务源码告警。

### L-024: 关闭成功必须等待在途工作并汇总迟到的释放错误

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet, 服务生命周期, 后台生成, HTTP 取消
- 触发：连接已从连接表移除，但模型请求仍在执行；取消发生于响应流取得前，或资源释放会让出协程。
- 根因：连接移除和取消确认都不代表后台完成；只看取消当时的返回值，会遗漏稍后出现的释放错误。
- 解法：基础层计数并等待在途命令，Agent 独立登记后台请求；关闭先保存全部请求引用，再取消、等待，
  最后汇总释放错误。main 按依赖逆序调用 close，无超时等待实际完成；异常情况仅由脚本显式强制关闭。
- 证据：新增迟到释放失败用例先复现错误成功结果，修复后通过；并发结束用例验证等待期间请求移出集合
  仍能收集失败。`make server-check` 的 140 项单测、真实关服与全部集成检查通过，`make e2e` 的 3 项通过。
- Done right：把“已请求取消”“后台结束”“资源释放成功”分别验证；以 close 最终结果决定进程退出码。
- Seen: 1× (2026-11-05; task: 20261105T171744-graceful-shutdown.md; reused by: 20261105T184136-endless-lifecycle.md)
- 备注：沿用 Skynet HTTP，建连和响应头阶段只能先标记取消，取得流后释放，模型请求本身的超时仍生效。

### L-025: 服务生命周期无超时，启动期也保留显式强制关闭入口

- 类型：Success
- 状态：Verified
- 范围：Skynet, 服务启动, 关服, RPC, 管理控制台
- 触发：调整服务生命周期的等待策略或异常脚本入口。
- 根因：用户确定启动和关闭都不应超时；普通业务 call 的默认超时不能用于生命周期。
  原控制台在业务服务全部启动后开放，且 main 初始化期间拒绝普通命令，启动卡住时无法执行强制关闭。
- 解法：初始化与清理使用 call_no_timeout，普通 call 保留默认超时，超时请求实现为私有辅助函数。
  main 先开放回环控制台，initializing_commands 仅放行 force_shutdown；force-stop 跳过清理并退出 1。
- 证据：慢初始化和慢清理各等待超过默认 RPC 时限后正常完成；真实控制脚本分别在初始化挂起、正常运行、
  关服挂起时强制关闭并验证退出 1；单测覆盖防重入及强制请求与正常退出的竞争。
- Done right：生命周期等待和业务超时分别验证；启动期强制入口同时检查控制台开放顺序与命令白名单。
- Seen: 1× (2026-11-05; task: 20261105T184136-endless-lifecycle.md)

### L-026: 本机监听默认端口使用 10000 以上并同步所有调用地址

- 类型：Success
- 状态：Verified
- 范围：本机开发, Skynet, 管理控制台, 测试, Vite, Storybook, Tauri
- 触发：新增或调整项目监听端口，或主机上的其他应用已占用默认端口。
- 根因：用户确定全部项目监听默认端口迁移到 10000 以上；原管理端口和 Storybook 端口分别与
  Python、Godot 冲突，单独修改监听配置会使控制工具、客户端、测试和桌面开发配置失配。
- 解法：先检查主机监听状态，再按用途分配不同端口；同步监听配置、连接地址、管理工具、测试和桌面产物，
  保留现有覆盖入口，文档引用配置源。
- 证据：146 项服务端单测和全部服务端集成、32 项客户端单测、15 项 UI 回归及 3 项真实浏览器链路通过；
  Storybook 新端口返回 HTTP 200 与有效索引；默认管理命令控制开发渠道正常退出 0，App 和 DMG 重建成功。
- Done right：将运行配置、调用方、测试与内嵌产物作为同一调整范围，并验证默认管理命令而不仅是测试渠道。
- Seen: 1× (2026-11-05; task: 20261105T202717-high-ports.md)

### L-027: 使用 Skynet loader 全局时分别适配 Busted 与 LuaLS

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet, SERVICE_NAME, Busted, LuaLS
- 触发：业务代码直接读取 Skynet loader 已提供的全局。
- 根因：离线 Busted 不经过 loader，LuaLS 的 Skynet 声明库也未包含 SERVICE_NAME；运行时可用并不代表测试和编辑器已识别。
- 解法：生产代码直接读取框架变量；Busted 用 loadfile 的独立环境提供变量并恢复模块缓存；
  .luarc.json 的 diagnostics.globals 登记框架变量，不在生产代码或测试全局环境新增赋值。
- 证据：服务日志的 11 项单测及 make server-check 的 148 项单测和全部集成通过；
  静态检查中 base/service.lua 的五处 undefined-global 消除，其他既有告警保留。
- Done right：分别验证 loader 初始化、隔离测试环境和编辑器声明，并测试服务名与业务模块名不同的情况。
- Seen: 1× (2026-11-05; task: 20261105T204330-service-name.md)

### L-028: 标准库扩展统一预加载，并排除带副作用的热修候选

- 类型：Success
- 状态：Verified
- 范围：Lua 5.5, Skynet, Busted, 标准库扩展, 热更新
- 触发：将公共表工具合并到标准库，或依赖每个服务 VM 都存在的扩展方法。
- 根因：Lua 已预加载标准库 table，require("table") 不会搜索项目同名文件；
  扩展若只在 main 安装，其他 VM 和离线测试仍不可用；热修候选若直接执行扩展，会在校验前修改共享标准库。
- 解法：按用户确定的方式，在 luaext.table 中定义 table.copy、table.deep_copy，业务直接调用；
  Skynet 各配置与 Busted --helper 使用同一 preload。热修入口先拒绝 preload、luaext.*，watcher 同步过滤。
- 证据：重复预加载、标准库原方法、复制语义和热修拒绝单测通过；真实父子 VM 分别调用复制方法；
  make server-check 的 150 项单测及全部集成通过。LuaLS 未增加业务源码告警。
- Done right：启动前安装一次标准库扩展，保持原 table 身份和标准方法，修改初始化代码后重启。
- Seen: 1× (2026-11-05; task: 20261105T205715-base-module-path.md)

### L-029: 固定公共服务入口放在独立和内置服务入口之后

- 类型：Success
- 状态：Verified
- 范围：Skynet, loader, luaservice, SERVICE_NAME, 服务入口
- 触发：将逐服务重复 init.lua 合并成统一入口，或调整服务脚本搜索顺序。
- 根因：loader 按 luaservice 顺序查找可加载文件；固定公共路径对所有服务名均可加载，提前放置会接管内置服务。
- 解法：独立和定制脚本优先，内置服务其次，公共 service/init.lua 最后；公共入口调用 service.start(SERVICE_NAME)。
  主体继续按短模块名返回稳定类表；生产与测试配置采用同一规则，定制测试别名仍使用显式入口。
- 证据：单测在隔离环境执行真实 loader，验证生产与两份集成配置的 12 个入口选择及 SERVICE_NAME；
  make server-check 的 161 项单测及全部集成通过，覆盖主体不存在时启动失败、服务热修、watcher 过滤与关服。
- Done right：入口查找与业务 require 分别核对，使用真实 loader、真实服务启动及 HOTFIX 验证整个加载链路。
- Seen: 1× (2026-11-06; task: 20261106T000138-common-service-entry.md)

### L-030: 客户端承载服务与智能体业务使用独立术语

- 类型：Success
- 状态：Verified
- 当前约定：2026-11-08 用户确认模型调用与历史对象就是 Agent，直接由 `agent` 模块导出，
  会话字段使用 `session.agent`。下文原先使用 Conversation、预留 Agent 名称的部分已被替代；
  client、connection、session、user 的职责区分仍适用。
- 范围：Skynet, client, connection, session, Conversation, Agent, 服务命名
- 触发：Skynet 承载连接的服务与智能体业务同时使用 agent 名称，准备扩展用户或智能体实体。
- 根因：服务池实例、连接上下文和模型对话对象共用 Agent 名称，会混淆承载容量、用户身份和智能体身份。
- 解法：按用户决定，承载服务使用 client，单条连接使用 connection，聊天会话使用 session，模型调用和
  历史对象使用 Conversation；user 与 Agent 分别留给用户身份和智能体业务，当前不引入新实体。
  同步模块、注册名、配置、RPC、字段、日志、文档、watcher 和前后端测试；智能体业务配置与协议命名保留。
- 证据：make server-check 的 161 项单测及全部集成通过；真实 client 服务按新模块名 HOTFIX 后，
  同一连接的会话、展示历史和模型上下文保持可用；make proto-check 与 3 项浏览器全链路测试通过。
- Done right：先按业务职责和生命周期定义术语，再沿启动、分配、绑定、路由和清理链路统一名称；
  同时核对依赖路径排序的测试预期与界面错误文案，避免遗漏派生断言。
- Seen: 1× (2026-11-06; task: 20261106T004209-client-agent-naming.md)
- 备注：模块名、内部 RPC、配置和实例字段的重命名通过重启生效；热修验证针对新结构运行后的兼容方法替换。

### L-031: 热修验证同时确认触发机制、目标 VM 和实际更新模块

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet, HOTFIX, 自动监听, 多实例, WebSocket 存量连接
- 触发：保存方法体后行为未改变，或某个服务的 HOTFIX 成功但其他服务仍执行旧代码。
- 根因：保存源码本身不执行 HOTFIX；各服务拥有独立模块缓存，单目标命令只更新一个 VM。
  未加载模块原先会跳过并返回成功，不能据此推断目标业务模块或其他实例已经更新。
- 解法：返回 updated/skipped 报告；按用户决定，仅 develop 在节点业务启动完成后监听源码内容，
  将变更发给 .main 和全部登记且已就绪的实例。各 VM 整批校验，失败实例保留完整批次至下次源码变更重试。
- 证据：173 项单测与完整 make server-check 通过；隔离源码副本建立四条连接后，直接保存方法修改，
  未发送 HOTFIX，两个 WebSocket 与两个 client 的存量连接均调用新实现，显示历史与模型上下文保留。
  语法错误阻止同 VM 整批提交，修正单文件后完整重试通过；.main 与共享 rpc 模块自动更新，正常关服退出 0。
- Done right：自动监听集成使用独立源码树与测试进程；先建立连接再修改副本，通过实例地址和真实业务结果
  验证覆盖范围。每个 logind 独立轮询 client，连接数量应覆盖各池的完整分配周期。
- Seen: 1× (2026-11-06; task: 20261106T105138-develop-auto-hotfix.md)
- 备注：新增监听器是启动流程变更，首次启用需重启；热修仍只用于接口、方法集合与数据格式兼容的缺陷修复。

### L-032: 多 VM 热修先统一编译，由节点集中记录批次结果

- 类型：Success
- 状态：Verified
- 范围：Skynet, Lua, 自动热修, 编译检查, 日志, 失败重试
- 触发：同一份错误源码被分发至多个服务，或一次保存产生逐实例重复日志。
- 根因：各 VM 独立校验只能保证自身整批提交，无法在分发前拦截公共语法错误；
  服务与协调节点同时记录结果会重复输出，模块数量也不能直接表示实际更新文件。
- 解法：用户确定节点只编译、不执行候选顶层；以 load(源码内容, @路径, t) 检查扫描快照，
  合并全部积压模块，任一语法错误阻止整批分发并保留待更新项。
  VM 保留执行和结构校验但只返回结果；节点对实际更新文件去重排序，只记录一次成功或错误汇总。
- 证据：新回归用例在旧代码下因错误源码仍发出 3 个请求而失败，修改后通过；
  make server-check 的 179 项单测及全部集成通过，make e2e 的 3 项浏览器链路通过。
  隔离集成验证跨 VM 语法错误拦截、单文件修正后整批恢复、执行失败、部分兼容性失败及后续重试，
  各批次均只有一条节点结果日志，存量连接与历史保留。
- Done right：把不依赖 VM 状态的编译检查前置，保留 VM 内状态相关校验；成功日志只使用真实更新报告，
  失败实例保留模块与文件路径，不能只重试后来被修改的单个文件。
- Seen: 1× (2026-11-06; task: 20261106T111902-hotfix-preflight-summary.md)
- 备注：预检查不执行候选模块，也不能替代 VM 内执行与兼容性检查；所有目标均跳过时不输出成功日志。

### L-033: 运行对象登记必须早于可能同步失败的传输调用

- 类型：Pitfall
- 状态：Verified
- 范围：TypeScript, Pinia, RequestClient, 同步回调, 重入
- 触发：BinaryChannel.send 抛错，RequestClient 在 sendMessage 返回前同步通知连接终止。
- 根因：先调用传输层、返回后才登记 activeRun，导致断线清理找不到运行对象；随后登记旧对象，
  completed 的拒绝又被代次检查忽略，界面残留 streaming。
- 解法：调用前登记运行归属，返回后复核代次与身份；统一收尾，拒绝时回滚消息占位并保留草稿，
  即使连接失效也接住 completed 的拒绝。
- 证据：旧实现通过真实 ChatClient 和失败通道复现连接 error、runState idle、回答 streaming；
  同一场景回归在修复后通过，完整 42 项单测、42 项 UI 回归和 4 项真实网关链路通过。
- Done right：同时测试同步抛错、同步断线通知、异步拒绝和旧连接迟到结果；代次检查不能代替先登记所有权。
- Seen: 1× (2026-11-06; task: 20261106T194753-client-state-interactions.md)

### L-034: 会话恢复操作保存所属会话和消息身份

- 类型：Pitfall
- 状态：Verified
- 范围：Vue, Pinia, session, retry, draft
- 触发：会话发送失败后切换到另一会话，再点击重试。
- 根因：全局失败文本不携带会话与消息身份，重试使用当前会话 ID，且切换时覆盖原展示消息。
- 解法：按会话保存展示、草稿和重试上下文，服务端确认切换后复用本连接缓存；重试绑定原会话、
  原用户消息和失败回答，只替换该回答并使用新请求 ID。
- 证据：旧实现稳定复现 s1 失败文本被重发至 s2；新单测和真实网关浏览器链路验证切换隔离、
  返回后重试、新请求 ID 和唯一用户消息，独立草稿浏览器回归通过。
- Done right：重试始终绑定所属会话和消息，切换会话不得转移重试目标；中屏会话与上下文均使用抽屉。
- 备注：2026-11-07 的 user 架构替代旧连接生命周期：展示消息与失败记录由服务器用户持有，重连恢复；
  草稿保留在页面内存，重连保留、reload 清空。用户生命周期约定见 L-040。
- Seen: 1× (2026-11-06; task: 20261106T194753-client-state-interactions.md)

### L-035: 存储故障同时区分应用代码、开发依赖和生产构建

- 类型：Pitfall
- 状态：Verified
- 范围：Vue, Pinia DevTools, localStorage, Vite, 浏览器测试
- 触发：浏览器拒绝存储读写，或 localStorage 属性访问本身抛错。
- 根因：主题模块顶层访问存储可阻断应用导入；即使主题已容错，开发态 Pinia DevTools 的
  getTimelineLayersStateFromStorage 仍可能在应用挂载前抛错。
- 解法：延迟读取主题，分别捕获读取、写入及属性访问异常；开发回归隔离应用主题键，
  生产构建另验证完整存储故障，不修改第三方模块。
- 证据：主题单测和三种浏览器配置回归通过；生产包在 Chromium、WebKit 分别封锁读取、写入和
  localStorage 属性访问，六种组合均正常挂载、切换主题且无 pageerror。
- Done right：先用异常堆栈确认所属模块，再选择验证入口；不把开发依赖故障误判成应用容错失败。
- Seen: 1× (2026-11-06; task: 20261106T194753-client-state-interactions.md)
- 备注：Pinia 开发工具的全面存储限制仍属于第三方开发依赖边界；生产包已独立验证。

### L-036: 主题验证覆盖实际明暗和原生控件的完整配色

- 类型：Pitfall
- 状态：Verified
- 范围：Vue, Tauri, macOS WebView, CSS Token, 明暗主题
- 触发：系统深色时点击主题按钮，或从深色切回浅色。
- 根因：偏好值的 system/light/dark 循环不保证每次改变实际明暗；仅检查根属性和页面背景又会
  漏掉原生 WebView 部分控件未更新的问题。原浅色选择器没有声明语义色，依赖深色规则移除后
  回退基础值，在实际 Mac 窗口中出现按钮与选中会话残留深色；具体引擎内部原因尚未确认。
- 解法：按钮按当前偏好与系统实际明暗切换；浅色与深色均显式声明完整语义色，并保证高对比度
  和强制颜色规则覆盖显式主题。保留常规动效验证按钮、选中项、文字与背景，而不只检查根背景。
- 证据：CUA 在原生窗口复现颜色残留，等待与 Raise 均未恢复；生成完整浅色语义色并重建后，
  原生窗口浅色→深色→浅色的控件配色正常。62 项单测、51 项浏览器回归及 5 项真实测试网关链路通过。
- Done right：分别验证系统主题、手动偏好与刷新恢复；Playwright WebKit 不能替代实际 macOS App 检查。
- Seen: 1× (2026-11-06; task: 20261106T203243-client-session-theme-parity.md)

### L-037: 扩展作用域通过实际提示目录与运行时工具共同验收

- 类型：Success
- 状态：Verified
- 范围：skynet_agent 的 Codex 项目配置、技能、插件和 MCP
- 触发：把用户扩展从全局启用改为按项目启用，或确认扩展是否占用当前模型目录。
- 根因：管理清单保留禁用 MCP，也可能列出不进入模型可见目录的系统技能；清单条目数量不能代表实际启用状态。
- 解法：分别检查实际提示目录、技能的 repo 来源、有效配置覆盖和运行时连接状态；禁用 MCP 应为 disabled 且零工具。
  用户技能按规范路径禁用后，项目使用独立副本，避免软链接解析到同一原件。
- 证据：桌面版及 Homebrew CLI 的项目提示目录均为 7 项技能，项目外为 4 项；skills/list 确认项目技能来源，
  临时会话确认统一电脑操作插件 connected，三个直接 MCP 均 disabled 且零工具。
- Done right：保留原始文件和修改前备份，通过项目配置与实际目录验证效果；浏览器宿主不可用单独记录，不扩大为配置失败。
- Seen: 1× (2026-11-06; task: 20261106T232329-codex-project-extensions.md)
- 备注：原生应用只读验证通过；当前会话浏览器访问宿主不可用，浏览器页面实操未完成。

### L-038: 远程组件接入同时核对基路径、完整导入链与共享样式

- 类型：Success
- 状态：Verified
- 范围：Vue, 托管组件清单, 源码复制, CSS Token
- 触发：用户提供组件清单与 sourceUrl，项目没有组件库仓库源码。
- 根因：清单中的根相对 URL 不一定包含部署前缀；npm dependencies 也不包含 Vue 子组件与网站级 CSS 变量。
- 解法：先按服务响应解析实际基路径，再读取用法、参数、依赖和完整源码，核对导入与主题变量；只复制业务需要的组件，将共享样式接入项目 Token。
- 证据：原 /agent 路径返回带基路径提示的 404，修正为 /beautiful-ui-vue/ 后读取成功；四个源文件复制并接入真实聊天，65 项单测与 67 项 UI 回归通过。
- Done right：不按 dependencies 为空推断组件完全独立；核对源码中的本地导入、全局样式、模拟数据与定时演示逻辑。
- Seen: 1× (2026-11-07; task: 20261107T001828-beautiful-chat-page.md)

### L-039: 自托管字体同时验收实际加载与生产授权产物

- 类型：Success
- 状态：Verified
- 范围：Vite, Storybook, Tauri, 本地字体
- 触发：把远程字体改为随 Web 和 App 分发的本地资源。
- 根因：font-family 声明不能证明字体成功加载；未被引用的授权文件不会因放在源码目录而自动进入产物。Storybook 已合并所属包的 Vite 配置，重复登记插件会重复发射资产。
- 解法：固定官方字体版本并保留原作者授权；共享构建插件输出授权文件，由 Storybook 复用所属包配置；浏览器检查实际 FontFace 加载与字体请求来源。
- 证据：Inter、JetBrains Mono 在 Chromium、WebKit 和移动配置中均通过本地字体加载检查；Web 与 Storybook 构建的 licenses 文件与原件逐字节一致，移除重复登记后没有重复发射警告。
- Done right：检查 FontFace.status 为 loaded 和最终产物，不把计算样式中的字体名称或源码中的授权文件当成分发已验证。
- Seen: 1× (2026-11-07; task: 20261107T001828-beautiful-chat-page.md)

### L-040: 用户数据与任务的所有者独立于连接

- 类型：Success
- 状态：Verified
- 范围：Skynet, user, connection, session, 断线恢复, 多端同步
- 触发：用户要求 reload、断线或退出后仍能恢复服务器进程内的数据。
- 根因：连接拥有会话与任务，导致业务状态跟随短期网络连接销毁；线路请求编号也无法跨连接定位任务。
- 解法：用户确认按用户名识别 user、允许多端在线，各端独立浏览与草稿，每会话一条生成，离线继续生成，
  保留全部消息状态。按用户名固定路由，user 持有数据和模型上下文，connection 只保存订阅，任务使用稳定 run_id。
- 证据：172 项服务端单测、真实网关探针及 9 项浏览器全链路通过；原生 Mac 测试 App 重开后自动恢复消息，
  假模型 history-check 返回“E2E 历史通过”。完整检查含热修、关服、资源释放；70 项 UI 回归通过。
- Done right：业务 ID 加入随机部分，避免服务器重启后复用服务内计数；失败或停止只保留展示，成功轮次才提交模型上下文。
- Seen: 1× (2026-11-07; task: 20261107T123250-user-owned-sessions.md)
- 备注：当前仅凭用户名识别，无密码认证；服务器重启清空数据。旧连接独占及重连清空展示的约定已被此条替代。

### L-041: 实时恢复先固定快照内容，再按版本合并推送

- 类型：Pitfall
- 状态：Verified
- 范围：Lua, TypeScript, snapshot, streaming, 多端同步
- 触发：生成持续修改消息，同时客户端登录或重新拉取完整状态。
- 根因：浅拷贝消息数组仍共享消息对象，版本会对应后续变化的内容；快照返回期间推送也可能先到。
- 解法：深拷贝快照中的可变消息，登录期间缓冲更新；按会话递增版本忽略重复和迟到数据，增量缺口重新获取快照。
- 证据：单测在生成结束后确认旧快照仍为 streaming、恢复快照为 completed；客户端覆盖登录基线、重复增量、
  缺口期间缓冲和迟到快照；真实浏览器生成中 reload 只发送一条命令并恢复完整回答。
- Done right：完整状态可覆盖较旧版本，增量必须连续；版本与业务任务 ID 一起校验，不能仅凭当前网络连接判断归属。
- Seen: 1× (2026-11-07; task: 20261107T123250-user-owned-sessions.md)

### L-042: 客户端接口由协议与路由目标的同名方法共同定义

- 类型：Success
- 状态：Verified
- 范围：Skynet, protobuf, ClientService, 请求分发, 命名约定
- 触发：新增客户端请求或调整请求路由，准备手工维护请求名称白名单。
- 根因：WebSocket 已校验已加载协议及 Req 方向，再登记一份请求名映射会增加重复维护点；
  删除映射后，需要明确内部方法和客户端接口的命名边界。
- 解法：按用户确认的[隐式约定](隐式约定.md)，每次请求按协议短消息名查找 User 方法，
  保留连接来源、函数类型和异常检查；AGENTS.md 并列要求读取编码规范和隐式约定。
- 证据：182 项单测与 protobuf 跨 VM、网关、自动热修、热修运行时、服务运行时及关服检查通过。
- Done right：沿真实入口确认校验职责；用网络入口测试约束内部方法不可达，避免重新引入重复登记表。
- Seen: 1× (2026-11-07; task: 20261107T132610-protocol-name-dispatch.md)

### L-043: App 依靠推送同步数据，取消面向用户的页面刷新

- 类型：Success
- 状态：Superseded
- 范围：Tauri, Vue, WebSocket, 平台快捷键
- 触发：用户观察到 App reload 断开长连接，并确认 App 不需要手动刷新。
- 根因：页面 JavaScript 持有的 WS 随完整文档重载销毁；业务数据已经通过推送和快照自动同步。
- 解法：按用户决定，在 App 根组件安装宿主专用刷新快捷键拦截，卸载时清理；保留 Web 原生刷新、
  开发工具重载和现有断线恢复，不新增刷新请求或改变连接所有权。
- 证据：90 项客户端单测及 2 项设计系统单测、10 项真实网关全链路、70 项 UI 回归通过；独立 macOS
  release App 经过刷新组合键后保留输入和草稿，生成持续完成，退出前始终为 1 条连接和 1 次登录。
- Done right：连接回归只统计业务网关，排除 Vite 的 HMR 连接；原生验证使用独立 App 与假模型，
  验证后重新构建默认地址的正式 App 和 DMG，核对打包二进制与 release 二进制哈希一致。
- Seen: 1× (2026-11-07; task: 20261107T134716-app-reload-policy.md)
- 备注：2026-11-07 用户指出右键 Reload 仍会重载，确认连接与本地状态迁入 Rust；快捷键拦截方案已移除，
  当前规则见 L-044。以上证据仅对应当时的快捷键实现。

### L-044: App 页面重载只替换订阅，连接与协议状态由 Rust 核心统一持有

- 类型：Success
- 状态：Verified
- 范围：Tauri, Vue, WebSocket, Protobuf, 页面生命周期
- 触发：App 页面重载导致 WS 断开，屏蔽快捷键仍不能覆盖右键、原生或脚本重载入口。
- 根因：socket、登录、递增请求编号及 pending 都由页面持有，完整文档重载会销毁所有者。
- 解法：应用级 Rust 核心统一管理连接、请求、重连、服务端缓存及按窗口保存的草稿和选择；
  Vue 重建后重新订阅，旧页面使用订阅编号隔离；原生菜单隐藏 Reload，内部重载保留，Web 刷新保持原样。
- 证据：macOS 独立原生夹具执行 5 次真实文档加载，包含发送待确认时重载及 location.reload，
  重载期间只有 1 条 WS 和 1 次登录，草稿与选择恢复；失败重试、取消、真实断线重连及切换用户通过。
  核心通过 11 项 Rust 测试，客户端通过 64 项测试，Web 真实网关 9 项及 UI 70 项回归通过。
- Done right：原生夹具使用独立 App 标识；业务端到端连接真实供应商，异常注入使用假模型集成。
  直接记录网关帧的连接、请求编号和类型，
  同时校验持续递增编号、无重复登录及不重放命令。首次文档加载前固定测试登录偏好，避免与自动恢复竞争。
- Seen: 1× (2026-11-07; task: 20261107T150358-native-chat-core.md)
- 产物检查：签名会修改二进制；签名后的包与 release 按 Mach-O UUID 比对，并独立验证 bundle 签名与 DMG 校验和。
- 备注：当前原生运行验证为 macOS；其他平台仍需各自验证宿主菜单和原生集成。

### L-045: Tauri 页面回调依赖的状态必须先于窗口创建登记

- 类型：Pitfall
- 状态：Verified
- 范围：Tauri, managed state, on_page_load, 初始化顺序
- 触发：在 setup 中 manage 核心，同时在 on_page_load 中访问该核心。
- 根因：首个 WebView 的 Started 回调可能早于 setup，state 查询会因尚未 manage 而 panic。
- 解法：先创建核心并通过 Builder.manage 登记，再构建窗口；setup 仅初始化依赖原生 App 的菜单过滤。
- 证据：真实原生夹具启动复现缺失 managed state 的 panic；调整登记顺序后正常启动并通过完整原生重载测试。
- Done right：使用真实原生启动验证生命周期，不能仅以 Rust 编译或模拟 isTauri 的浏览器测试代替。
- Seen: 1× (2026-11-07; task: 20261107T150358-native-chat-core.md)

### L-046: macOS 本地 App 打包后单独验证 bundle 签名

- 类型：Pitfall
- 状态：Verified
- 范围：Tauri, macOS, 本地构建, codesign, DMG
- 触发：Tauri 构建成功，包内二进制与 release 哈希一致，但完整 App 签名校验失败。
- 根因：链接器的二进制 ad-hoc 签名没有覆盖 App 的 Info.plist 和资源，构建成功不代表 bundle 签名完整。
- 解法：本地测试包使用 `APPLE_SIGNING_IDENTITY=- pnpm build:desktop`，由 Tauri 完成包签名后再生成 DMG。
- 证据：原产物 `codesign --verify --deep --strict` 失败；重建后同一检查通过，签名后的包与 release
  Mach-O UUID 一致，DMG 校验和验证通过。
- Done right：分别验证构建、bundle 签名和磁盘镜像；签名前后不要求整个文件哈希相同。
- Seen: 1× (2026-11-07; task: 20261107T150358-native-chat-core.md)
- 备注：此处只验证本地 ad-hoc 签名，未执行 Apple 公证或对外发布。

### L-047: Storybook E2E 的无障碍扫描由单一入口执行

- 类型：Pitfall
- 状态：Verified
- 范围：Storybook 10.6.5, Playwright, AxeBuilder, 组件无障碍测试
- 触发：Playwright 在 story 渲染后主动扫描无障碍，同时 Storybook a11y 插件也自动扫描。
- 根因：两个扫描在同一文档中重叠，Axe 拒绝并发执行并报 `Axe is already running`。
- 解法：仅在 E2E 的 story URL globals 中设置 `a11y.manual:!true`，由测试的 AxeBuilder 统一扫描；
  正常 Storybook 保留自动检查。
- 证据：完整 UI 回归首次出现 1 项冲突；按 8 worker 重复全部组件用例 3 轮，45 项中复现 3 项错误；
  修正后相同 45 项全部通过，功能及无障碍断言保留。
- Done right：不要通过重试或捕获忽略掩盖扫描冲突，确认测试宿主与自动化工具只有一个主动扫描入口。
- Seen: 1× (2026-11-08; task: 20261108T003041-build-check-screenshots.md)

### L-048: macOS 沙盒同时验证命令成功与越界拒绝

- 类型：Pitfall
- 状态：Verified
- 范围：Seatbelt, dyld, bash, Lua 工作进程
- 触发：deny default 沙盒中的命令退出 134，但没有 stderr，看起来像普通权限拒绝。
- 根因：dyld 启动时需要读取根目录 vnode，仅允许根目录元数据会导致共享缓存启动失败。
- 解法：只增加根目录自身的 file-read 权限，不开放根目录子树；分别验证正常执行和越界拒绝。
- 证据：最小 printf 复现，系统日志记录 deny file-read-data /；修正后真实 bash、PTY、补丁、
  默认联网、越界拒绝和沙盒外执行通过，系统卷路径别名也未绕过读取限制。
- Done right：非零退出不能单独证明隔离正常；从系统拒绝日志定位必要权限，不整体放开文件读取。
- Seen: 1× (2026-11-08; task: 20261108T151343-agent-tools.md)

### L-049: 多模型的 HTTP 超时不能共享可变模块配置

- 类型：Pitfall
- 状态：Verified
- 范围：Skynet httpc, Agent, 独立权限模型, 请求重入
- 触发：主模型和权限模型配置不同的请求时限，或多个会话并发创建客户端。
- 根因：httpc 的方法通过模块 upvalue 读取 timeout，初始化时修改单例会影响其他客户端后续请求。
- 解法：请求内加载独立 httpc 表，使用本客户端时限；复用原有 HTTP 实现，不修改 Skynet 源码。
- 证据：单测验证主模型→权限模型→主模型的时限分别传入各自 provider；测试权限模型的 HTTP 流停滞
  按独立截止时间失败并阻止工具，主模型继续返回结果，Web 与原生全链路通过。
- Done right：独立的业务客户端不代表其底层模块配置独立；检查方法闭包实际读取的状态所有者。
- Seen: 1× (2026-11-08; task: 20261108T151343-agent-tools.md)

### L-050: Linux 沙盒的临时挂载不能覆盖工作目录祖先

- 类型：Pitfall
- 状态：Verified
- 范围：bubblewrap, 挂载策略, 会话目录, TMPDIR
- 触发：工作目录位于宿主 /tmp 下，又在沙盒中挂载一个全局可写 /tmp。
- 根因：工作目录父级落入另一可写临时挂载，越界命令能写入临时替身并返回成功，宿主却没有对应文件。
- 解法：临时根和合成父目录只读；TMPDIR 指向会话专属目录，工作目录作为独立可写挂载。
- 证据：真实 Linux 探针先复现 ../outside 返回成功；修正后正常写入、越界读写拒绝、沙盒外执行、
  PTY、补丁、超时取消和输出限制均通过。测试使用非 root、零 capabilities、无网络的一次性容器。
- Done right：验证退出码与宿主文件结果，不能只检查宿主未变化；注意工作目录与临时目录的祖先重叠。
- Seen: 1× (2026-11-08; task: 20261108T151343-agent-tools.md)

### L-051: 静态无障碍扫描等待控件状态过渡完成

- 类型：Pitfall
- 状态：Verified
- 范围：Playwright, Axe, disabled→enabled, CSS 颜色与透明度过渡
- 触发：输入用户名后立即扫描表单，或工具卡片正在淡入，报告稳定状态下合格的文字对比度不足。
- 根因：DOM 已就绪，但配色或透明度尚在过渡；扫描读取到中间帧，而非稳定状态。
- 解法：先确认控件就绪，再等待有限动画实际 finished；保留完整对比度断言与其他动效测试。
- 证据：旧用例三次重复中两次失败，观测到不同的中间颜色；修正后完整多浏览器 UI 回归通过 71 项。
- Done right：等待真实状态完成，不添加固定 sleep、重试或忽略无障碍违规。
- 同日补充证据：Agent 思考与工具卡片等待有限动效结束后，三类浏览器的 15 个相关用例通过。
- Seen: 1× (2026-11-08; tasks: 20261108T151343-agent-tools.md, 20261108T192454-agent-reasoning-models-ui.md)

### L-052: 跨进程读取的夹具文件必须原子发布

- 类型：Pitfall
- 状态：Verified
- 范围：Node, Rust, 原生夹具, JSON 证据
- 触发：Node 记录网关事件，原生 App 同时读取 evidence.json 检查连接与重连。
- 根因：writeFileSync 会截断重写文件；同步调用不保证其他进程不会读到空文件或半份 JSON。
- 解法：先写同目录临时文件，再 rename 替换正式文件；结果报告和导航计数也使用同样的发布方式。
- 证据：完整回归中原生夹具因 JSON EOF panic；修正后对应集成与最终完整回归通过，
  真实模型原生验收完成三次文档加载，连接和工具状态恢复正常。
- Done right：跨进程共享快照使用原子替换，不用重试解析或捕获忽略掩盖发布竞态。
- Seen: 1× (2026-11-08; task: 20261108T160429-real-model-e2e.md)

### L-053: 原生增量契约验证实际序列化 JSON

- 类型：Pitfall
- 状态：Verified
- 范围：Rust serde, Tauri Channel, TypeScript 判别联合, 思考流
- 触发：原生核心已有思考增量，页面仅随快照显示内容，实时状态始终未出现。
- 根因：外层事件使用 type，内层 Rust kind 未重命名为 type；TS 因判别字段缺失走入文本分支。
- 解法：修正 serde 字段名，从 Actor 通知到输出 JSON 断言真实契约，同时验证 TS 投影不污染回答。
- 证据：回退测试中 update.type 为 Null；修复后 14 项 Rust 测试通过，原生实际事件与页面思考流恢复。
- Done right：跨语言契约测试检查序列化结果，不能只用手写 TS 对象或核心缓存测试替代。
- Seen: 1× (2026-11-08; task: 20261108T192454-agent-reasoning-models-ui.md)

### L-054: 确定性 JSON 编码保留空数组身份

- 类型：Pitfall
- 状态：Superseded
- 范围：Lua cjson, HTTP 请求, LLM 提示缓存
- 触发：为稳定请求字段顺序，先 decode 再递归排序编码 JSON。
- 根因：默认 cjson 解码把空数组和空对象都变为普通空 table，重编码后 [] 变为 {}。
- 解法：使用独立 decoder 开启数组 metatable，编码识别该标记，避免修改共享 cjson 配置。
- 证据：HTTP 转发单测验证嵌套空数组、空对象和键顺序，以及全局 decoder 不变；210 项 Lua 测试通过。
- Done right：规范化 JSON 只改变字段顺序，测试同时覆盖空数组、空对象、null 和嵌套数据。
- Seen: 1× (2026-11-08; task: 20261108T192454-agent-reasoning-models-ui.md)
- 备注：2026-11-08 改为 HTTP body 原样转发，移除 canonicalize 与排序编码；历史前缀由顺序追加维护，见 L-056。空数组失真的原始原因仍可作为重编码时的参考。

### L-055: 复合 shell 命令的退出码不能代表每个操作

- 类型：Pitfall
- 状态：Verified
- 范围：真实模型 E2E, bash, 沙盒拒绝证据
- 触发：模型在预期拒绝的写入后追加 echo，工具整体退出码为 0，验收错误报告沙盒未拒绝。
- 根因：shell 返回最后一个命令的退出状态；前面的重定向已经输出 Operation not permitted。
- 解法：按实际沙盒范围及系统拒绝输出检查边界，另行验证授权后的执行结果和宿主文件内容。
- 证据：真实原生测试先记录系统拒绝和整体退出 0；另一次 TSVruS 验收中恢复写入已完成，但额外 ls 不存在文件导致整体退出 1。收紧完整命令要求后 DdNzBb 原生与 W2V1SF Web 真实验收通过。
- Done right：真实模型可组合命令，断言对应操作的证据；需要断言整体退出码时，给出完整命令并明确禁止追加检查，独立验证宿主文件结果。
- Seen: 1× (2026-11-08; tasks: 20261108T192454-agent-reasoning-models-ui.md, 20261108T233712-json-history-prefix.md)

### L-056: 模型缓存通过稳定历史前缀维护，HTTP 请求体原样转发

- 类型：Success
- 状态：Verified
- 范围：Lua, JSON, LLM 历史, 权限提示, HTTP 适配
- 触发：为了缓存命中，给全部历史及 HTTP JSON 增加排序或重复编解码。
- 根因：提示内容的稳定前缀与传输 JSON 的对象字段顺序属于不同层次；重复规范化增加开销并可能改变空数组类型。
- 解法：主模型消息及已编码工具结果按序追加；权限历史按固定字段顺序拼接文本，动作复用原始 arguments；HTTP 直接转发 SDK 编码的 body。
- 证据：214 项 Lua 单测通过，验证历史前缀、原始参数、执行范围和 HTTP 原样透传；DdNzBb 原生与 W2V1SF Web 真实验收通过，两端的主模型与权限模型均观测到供应商实际 cached tokens。移除薄封装后，2026-11-09 a8J39z 原生真实链路再次通过。
- Done right：直接复用 cjson 普通编解码；去掉排序后，同时移除仅转发 encode/decode 的 json 模块，不为薄封装增加调用层或工作进程搜索路径。
- Seen: 1× (2026-11-08; task: 20261108T233712-json-history-prefix.md)
