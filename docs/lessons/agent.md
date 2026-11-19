# 协议、会话与模型

[返回经验索引](../../LESSONS.md)

<a id="l-004"></a>

### L-004 用同一组完整二进制帧验证两端编码

向量同时固定类型名哈希、字节序、消息编号和消息体。让 Lua 和客户端读取同一份样本并覆盖非法方向与长度。 [protocol_vectors.json](../../common/proto/testdata/protocol_vectors.json)、[protobuf_spec.lua](../../server/tests/unit/protobuf_spec.lua)、[agent-client.test.ts](../../client/tooling/agent-client.test.ts)

Verified · Seen: 1× (2026-11-04)

<a id="l-008"></a>

### L-008 协议边界显式检查成功码

标量有默认值，缺失的返回码容易被当作成功。只在 `ret` 等于成功枚举时提交业务结果，并用缺省标量覆盖失败路径。 [error_code.lua](../../common/enum/error_code.lua)、[index.ts](../../client/packages/agent-client/src/index.ts)

Verified · Seen: 1× (2026-11-04)

<a id="l-018"></a>

### L-018 收到取消确认后继续等待生成任务的终态

模型调用可能仍在退出。等回滚、释放占用和最终通知完成，再允许下一轮使用该会话。用取消回执先到、终态后到的顺序验证。 [run.lua](../../server/src/lualib/agent/run.lua)、[agent-client.test.ts](../../client/tooling/agent-client.test.ts)

Verified · Seen: 1× (2026-11-05)

<a id="l-019"></a>

### L-019 迟到的连接回调只能清理所属代次

断开、重连之后再交付旧结果，核对新连接、请求和草稿。旧请求自己的资源收尾另见 L-105。 [index.ts](../../client/packages/agent-client/src/index.ts)、[agent-client.test.ts](../../client/tooling/agent-client.test.ts)

Verified · Seen: 1× (2026-11-05)

<a id="l-021"></a>

### L-021 流式模型请求从发送到读完共用一个截止时间

收到响应头后仍可能长时间收不到流数据。用剩余预算约束读取和关闭，验证超时后请求能够退出。 [skynet_compat.lua](../../server/src/lualib/openai/skynet_compat.lua)、[skynet_compat_spec.lua](../../server/tests/unit/openai/skynet_compat_spec.lua)

Verified · Seen: 1× (2026-11-05)

<a id="l-034"></a>

### L-034 重试绑定原会话和显示中的运行身份

用户切换会话或输入下一条草稿后，旧失败仍可能到达。按原会话、消息和 run 定位操作，验证恢复后保留新草稿。 [agent-client.test.ts](../../client/tooling/agent-client.test.ts)、[CLIENT_AGENT.md](../../docs/architecture/CLIENT_AGENT.md)

Verified · Seen: 1× (2026-11-06)

<a id="l-040"></a>

### L-040 断线只释放连接，用户任务继续运行

多端共享用户数据，同会话的生成占用随任务结束释放。用第二条连接恢复快照并观察离线期间的生成结果。 [user.lua](../../server/src/lualib/user.lua)、[AGENT_GATEWAY.md](../../docs/architecture/AGENT_GATEWAY.md)

Verified · Seen: 1× (2026-11-07)

<a id="l-041"></a>

### L-041 固定快照内容后，按会话版本合并并发推送

快照深拷贝可变消息，登录期间缓冲早到的通知。忽略重复或迟到版本，发现缺口时获取快照，并再次合并等待期间的更新。 [agent_session.lua](../../server/src/lualib/agent_session.lua)、[agent-client.test.ts](../../client/tooling/agent-client.test.ts)

Verified · Seen: 1× (2026-11-07)

<a id="l-049"></a>

### L-049 主模型与权限模型使用各自的 HTTP 超时配置

HTTP 模块的可变超时会污染并行请求。隔离各客户端的请求配置，交错发起两个期限不同的请求验证。 [skynet_compat.lua](../../server/src/lualib/openai/skynet_compat.lua)、[skynet_compat_spec.lua](../../server/tests/unit/openai/skynet_compat_spec.lua)

Verified · Seen: 1× (2026-11-08)

<a id="l-056"></a>

### L-056 用稳定历史前缀维护模型缓存

公共消息、历史与已编码工具结果按顺序追加。传输层原样转发 SDK 请求体，避免解码再编码改变空数组。缓存效果查供应商实际返回的用量。 [PROMPTS.md](../../docs/architecture/PROMPTS.md)、[skynet_compat_spec.lua](../../server/tests/unit/openai/skynet_compat_spec.lua)

Verified · Seen: 1× (2026-11-08)

<a id="l-060"></a>

### L-060 同一草稿发起的不同请求分别核对归属

延迟首发响应时先切换目标或输入下一条消息。用请求身份、草稿版本和发送内容判定可以提交或迁移哪份草稿。 [index.ts](../../client/packages/agent-client/src/index.ts)、[agent-client.test.ts](../../client/tooling/agent-client.test.ts)

Verified · Seen: 1× (2026-11-09)

<a id="l-063"></a>

### L-063 在桌面执行结果进入 Lua 时归一化 JSON null

`cjson.null` 在 Lua 中是真值。先处理嵌套结果中的可选空字段，再把结果交给执行器，覆盖真实 JSON 解码路径。 [execution.lua](../../server/src/lualib/agent/execution.lua)、[desktop_execution_spec.lua](../../server/tests/unit/desktop_execution_spec.lua)

Verified · Seen: 1× (2026-11-09)

<a id="l-103"></a>

### L-103 在实际 JSC 业务运行时加载协议依赖并收发消息

Node 提供的文本编码 API 在独立 JSC 中可能缺失。构建时提供受限的文本编解码实现，用实际内置应用验证登录与消息处理。 [text-codec.ts](../../client/packages/app-runtime/src/text-codec.ts)、[build-apps.mjs](../../client/tooling/build-apps.mjs)、[test-native.mjs](../../client/tooling/test-native.mjs)

Verified · Seen: 1× (2026-11-14)

<a id="l-104"></a>

### L-104 回答结束后继续接受所属后台工具的状态更新

工具进程可以跨越模型轮次。按会话、消息、工具身份和 revision 更新记录，覆盖回答已完成后进程才退出的场景。 [agent-client.test.ts](../../client/tooling/agent-client.test.ts)、[AGENT_GATEWAY.md](../../docs/architecture/AGENT_GATEWAY.md)

Verified · Seen: 1× (2026-11-14)

<a id="l-106"></a>

### L-106 相同模型的重复选择应幂等

区分正在请求、已生效和不同目标。请求期间显示目标，重复输入保持原结果，避免错误横幅挤动聊天内容。 [agent-client.test.ts](../../client/tooling/agent-client.test.ts)、[view.tsx](../../client/builtins/agent/src/view.tsx)

Verified · Seen: 1× (2026-11-14)
