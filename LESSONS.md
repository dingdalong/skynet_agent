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
  当前 client 按用户名 FNV 哈希选路，随机用户名和连接数量也不能保证覆盖全部实例。
- 解法：返回 updated/skipped 报告；按用户决定，仅 develop 在节点业务启动完成后监听源码内容，
  将变更发给 .main 和全部登记且已就绪的实例。各 VM 整批校验，失败实例保留完整批次至下次源码变更重试。
- 证据：173 项单测与完整 make server-check 通过；隔离源码副本建立四条连接后，直接保存方法修改，
  未发送 HOTFIX，两个 WebSocket 与两个 client 的存量连接均调用新实现，显示历史与模型上下文保留。
  语法错误阻止同 VM 整批提交，修正单文件后完整重试通过；.main 与共享 rpc 模块自动更新，正常关服退出 0。
  2026-11-13 Lua 探针迁移使用随机用户名时漏掉一个 client；以 hotfix-1/3/5/7 稳定复现，
  恢复覆盖两个哈希桶的 hotfix-1/2/3/4 后，同一自动热修测试与全部服务端集成通过。
  证据见 client/test-artifacts/server-lua-migration/routing-reproduction.log 与 check-full.log。
- Done right：自动监听集成使用独立源码树与测试进程；先建立连接再修改副本，通过实例地址和真实业务结果
  验证覆盖范围；按当前选路规则使用覆盖各哈希桶的固定用户名，不能仅增加随机连接数。
- Seen: 2× (2026-11-06; task: 20261106T105138-develop-auto-hotfix.md; 2026-11-13; task: 20261113T005931-server-tests-lua.md)
- 备注：新增监听器是启动流程变更，首次启用需重启；热修仍只用于接口、方法集合与数据格式兼容的缺陷修复。
  2026-11-13 已按当前实现替换不再适用的 logind 独立轮询 client 提示。

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
  `skills/list` 包含禁用的用户级副本，验收时同时判断 `scope` 与 `enabled`，不能仅断言名称不存在。
- 证据：桌面版及 Homebrew CLI 的项目提示目录均为 7 项技能，项目外为 4 项；skills/list 确认项目技能来源，
  临时会话确认统一电脑操作插件 connected，三个直接 MCP 均 disabled 且零工具。
- Done right：保留原始文件和修改前备份，通过项目配置与实际目录验证效果；浏览器宿主不可用单独记录，不扩大为配置失败。
- Seen: 2× (2026-11-06, 2026-11-10; tasks: 20261106T232329-codex-project-extensions.md, 20261110T144855-hig-mcp-project-install.md)
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

### L-042: 客户端接口由协议与 handler 的同名请求函数共同定义

- 类型：Success
- 状态：Verified
- 范围：Skynet, protobuf, ClientService, 请求分发, 命名约定
- 触发：新增客户端请求或调整请求路由，准备手工维护请求名称白名单。
- 根因：WebSocket 已校验已加载协议及 Req 方向，再登记一份请求名映射会增加重复维护点；
  删除映射后，需要明确内部方法和客户端接口的命名边界。
- 解法：按用户确认的[隐式约定](隐式约定.md)，每次请求按协议短消息名从 handler 的稳定 REQUEST 表查找函数，
  以 User 为 self 调用，保留连接来源、函数类型和异常检查。初始化固定接入用户 handler，按目录名扫描 mods 第一层
  发现其他 handler，完成加载、类型与重名校验后保存稳定表引用；请求期间不扫描或复制函数。
- 证据：182 项单测与 protobuf 跨 VM、网关、自动热修、热修运行时、服务运行时及关服检查通过。
- 证据：2026-11-09 拆分 User/Chat handler 后，249 项 Lua 单测通过；真实 hotfix.reload 连续更新两次后
  新旧 User 均命中最新方法，自动热修探针验证四条存量连接在两个 client VM 使用更新后的四个请求并保留用户及历史。
- 证据：自动扫描 mods 后，259 项 Lua 单测及 make check-full 通过，覆盖任意模块发现、扫描与加载失败、
  完整注册后发布，以及原生/Web 真实模型链路；扫描错误不得当作 handler 缺省，细节见 L-061。
- Done right：沿真实入口确认校验职责；用网络入口测试约束内部方法不可达，避免重新引入重复登记表。
- Seen: 1× (2026-11-07; task: 20261107T132610-protocol-name-dispatch.md; reused by: 20261109T170027-user-chat-handlers.md, 20261109T174020-mods-handler-discovery.md)
- 备注：2026-11-09 用户要求客户端入口独立到 handler，原先在 User 类按同名方法分发的组织方式已被替代。

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

### L-051: 界面验收等待有限动画完成

- 类型：Pitfall
- 状态：Verified
- 范围：Playwright, Axe, disabled→enabled, CSS 颜色、透明度与缩放过渡
- 触发：输入用户名后立即扫描表单，或工具卡片正在淡入，报告稳定状态下合格的文字对比度不足。
- 根因：DOM 已就绪，但配色、透明度或缩放尚在过渡；扫描和几何测量读取到中间帧，而非稳定状态。
- 解法：先确认控件就绪，再等待有限动画实际 finished；保留完整对比度断言与其他动效测试。
- 证据：旧用例三次重复中两次失败，观测到不同的中间颜色；修正后完整多浏览器 UI 回归通过 71 项。
- Done right：等待真实状态完成，不添加固定 sleep、重试或忽略无障碍违规。
- 同日补充证据：Agent 思考与工具卡片等待有限动效结束后，三类浏览器的 15 个相关用例通过。
- 后续证据：2026-11-10，Demo 面板进入时的 scale 让 900px 面板被测为约 887px；等待有限动画结束后，预览往返的宽度断言与完整 20 项 E2E 通过。
- Seen: 2× (2026-11-08, 2026-11-10; tasks: 20261108T151343-agent-tools.md, 20261108T192454-agent-reasoning-models-ui.md, 20261110T143000-liquid-glass-demo.md)

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
- 证据：214 项 Lua 单测通过，验证历史前缀、原始参数、执行范围和 HTTP 原样透传；DdNzBb 原生与 W2V1SF Web 真实验收通过，两端的主模型与权限模型均观测到供应商实际 cached tokens。移除薄封装后，2026-11-09 a8J39z 原生真实链路再次通过；分层提示词接入后，fsYvRB 原生及 6JU9zh Web 真实链路通过，两种用途仍有实际缓存命中。
- Done right：直接复用 cjson 普通编解码；去掉排序后，同时移除仅转发 encode/decode 的 json 模块，不为薄封装增加调用层或工作进程搜索路径。
- Seen: 1× (2026-11-08; task: 20261108T233712-json-history-prefix.md)

### L-057: 宿主读取会话规则时使用描述符拒绝路径替换

- 类型：Pitfall
- 状态：Verified
- 范围：Agent 项目规则、Lua C 扩展、后台工具与文件读取
- 触发：宿主在工具沙盒外自动读取会话目录中的 AGENTS.md，后台进程可能同时修改该路径。
- 根因：realpath 与普通文件检查只反映检查时的状态，之后 io.open 仍会跟随被替换的符号链接。
- 解法：解析并校验会话边界后，复用原生父目录描述符遍历，以 O_NOFOLLOW 逐层打开；最终打开也拒绝符号链接，并先 fstat 确认为普通文件。使用 O_NONBLOCK 避免替换成 FIFO 导致阻塞。
- 证据：prompts_spec 的稳定替换用例在独立进程恢复旧 io.open 方式后失败（实际越界读取成功），使用原生 read_file 后同一用例通过；242 项 Lua 单测通过，包含最终文件和祖先目录替换及读取上限。
- Done right：文件读取边界按最终打开的描述符验证；回归通过注入精确替换时点复现，不依赖概率循环。
- Seen: 1× (2026-11-09; task: 20261109T104725-agent-prompts.md)

### L-058: 自动注入上下文验收排除用户历史与工具读取

- 类型：Success
- 状态：Verified
- 范围：Agent 项目规则、真实模型 E2E、测试夹具
- 触发：测试先让用户逐字提供规则、再验证模型遵循，无法区分自动加载与记住用户消息。
- 根因：决定性信息同时存在于多条输入渠道，成果正确不能证明目标渠道生效。
- 解法：宿主在任务之间写入含随机目标目录的规则；随机目录只保存在宿主和规则文件中，用户任务及阶段接口响应不透露。根规则任务禁止工具再次读取规则，宿主独立检查真实产物。
- 证据：fsYvRB 真实 macOS 及 6JU9zh Web 链路通过；首次及刷新后的成果分别写入宿主随机目录，根规则阶段未自行读取 AGENTS.md，子目录场景仍有真实工具读取证据。
- Done right：自动加载验收只通过被验收渠道传递决定性信息，并独立核对文件结果。
- Seen: 1× (2026-11-09; task: 20261109T104725-agent-prompts.md)

### L-059: 页面会导航时使用支持跨导航的结果等待

- 类型：Pitfall
- 状态：Verified
- 范围：Playwright、Web 真实模型 E2E、页面重载
- 触发：共享真实场景主动重载时，expect.poll 中的 page.evaluate 抛出 Execution context was destroyed。
- 根因：导航销毁 evaluate 的执行上下文，外层 expect.poll 不会将该异常视为未就绪结果。
- 解法：使用 page.waitForFunction 跨导航等待终态并返回结果对象，通过 JSHandle.jsonValue 取回后释放句柄，不再发起第二次 evaluate。
- 证据：BSAoXP 真实 Web 失败记录；本地合成页面在 evaluate 进入后确定性触发导航，旧轮询失败而新等待通过，见 /private/tmp/skynet-prompts-web-navigation-check-20261109.log；修正后 6JU9zh Web 真实链路完整通过。
- Done right：主动导航属于场景正常流程，使用浏览器等待机制处理上下文更替，保留终态和超时断言。
- Seen: 1× (2026-11-09; task: 20261109T104725-agent-prompts.md)

### L-060: 同一草稿的连续发送分别标识操作

- 类型：Pitfall
- 状态：Verified
- 范围：TypeScript、Tauri IPC、本地草稿、异步发送状态
- 触发：前一次发送的失败状态已经到达，但对应 IPC 结果迟到；用户对同一草稿发起下一次发送。
- 根因：只用草稿 ID 判断结果归属，无法区分同一草稿的前后两次请求；旧失败会清除新请求的发送占用。
- 解法：每次发送登记独立的操作对象，并捕获连接 generation；迟到结果只有同时匹配操作身份和代次时才可释放占用。依赖当前草稿的新建 IPC 也显式携带草稿 ID，已消费的目标不得解释为新建下一草稿。
- 证据：独立 VM 按状态与 IPC 结果重排复现旧失败解冻新请求；native runtime 确定性回归验证修复，93 项应用 TS 单测通过。Rust 的迟到新建回归包含于 21 项通过的单测。
- Done right：同时验证同目标连续请求、旧结果迟到、来源窗口重建和连接替换，业务对象 ID 不能替代单次操作身份。
- Seen: 1× (2026-11-09; task: 20261109T161153-chat-agent-session.md)

### L-061: 自动发现模块时区分可选文件缺省与扫描失败

- 类型：Pitfall
- 状态：Verified
- 范围：LuaFileSystem、模块发现、服务初始化、请求注册
- 触发：扫描模块目录以建立完整的请求处理表，同时允许没有 handler 的模块跳过。
- 根因：目录遍历静默忽略属性读取失败，或用只返回布尔值的文件存在检查，会将权限和 IO 错误当作没有模块，
  使初始化成功却缺少部分接口。
- 解法：目录和文件枚举遇到条目属性读取失败返回 nil,error；逐模块成功枚举后才判断 handler 是否缺省，
  扫描与加载错误使初始化失败，完整校验后再保存注册结果。
- 证据：确定性属性失败用例分别回退 list_files 与 list_directories 的旧语义，均稳定返回不完整列表并使回归失败；
  修复后文件模块 8 项测试通过，client 30 项测试包含子目录不可读、无部分注册与修复后重试初始化。
- Done right：用确定性的属性读取错误验证目录与文件两条路径，避免依赖当前运行账号能否绕过文件权限。
- Seen: 1× (2026-11-09; task: 20261109T174020-mods-handler-discovery.md)

### L-062: 手工生成的 Tauri 测试包必须包含 Resources

- 类型：Pitfall
- 状态：Verified
- 范围：Tauri、macOS、原生端到端夹具、资源目录
- 触发：测试手工建立最小 .app，setup 新增 resource_dir 调用后，App 在加载页面前退出。
- 根因：包里只有 Contents/MacOS，没有实际的 Contents/Resources，资源解析返回 unknown path。
- 解法：两种原生夹具统一创建 Resources；结果等待同时检测进程提前退出并报告日志位置。
- 证据：本地执行夹具首次启动失败，修复后 JJNTCw 真实本地/远程验收通过；9cT06b 原生真实链路通过。
- Done right：原生初始化新增路径或资源依赖时，同时检查最小测试包结构；启动失败不等待整段业务超时。
- Seen: 1× (2026-11-09; task: 20261109T211901-local-desktop-execution.md)

### L-063: 可选 JSON 字段进入 Lua 时统一处理 null

- 类型：Pitfall
- 状态：Verified
- 范围：Rust、JSON、lua-cjson、桌面执行结果
- 触发：Rust 返回 session_id:null，Lua 按 if result.session_id 判断是否仍有运行进程。
- 根因：cjson.null 是 userdata，在 Lua 中为真值，不能直接用作可选字段的缺省值。
- 解法：在 ExecutionResultReq 的 JSON 边界递归移除 null，再把结果交给 Agent 执行器。
- 证据：desktop_execution_spec 覆盖结果来源和 session_id/error 空值；JJNTCw 真实本地/远程执行通过。
- Done right：跨语言协议边界统一处理空值，保留 false 和 0 的原本语义，业务代码只处理一种缺省表示。
- Seen: 1× (2026-11-09; task: 20261109T211901-local-desktop-execution.md)

### L-064: 异步模式切换验收等待业务状态而非控件的即时值

- 类型：Pitfall
- 状态：Verified
- 范围：Vue、原生 E2E、会话执行目标、离线拒绝
- 触发：脚本先设置 select.value 再触发 change，随后立即按 select.value 和 disabled 判断切换完成。
- 根因：控件值已被脚本改写，Vue 的 busy 渲染和 IPC/服务端回传尚未完成，等待条件可能立即通过；
  退出 App 后会话仍在旧目标。页面已有的设备状态文本也不能证明本次请求被拒绝。
- 解法：模式切换等待由会话状态计算的执行目标标签；拒绝等待请求产生的 alert；取消检查工具终态。
  模型因无效参数重试时，按工具集合确认实际进程停止，不假设只有一条记录。
- 证据：AYT2ju 原生夹具报告通过但会话仍在云端，离线拒绝等待超时；修正后 XeIsPu 严格场景完整通过。
- Done right：异步 UI 验收的终态信号由真实业务结果产生，避免脚本自己写出的值或先前状态造成误判。
- Seen: 1× (2026-11-09; task: 20261109T211901-local-desktop-execution.md)

### L-065: Make 3.81 的参数变更不能只靠配置文件时间戳失效缓存

- 类型：Pitfall
- 状态：Verified
- 范围：macOS、GNU Make 3.81、C 构建、Cargo build.rs
- 触发：构建后立即修改编译参数，内容比较重写配置 stamp，但部分对象没有重新编译。
- 根因：macOS 自带 Make 3.81 的文件时间比较只有秒级精度，同一秒内更新的 stamp 可能与已有对象同龄。
- 解法：解析期比较配置内容，变化时将配置目标标记为 PHONY，让依赖对象直接失效；未变化时保持普通文件目标。
- 证据：make-rules-final.log 中 CFLAGS 从 -O2 改为 -O0 后重编译断言失败；修正后 make-rules-verified.log
  的同一断言通过，参数不变时没有重编译，编译器失败也正确传递。
- Done right：同时验证快速参数切换和无变化重建，不能只测试干净构建或延迟后的参数变更。
- Seen: 1× (2026-11-10; task: 20261110T102843-agent-runtime-make.md)

### L-066: Vue 模板的多语句事件放入命名方法

- 类型：Pitfall
- 状态：Verified
- 范围：Vue、Prettier、Vite、独立 HTML 入口
- 触发：无分号格式化配置下，在模板事件中连续执行赋值和函数调用。
- 根因：格式化去掉内联语句分隔符后，模板表达式无法被 Vue 编译器解析；类型与静态检查未报告此入口的编译错误。
- 解法：多步操作放入 setup 中的命名方法，模板仅引用方法；实际启动目标入口验证编译。
- 证据：Demo 首轮 Vite 报 Unexpected token 并返回 500；改为 useSuggestion 方法后，三类浏览器的 20 项 E2E 通过。
- Done right：格式化后验证实际页面，不把类型检查等同于模板编译与运行验证。
- Seen: 1× (2026-11-10; task: 20261110T143000-liquid-glass-demo.md)

### L-067: 新客户端设计采用独立的 HIG 基线

- 类型：Success
- 状态：Superseded
- 替代说明：2026-11-11 新 Flutter 客户端采用 L-073 的清晰表面与官方 Cupertino 基线；本条只保留旧 Vue/Tauri Liquid Glass 原型的历史决定，不约束新画廊。
- 范围：客户端完整重构、Liquid Glass、桌面与移动布局
- 触发：从已确认的 Demo 继续设计新客户端。
- 根因：用户明确认为旧设计的按钮、字体和布局不合适，要求整体重新设计。
- 解法：以 hig-mcp 为规范来源，电脑采用 iPad 操作逻辑加 macOS 密度，手机采用 iOS 尺寸；重建 Token 与视觉组件。桌面已确认改为主应用 + 分屏，替换自由拖动、缩放与重叠窗口；手机为全屏应用和逐级导航。全平台目标包含动态折射、高光、背景适应、连续形变与滚动边缘，按组件角色实现；CSS 模糊近似和能力降级单独标记。
- 后续确认：优先完成主屏、打开应用、多任务、分屏、手势与完整设置；每次启动进入主屏，应用铺满工作区，不使用展示工具栏、预览边框或应用外侧壁纸留白。外观在本地持久保存。共享 shell/settings 直接作为正式客户端的复用基础，Chat 内部业务重构暂缓，当前仍使用本地模拟内容。
- 证据：2026-11-10 用户明确选择；统一规范为 docs/design/HIG_LIQUID_GLASS.md，Demo 范围记录在 docs/design/LIQUID_GLASS_DEMO.md。三个项目 MCP 实际调用见 client/test-artifacts/hig-review/REPORT.md；新版浏览器、动态 WebGL、对比度、性能和 macOS 体验证据见 client/test-artifacts/liquid-glass-v2/REPORT.md。其他原生平台及 Apple 渲染器光学等效性未验收。
- Done right：复用技术与业务能力时，不把旧视觉规范、组件尺寸一并带入新设计。用 Apple 原文和 WWDC 资料核对意图；hig-review 的 verified 仅证明引用核实，界面结论另需运行、测量与动态证据。
- 备注：规范冲突按完整来源（本地文档、技能/插件、MCP）汇总，不逐条修补；用户已确认整体移除六份旧客户端设计规范及两个旧设计技能，后续设计以 hig-mcp 为准。
- Seen: 1× (2026-11-10; tasks: 20261110T143000-liquid-glass-demo.md, 20261110T153838-hig-liquid-glass-standard.md, 20261110T163537-liquid-glass-demo-refactor.md, 20261110T174400-shell-preview.md)

### L-068: Vue 集成 Web Component 时显式区分配置属性与实例方法

- 类型：Pitfall
- 状态：Verified
- 范围：Vue 3、第三方 Web Component、simple-liquid-glass 5.7.3
- 触发：组件配置名称恰好与 custom element 上的已有 property 或方法同名。
- 根因：Vue 默认检测 property，`reveal="immediate"` 覆盖第三方元素的 `reveal()`，导致 `this.reveal is not a function`；独立 HTML 探针不能覆盖 Vue 的赋值路径。
- 解法：根据库契约使用 `:reveal.attr`，重新加载全新实例验证，不能仅依赖 HMR 后的状态。
- 证据：client/src/ui/GlassSurface.vue；两引擎、iPhone 模拟及实际 macOS App 新实例进入 WebGL；v2 dynamic.json 零 pageerror。
- Done right：先验证渲染引擎，再通过实际框架封装验证，保留运行时错误监听。
- Seen: 1× (2026-11-10; task: 20261110T163537-liquid-glass-demo-refactor.md)

### L-069: 缓存背景的玻璃必须验证滚动像素与异步取样

- 类型：Pitfall
- 状态：Verified
- 范围：WebGL 玻璃、HTML 背景快照、滚动导航
- 触发：`data-material=webgl` 正常，但滚动帧或一次背景变化未更新材质。
- 根因：固定滚动容器作为 backdrop 时位置不变，缓存内容不随子元素滚动；背景属性变化未观察，首次取样也可能早于异步快照完成。
- 解法：绑定实际移动的内容层；观察属性变化，增加一次延迟取样并清理计时器；导航遮蔽率用真实合成背景验证。
- 证据：修复前两引擎六秒 scrollDraws=0，修复后 354/350 帧、零滚动纹理上传；E2E 验证滚动前后 canvas 像素变化。adaptation.mjs 修复前超时、修复后 Chromium/WebKit 深浅背景切换均通过；手机导航最低取样对比度从 3.67 提升至 5.59。
- Done right：同时检查引擎诊断、受控条纹的折射差异、实际滚动重绘和文字合成像素，不能只验收状态标记。
- Seen: 1× (2026-11-10; task: 20261110T163537-liquid-glass-demo-refactor.md)

### L-070: 移动导航历史使用可序列化且规范化的快照

- 类型：Pitfall
- 状态：Verified
- 范围：Vue、History API、移动 Web 逐级导航
- 触发：将响应式路由写入 pushState/replaceState，或比较当前路径与历史父路径决定是否 history.back。
- 根因：History API 的 structured clone 无法复制 Vue proxy；空路径分别保存为缺失键和空数组时，语义相同但 JSON 比较不相同，返回会错误地替换当前记录而保留多余步骤。
- 解法：历史边界复制普通对象和路径数组，统一省略空路径；页面返回与浏览器返回共用同一历史契约。
- 证据：初次浏览器预览出现 DataCloneError；首次移动返回 E2E 需要额外一步。修复后 Chromium、WebKit、iPhone 模拟的启动、设置层级、许可详情及浏览器返回场景通过，见 client/tests/e2e/liquid-glass.spec.ts 与 client/test-artifacts/shell/e2e.json。
- Done right：验证混合使用页面返回和浏览器返回的完整路径，不能只检查单次路由跳转。
- Seen: 1× (2026-11-10; task: 20261110T174400-shell-preview.md)

### L-072: Flutter 多滚动区分别管理滚动控制器

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter、交互滚动条、侧栏与内容区并存
- 触发：两个垂直滚动区默认继承 PrimaryScrollController，测试或交互滚动条需要唯一 ScrollPosition。
- 根因：目录和内容共用宿主默认控制器，ensureVisible 触发 attached to more than one ScrollPosition。
- 解法：各自持有并释放 ScrollController，滚动条与对应内容显式绑定同一实例，各滚动区关闭 primary。
- 证据：画廊初次两项测试失败；修正后组件与画廊检查、macOS 原生 journey 通过，见 client/test-artifacts/component-gallery/project-check-full.log。
- Done right：同时验证目录与内容滚动，以及窄窗口目录重新挂载；独立滚动位置不交给宿主默认值推断。
- Seen: 1× (2026-11-11; task: 20261111T193917-apple-component-gallery.md)

### L-073: Flutter Apple UI 基线与旧客户端独立演进

- 类型：Success
- 状态：Verified
- 范围调整：2026-11-12 用户取消保留旧客户端的决定；旧工程已按 L-088 替换。
  本条的 Apple 视觉基线继续适用，旧工程保留规则不再适用。
- 范围：Flutter、Apple 风格、macOS 首版、项目设计规范
- 触发：用户批准从 Vue/Tauri 设计探索转向 Flutter 全平台方案，首版仅需 macOS 组件演示。
- 解法：官方 cupertino_ui 为基础，在 apple_ui 补齐桌面交互与语义令牌；首版使用清晰表面。HIG 与 Apple 原文用于依据查询，本机系统用于实际对照。统一规范、共享主题与图标提供开发入口，现有 Demo 用于可选预览和验收，整个旧 client 保留。
- 证据：用户确认执行方案；docs/design/APPLE_FLUTTER_DESIGN.md、COMPONENT_GALLERY.md；独立 macOS 原生 journey 与旧项目完整回归通过。
- Done right：保持共同的 Apple 视觉语言，并按输入方式调整密度；组件画廊的宽度预览不等同其他平台验收。
- 备注：2026-11-12 用户确认新增用法先补统一规范，需要复用实现时补共享代码；无需向画廊登记或逐一包装官方组件。保留自动检查。不引入 Widgetbook、CDK、自动 Material/Cupertino 混搭或第三方 Liquid Glass 套件；新规范替代 L-067 对新客户端的约束。
  同日进一步确认以实际 macOS App 建立视觉与动态体验基准，允许少量原生材质和窗口增强，再将确认的效果推广到其他平台；功能测试、令牌检查和 HIG 引用核对不能代替用户视觉确认。
- Seen: 1× (2026-11-11; task: 20261111T193917-apple-component-gallery.md)

### L-071: 后台 WebView 的布局不能等待动画时间线

- 类型：Pitfall
- 状态：Verified
- 范围：macOS WKWebView、WAAPI、应用切换与退出动画
- 触发：后台原生窗口恢复应用后仍显示缩略卡片，前台浏览器同路径正常。
- 根因：实际原生诊断显示 document.hidden=true，动画为 running 但 currentTime=0；宿主暂停后台动画时间线，初帧 transform 持续影响显示，等待 finished 不能保证收敛。
- 解法：页面隐藏时直接呈现最终状态；visibilitychange 进入后台时取消现有动画并清理退出视觉层，业务状态不依赖动画完成事件。
- 证据：macOS 重新启动后仍复现，修复后同路径完整恢复并能分屏；E2E 覆盖隐藏页面启动和过渡中转入后台，三个配置通过。截图和诊断事实见 client/test-artifacts/shell/REPORT.md。
- Done right：原生检查先核对页面可见性和动画时钟；背景截图不能证明前台动效完成，浏览器模拟也不能替代真实宿主行为。
- Seen: 1× (2026-11-10; task: 20261110T174400-shell-preview.md)

### L-074: Flutter 持续动画页面等待具体交互状态

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter、Widget 与原生集成测试、持续加载指示器、动态菜单
- 触发：进入反馈页或在页面持续动画期间操作菜单。
- 根因：pumpAndSettle 等待所有动画停止，加载指示器不会停止；仅等待已选文案消失也不可靠，状态变化可在菜单关闭前改写选项文字。
- 解法：页面切换验证目标内容；菜单等待选项可命中，选择后等待所有菜单项从树中移除，使用有界帧等待。
- 证据：旧等待方式在反馈页超时；仅等待文案时，辅助功能菜单关闭尚未完成即操作密度选择失败。修正后完整三项画面测试通过，见 client/test-artifacts/unified-flutter-ui/gallery-tests.log。
- Done right：等待实际终态，保持加载动效正常工作；不通过禁用动画或无限延长超时让测试通过。
- Seen: 1× (2026-11-12; task: 20261112T000000-unified-flutter-ui.md)

### L-075: 状态反馈的恢复按钮使用独立语义边界

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter、状态提示、Semantics、可访问按钮名称
- 触发：在带类型、说明和 live region 的状态提示内增加恢复操作。
- 根因：父级与按钮语义合并后，AX 将整条提示作为按钮名称；仅设置父级 explicitChildNodes 不能替代按钮的独立边界。
- 解法：提示父级保留类型、说明和 live region；恢复按钮外使用 Semantics(container: true)。
- 证据：修复前按钮名称包含整条提示，单独设置 explicitChildNodes 后仍未通过；修复后四类反馈的组件语义测试和 macOS 原生 journey 均通过，见 client/test-artifacts/unified-flutter-ui。
- Done right：同时验证提示内容可读和按钮独立名称、角色；实际 VoiceOver 朗读仍单独验收。
- Seen: 1× (2026-11-12; task: 20261112T000000-unified-flutter-ui.md)

### L-076: 原型端到端测试同时检查运行错误与交互结果

- 类型：Pitfall
- 状态：Verified
- 范围：单文件 HTML、无分号 JavaScript、Playwright、应用切换与焦点
- 触发：布局或状态已经改变，但交互处理函数后续的焦点和辅助功能逻辑可能仍抛错。
- 根因：`render()` 后的括号表达式被自动分号插入规则解析为连续调用；仅断言页面状态不能发现后续运行错误。
- 解法：焦点目标用局部变量承接，避免语句以括号紧接函数调用；所有原型 E2E 从加载前收集 pageerror 并在结束时断言为空。
- 证据：补充错误断言后 11 个流程报告 `render(...) is not a function`；修正后四种浏览器与设备配置共 36 项通过，见 client/test-artifacts/workspace/e2e.log。
- Done right：格式化后运行实际 HTML 入口；既检查页面结果，也检查同一操作是否抛出运行错误。
- Seen: 1× (2026-11-12; task: 20261112T160000-workspace-html.md)

### L-077: 工作区分屏从当前应用开始，桌面作为正式分屏区域

- 类型：Success
- 状态：Verified
- 范围：HTML 工作区原型、后续 Flutter 外壳、应用分屏与统一导航
- 触发：实现或调整应用分屏入口、后台恢复及 Dock 行为。
- 解法：用户明确改为从当前应用顶部布局把手向左或右拖动，先形成“应用＋桌面”；桌面与应用共用分隔条及 1/3、1/2、2/3 吸附规则。点击桌面上的另一应用时填入该侧，保持当前比例，不要求应用位于 Dock。Dock 仅在完整桌面显示；所有平台使用顶部可见导航与键盘入口。
- 统一导航：2026-11-12 用户进一步确认桌面与手机、平板统一操作逻辑，所有平台使用安全区内的顶部“返回桌面”和“后台应用”；桌面提供后台入口，后台提供返回桌面入口。移除底边上滑、停顿及仿系统指示条，保留应用内拖动；手机保持单应用，桌面和平板按内容宽度启用分屏。App 与 Web 同步适用；浏览器桌面模式、外接键鼠和窗口尺寸变化不切换导航方式。
- 实时反馈：拖动应用分屏、交换位置及从分屏拖成全屏时直接显示实际布局，不用落位蓝框或确认提示；松手前可拉回，取消恢复原组合与比例，松手后保留结果。
- 后台退出：点击卡片外区域返回桌面，空后台也可退出；不关闭已有应用或重置页面状态。
- 证据：2026-11-12 用户最新交互决定；client/workspace-demo.html、docs/design/WORKSPACE_DEMO.md；统一导航最终四配置 108 项 E2E 及 make check 通过，见 client/test-artifacts/workspace/unified-navigation-e2e.log、unified-navigation-check.log。
- Done right：将 desktop 与应用都作为正式 pane 管理，用同一比例和约束支持两种分屏状态；新增应用不通过 Dock 位置决定能否分屏。
- Seen: 1× (2026-11-12; task: 20261112T121551-workspace-gestures.md)
- 备注：替代本轮早期顶部菜单、Dock 导航按钮与底边上滑方案；Flutter macOS 工作区已实现并通过原生交互与偏好保存流程，证据见 client/test-artifacts/flutter-workspace/native-release-final.log。WebKit 拖动为鼠标路径，未宣称真实移动设备手势验收。

### L-078: 拖动提交前检查内容区尺寸，不能只等待 ResizeObserver 取消

- 类型：Pitfall
- 状态：Verified
- 范围：HTML 工作区、Pointer Events、可撤回的实时分屏与全屏布局
- 触发：拖动中改变窗口尺寸，随后在 ResizeObserver 回调前松手。
- 根因：尺寸通知异步执行；pointerup 可能先提交基于旧尺寸计算的全屏目标，清理手势后再收到尺寸通知也无法恢复原组合。
- 解法：pointerdown 保存内容区宽高，pointermove 和 pointerup 同步核对当前尺寸，不一致则取消并恢复已确认布局；拖动中的实际画面由临时状态计算，松手前不修改已确认组合。将布局手势的指针捕获放在不会随布局隐藏的工作区上。
- 证据：direct-layout-chromium.log 首轮 18/19，通过失败断言确认缩放后得到单应用 chat 而非 chat,desktop；加入尺寸校验后同一流程及四配置 80 项通过，见 client/test-artifacts/workspace/direct-layout-e2e.log。
- Done right：测试先拖到实时全屏，再缩放并立即松手；不通过等待 ResizeObserver 完成来规避提交顺序问题。
- Seen: 1× (2026-11-12; task: 20261112T121551-workspace-gestures.md)

### L-079: 验证动效时分别检查布局终态和可控中间帧

- 类型：Success
- 状态：Verified
- 范围：HTML 工作区、Web Animations、Playwright、可中断的手势动效
- 触发：为立即切换的布局补充空间过渡，原有几何断言开始读到中间位置；连续操作需要核对接续位置。
- 根因：业务状态已经提交，不代表动画到达终点；依赖固定等待或普通状态轮询取样，可能在过渡结束后才检查到画面，漏掉动画或误报布局错误。
- 解法：功能断言等待页面中实际有限动画结束；动效断言暂停动画并设置 currentTime，分别验证起点、中间帧、反向接管和最终清理。指针几何用整数输入避免设备事件取整差异。
- 证据：client/tests/e2e/workspace.spec.ts 中 finishMotion、motionAt 及六个动效场景；最终四配置 104 项通过，日志见 client/test-artifacts/workspace/motion-e2e.log，代表性操作录屏见 motion-demo.webm。
- Done right：业务状态即时提交，动画完成仅清理显示层；用测试控制时间线而不关闭产品动画，离散布局使用缓动，连续跟手直接更新位置。
- Seen: 1× (2026-11-12; task: 20261112T121551-workspace-gestures.md)

### L-080: 连续布局键盘操作保留布局把手焦点

- 类型：Pitfall
- 状态：Verified
- 范围：工作区、平板可见导航、键盘布局、焦点管理
- 触发：为移动端添加顶部导航，并把打开应用的焦点策略复用到布局操作。
- 根因：左右方向键完成分屏后焦点被转到“返回桌面”，下一次上方向键无法到达布局把手；状态断言单独验证第一步会漏掉此问题。
- 解法：所有平台打开或恢复应用聚焦顶部导航入口；安排布局后保留操作把手的焦点，支持连续方向键操作。通过同一焦点下的左右键分屏、上键全屏再验证返回与后台导航。
- 证据：client/test-artifacts/workspace/mobile-navigation-e2e.log 平板键盘场景失败；修正 arrange 焦点后定向四项和最终四配置 112 项通过，见 mobile-navigation-focused.log、mobile-navigation-final.log。
- Done right：按操作目的决定焦点；应用切换和布局编辑不使用同一种结束焦点。
- Seen: 1× (2026-11-12; task: 20261112T144711-mobile-workspace-navigation.md)

### L-081: 共享 Flutter 工作区的检查与原生构建顺序执行

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter、macOS、Swift Package Manager、原生插件生成工程
- 触发：新增原生插件后，同时运行 Flutter 检查、依赖解析与原生构建／集成测试。
- 根因：多个 Flutter 流程会重写同一工作区的插件配置；构建仍引用插件临时路径时，生成的 Package.swift 已被另一个流程改为空依赖，造成编译器启动失败。
- 解法：同一 Flutter 工作区的依赖解析、检查和原生构建按顺序执行；由执行原生测试的进程生成完整插件配置，无需修改 Xcode 或第三方包。
- 证据：client/test-artifacts/flutter-workspace/native-first.log 首次失败；独立重跑的 native.log 与 native-release-final.log 均通过，生成配置重新包含 shared_preferences_foundation。
- Done right：根 makefile 的 Flutter 目标保持顺序调度，避免同时启动同一工作区的检查和原生构建。
- Seen: 1× (2026-11-12; task: 20261112T171409-flutter-workspace-demo.md)

### L-082: 分屏重排与页面进出缩放分别处理

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter、分屏、可中断布局动画、文字缩放
- 触发：持续保留的应用从图标进入、分屏拖成全屏后拉回，或在大字号下改变面板宽度。
- 根因：把分屏按真实宽度重排的规则同时用于页面进出，会让完整应用在图标尺寸附近重新布局，造成标题溢出；隐藏页面的无效尺寸也会在下一次过渡中被复用。
- 解法：仅对持续可见的页面按动画中的真实约束重排；隐藏页面保留有效尺寸，新进入页面按完整页面布局并执行空间缩放。
- 证据：客户端 widget_test 的真实面板宽度、200% 文字、分屏暂时全屏后拉回与完整 journey；修复前 RenderFlex overflow，修复后 15 项客户端测试及 macOS 原生流程通过。见 client/test-artifacts/macos-visual/check.log、native-profile.log。
- Done right：分别验证文字真实宽度和页面进入动画，覆盖中途反向与窄窗口，不能用拉伸文字避免溢出。
- Seen: 1× (2026-11-12; task: 20261112T183000-macos-visual-standard.md)

### L-083: macOS Profile 应用内采样需要 VM Service 连接权限

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter integration_test、macOS 沙箱、Profile 帧耗时采样
- 触发：在沙箱内调用 watchPerformance，通过 localhost 连接本应用的 VM Service。
- 根因：只有 network.server 权限不足以让应用建立客户端连接，采样报 EPERM。
- 解法：Debug/Profile 增加 network.client，Release 保留原权限；由 flutter drive 的宿主 driver 收集 reportData。使用 --no-dds 避免应用内 VM Service 采样与 DDS 的连接限制。
- 证据：native-profile-first.log 的 EPERM；修复后的 native-profile.log 与 native-performance.json 完成真实 macOS 流程和帧数据收集。
- Done right：明确采样模式、沙箱权限与结果收集端；首次使用耗时保留在报告中，不把 Flutter 帧耗时解释为系统合成器或完整输入延迟。
- 备注：原生动画采样显式使用 fullyLive 帧策略，让应用请求的动画帧正常绘制；保留首次与重复流程，不能将默认测试泵帧策略得到的少量帧直接当成完整动画性能。
- Seen: 1× (2026-11-12; task: 20261112T183000-macos-visual-standard.md)

### L-084: 原生 Flutter 测试与外部辅助功能检查串行进行

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter macOS integration_test、Computer Use、SemanticsHandle
- 触发：原生测试运行期间，从外部读取同一 App 的辅助功能树。
- 根因：外部辅助功能查询可启用额外的语义句柄，测试功能流程全部通过后仍在清理阶段报 A SemanticsHandle was active，干扰测试结果。
- 解法：原生集成测试完整结束后再读取该 App 的 AX 树与截图；不通过修改第三方测试框架或跳过收尾断言规避。
- 证据：gallery-native-ax-first.log 所有交互完成后清理失败；不同时运行外部 AX 查询的 gallery-native.log 独立复跑通过。
- Done right：自动化流程与人工式原生检查顺序执行，保留首次失败及独立复跑证据。
- Seen: 1× (2026-11-12; task: 20261112T183000-macos-visual-standard.md)

### L-085: AppKit 可选回调不能直接假定父类有实现

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter macOS、Swift AppDelegate、NSApplicationDelegate 可选方法
- 触发：在 FlutterAppDelegate 子类增加 applicationDidFinishLaunching，并调用 super 的同名方法。
- 根因：协议中的可选方法可通过编译，但当前父类没有对应实现；调用 super 触发 Objective-C 消息转发异常，中断系统启动流程。
- 解法：本次撤回额外的启动激活覆盖，恢复 Flutter 默认 AppDelegate；不要通过新增超时或改动偏好加载掩盖启动异常。
- 证据：Release 重启黑屏；release-startup-system.log 的 NSInvalidArgumentException 调用栈定位到新增 AppDelegate 回调。恢复后独立原生双轮流程通过，最终 Release 退出重开、设置和偏好保留正常；见 client/test-artifacts/macos-visual/REVIEW.md。
- Done right：原生宿主修改除 Flutter 流程外，还要验收打包 App 的退出与重开，检查实际原生异常；Dart 测试通过不能证明 AppKit 生命周期没有异常。
- Seen: 1× (2026-11-12; task: 20261112T183000-macos-visual-standard.md)

### L-086: 自绘焦点装饰需要订阅焦点变化

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter FocusNode、自绘布局把手、分屏键盘操作
- 触发：通过键盘安排分屏后打开另一应用，旧布局把手的焦点颜色仍保留，新应用按钮同时显示焦点。
- 根因：装饰只在父页面构建时读取 hasFocus，后续焦点转移没有触发该装饰重新构建。
- 解法：布局把手与分隔条通过 onFocusChange 更新显示；指针与键盘的可见性仍由 AppleFocusVisibility 统一决定。
- 证据：Release 分屏截图发现旧把手和新按钮同时强调；widget_test 的连续键盘测试补充旧把手颜色检查后通过，make check 与 macOS 原生流程通过。
- Done right：分别断言焦点位置和焦点外观，覆盖导航后旧焦点装饰清除，不以操作仍可执行代替视觉状态验证。
- Seen: 1× (2026-11-12; task: 20261112T183000-macos-visual-standard.md)

### L-087: 中断 macOS 测试后核对 App 子进程是否仍存在

- 类型：Pitfall
- 状态：Verified
- 范围：Flutter macOS、Debug/Profile/Release 同应用标识、原生验收
- 触发：中断驱动后重新测试，或在多份同标识产物之间用工具查看窗口。
- 根因：驱动父进程结束不代表 App 子进程结束，残留 App 可由 PID 1 接管；同标识多实例会干扰置前和窗口选择。
- 解法：检查本项目 App 的完整路径、PID 与父 PID，只清理本任务遗留实例；自动化验收与 Release 人工检查分别运行。
- 证据：本轮 ps 显示已中断 Debug/Profile 的 App 由 PID 1 接管；工具按同名或标识误读到 Test finished 窗口。清理后原生两轮在 resumed 状态完成，结束时没有残留 Demo 进程。
- Done right：中断后同时核对驱动与 App 子进程，不通过修改第三方 Flutter 工具或重写正常宿主生命周期处理窗口误选；个别历史等待超时的全部原因未独立确认。
- Seen: 1× (2026-11-12; task: 20261112T183000-macos-visual-standard.md)

### L-088: Flutter 客户端由宿主拥有状态，表现重建只替换订阅

- 类型：Success
- 状态：Verified
- 范围：Flutter 客户端替换、Actor、界面重建、服务端测试协议
- 触发：用户要求删除旧客户端、保留服务端，并要求界面重建不打断业务。
- 解法：Flutter 工作区统一迁入 client；删除 Vue/Tauri 与客户端 Rust，保留公共 C 核心。
  宿主持有 Actor 和数据资源，页面持有可失效订阅；同步消息转换后提交不可变状态，
  异步结果重新入队，界面代次与业务任务身份分开。真实重计算出现后再引入有界 isolate，
  Web 保持同一消息语义并分块执行，不预建无业务使用的线程池。
- 证据：客户端 runtime/widget/build-failure 测试、macOS Profile 生命周期流程、Release 退出重开与偏好恢复通过；
  服务端测试协议迁出后 260 项单测、全部集成及真实网关探针通过。
  见 client/test-artifacts/client-replacement-review.md。
- Done right：删除前先迁出服务端反向依赖；先定义所有权、消息顺序和失效条件，再拆分目录。
  不把空白 Chat 的状态恢复测试表述为真实 WebSocket 不断连已验收。
- Seen: 1× (2026-11-13; task: 20261112T230000-flutter-client-replacement.md)

### L-089: 服务端测试改动按受影响流程验收

- 类型：Pitfall
- 状态：Verified
- 范围：服务端测试迁移、Shell 入口、任务验收范围
- 触发：只修改服务端测试和工具链，却因任务收尾要求运行 `make check-full`。
- 根因：将“完成覆盖本次改动的端到端测试”扩大解释为必须执行客户端与画廊原生 E2E。
- 解法：服务端测试迁移验证真实服务进程、网络探针、管理命令和异常清理；
  真实模型探针本身发生迁移时验证其实际入口。客户端和画廊 E2E 不作为此类任务的验收条件。
- 证据：2026-11-13 用户明确纠正；本次服务端全部集成通过，故障、中断与缺凭据路径通过。
  编码与协作规范及开发指南已明确范围。
- Done right：先根据改动选择服务端、客户端或跨系统流程，再选执行命令；不以总入口扩大测试范围。
- Seen: 1× (2026-11-13; task: 20261113T005931-server-tests-lua.md)
