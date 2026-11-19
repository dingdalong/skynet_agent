# Skynet 服务与热修

[返回经验索引](../../LESSONS.md)

<a id="l-001"></a>

### L-001 Lua 服务间消息固定通过 RPC 指定协议

`skynet.send` 的第二个参数是协议名。业务命令放在 `"lua"` 后面，测试同时检查消息类型和接收端参数。 [rpc.lua](../../server/src/lualib/base/rpc.lua)

Verified · Seen: 1× (2026-11-04)

<a id="l-002"></a>

### L-002 新增 Lua 搜索目录时同时验证运行时和 Busted

目录模块需要 `?/init.lua`，共享枚举需要仓库级 `common` 搜索根。在实际服务和独立测试里用同一模块名加载，才能发现只在一个环境生效的路径改动。 [config.path](../../server/etc/config.path)、[makefile](../../server/makefile)

Verified · Seen: 1× (2026-11-04)

<a id="l-007"></a>

### L-007 改变 require 时机后，在加载被测模块之前注入依赖

顶层加载会捕获当时的依赖，惰性加载会暴露对测试顺序的依赖。显式注入并恢复受影响的 `package.loaded` 项，单独运行原用例。 [modules.lua](../../server/tests/support/modules.lua)

Verified · Seen: 2× (2026-11-04, 2026-11-08)

<a id="l-009"></a>

### L-009 进程配置由实际消费者读取

`etc.cfg` 在启动时确定渠道配置。把配置和连接回调分开，业务模块读取配置，调用方传递每个实例独有的数据。 [init.lua](../../server/etc/cfg/init.lua)、[编码与协作规范.md](../../server/编码与协作规范.md)

Verified · Seen: 1× (2026-11-04)

<a id="l-011"></a>

### L-011 热修前后创建的实例都要继续使用稳定类表

构造函数捕获候选类表，会让第二次热修漏掉第一次热修后创建的实例。用接收调用的类表创建实例，再对新旧实例做连续热修。 [class.lua](../../server/src/lualib/base/class.lua)、[hotfix_runtime.lua](../../server/tests/integration/hotfix_runtime.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-014"></a>

### L-014 向不同服务分发同名命令时保持业务参数一致

登录前后会切换接收服务。传输来源由 dispatch 的 `source` 提供，单测分别断言登录和已绑定连接的参数顺序。 [websocket.lua](../../server/src/service/websocket/websocket.lua)、[websocket_service_spec.lua](../../server/tests/unit/websocket_service_spec.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-016"></a>

### L-016 登录编排由 logind 完成，连接同步等待绑定

连续收到登录和业务帧时，WebSocket 等待 logind 打开 client、绑定连接并响应，再处理下一帧。覆盖绑定失败后的释放路径。 [logind.lua](../../server/src/service/logind/logind.lua)、[logind_spec.lua](../../server/tests/unit/logind_spec.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-017"></a>

### L-017 共享 Protobuf schema 后，每个 VM 仍要建立本地映射

长期存活的所有者加载共享 C state，消费服务先 `attach` 再初始化名称和哈希映射。用两个真实服务验证跨 VM 收发。 [protobuf.lua](../../server/src/lualib/helper/protobuf.lua)、[protobuf_shared_smoke.sh](../../server/tests/integration/protobuf_shared_smoke.sh)

Verified · Seen: 1× (2026-11-05)

<a id="l-020"></a>

### L-020 异步 RPC 成功要同时检查异常和返回值

无效地址或超大消息可能返回 `nil` 或 `false`。只有受保护调用成功且返回 `0` 才表示已交给 Skynet，交付失败时由发送方回收资源。 [rpc.lua](../../server/src/lualib/base/rpc.lua)、[rpc_spec.lua](../../server/tests/unit/base/rpc_spec.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-022"></a>

### L-022 关闭验收读取子进程的退出码

收到 stop 响应和进程消失均可能早于结果收集。监督进程执行 `wait`，分别验证正常清理和失败退出。 [shutdown_runtime_smoke.sh](../../server/tests/integration/shutdown_runtime_smoke.sh)、[DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

Verified · Seen: 1× (2026-11-05)

<a id="l-023"></a>

### L-023 服务主体的模块名贯穿加载、测试和热修

`src/service/init.lua` 按服务名加载主体，`main` 持有节点入口。移动目录后重启，再在新结构上验证已有实例的兼容方法热修。 [init.lua](../../server/src/service/init.lua)、[service_runtime.lua](../../server/tests/integration/service_runtime.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-024"></a>

### L-024 关闭前等待在途命令，并汇总迟到的清理错误

先保存要等待的请求，再发出取消并等到实际退出。让释放错误传到节点最终结果，覆盖取消已确认、清理随后失败的时序。 [service.lua](../../server/src/lualib/base/service.lua)、[shutdown_runtime.lua](../../server/tests/integration/shutdown_runtime.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-025"></a>

### L-025 生命周期等待与业务 RPC 超时分别处理

启动和正常关闭可能合法地长时间等待，应使用无超时调用。启动期间保留显式强制关闭入口，覆盖启动尚未完成时的控制命令。 [node.lua](../../server/src/lualib/base/node.lua)、[shutdown_runtime.lua](../../server/tests/integration/shutdown_runtime.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-026"></a>

### L-026 调整本机服务端口时同步控制工具和调用地址

项目服务使用 10000 以上的默认端口。变更监听地址前检查占用，再用目标端口实际访问网关和控制台。 [common.lua](../../server/etc/cfg/common.lua)、[DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

Verified · Seen: 1× (2026-11-05)

<a id="l-027"></a>

### L-027 服务 loader 注入的变量要在离线环境单独提供

Busted 加载入口时要模拟 `SERVICE_NAME` 并恢复模块缓存。静态分析使用声明，运行时继续使用框架提供的值。 [init.lua](../../server/src/service/init.lua)、[service_spec.lua](../../server/tests/unit/base/service_spec.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-028"></a>

### L-028 标准库扩展从 preload 注入，并排除热修

Lua 会优先返回已加载的 `table`。在预加载阶段安装扩展，热修扫描排除会修改共享状态的顶层模块。 [preload.lua](../../server/src/lualib/base/preload.lua)、[hotfix.lua](../../server/src/lualib/base/hotfix.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-029"></a>

### L-029 公共服务入口排在专用脚本和内置服务之后

固定的 `service/init.lua` 可以匹配任意服务名。启动业务服务和内置服务各一次，核对 loader 选择的入口。 [config.path](../../server/etc/config.path)、[service_runtime_smoke.sh](../../server/tests/integration/service_runtime_smoke.sh)

Verified · Seen: 1× (2026-11-06)

<a id="l-031"></a>

### L-031 验证热修时检查触发方式、目标 VM 和实际更新模块

每个 VM 有独立缓存。分别用 watcher 和管理命令核对各目标的 updated/skipped，并在已经存在的实例上执行变更的方法。 [hotfix_watch_probe.lua](../../server/tests/integration/hotfix_watch_probe.lua)、[hotfix_runtime.lua](../../server/tests/integration/hotfix_runtime.lua)

Verified · Seen: 2× (2026-11-06, 2026-11-13)

<a id="l-032"></a>

### L-032 多 VM 热修先编译同一份快照，再由各 VM 检查兼容性

节点仅编译候选源码，避免语法错误导致部分 VM 先更新。运行时错误与接口兼容性由目标 VM 判定，按批次汇总成功、跳过和失败。 [node.lua](../../server/src/lualib/base/node.lua)、[node_spec.lua](../../server/tests/unit/base/node_spec.lua)

Verified · Seen: 1× (2026-11-06)

<a id="l-042"></a>

### L-042 新请求要同时检查协议方向和实际暴露的 handler

入口校验 `Req`，绑定后仅从已登记的 `REQUEST` 表按短消息名查找。保留表引用，每次分发时查函数，以便热修对已有用户生效。 [隐式约定.md](../../server/隐式约定.md)、[client_service_spec.lua](../../server/tests/unit/client_service_spec.lua)

Verified · Seen: 1× (2026-11-07)
