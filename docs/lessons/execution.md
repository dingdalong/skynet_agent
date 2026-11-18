# 工具执行与沙盒

[返回经验索引](../../LESSONS.md)

<a id="l-048"></a>

### L-048 同时验证 macOS 沙盒内的正常执行与越界拒绝

系统加载器需要访问根目录本身。调整 Seatbelt 规则后，同时验证正常程序启动、越界操作被拒和宿主文件状态。 [sandbox.c](../../common/native/agent_runtime/sandbox.c)、[LocalExecutionTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/LocalExecutionTests.swift)

Verified · Seen: 1× (2026-11-08)

<a id="l-050"></a>

### L-050 Linux 沙盒的临时挂载避开工作目录祖先

祖先目录被可写临时挂载覆盖时，越界写入可能“成功”在临时副本里。分别核对命令结果与宿主目录，验证会话工作目录和临时目录各自的写入边界。 [sandbox.c](../../common/native/agent_runtime/sandbox.c)、[test_runtime.c](../../common/native/agent_runtime/test_runtime.c)

Verified · Seen: 1× (2026-11-08)

<a id="l-055"></a>

### L-055 用宿主侧的实际结果验收复合命令权限

最后一个子命令可能掩盖前面的拒绝。分别核对每个受限操作的输出和目标文件，再验证授权路径的实际结果。 [test_runtime.c](../../common/native/agent_runtime/test_runtime.c)、[LocalExecutionTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/LocalExecutionTests.swift)

Verified · Seen: 1× (2026-11-08)

<a id="l-057"></a>

### L-057 通过目录描述符打开项目规则文件

路径检查与打开之间可能发生替换。逐级拒绝符号链接，打开后用 `fstat` 确认普通文件，覆盖 FIFO 造成的阻塞风险。 [filesystem.c](../../common/native/agent_runtime/filesystem.c)、[test_runtime.c](../../common/native/agent_runtime/test_runtime.c)

Verified · Seen: 1× (2026-11-09)

<a id="l-058"></a>

### L-058 验收自动注入项目规则时，隔离其它信息来源

每轮使用只写入规则文件的随机目标，排除用户消息、历史和工具读取泄露答案的路径，再从实际产物核验模型使用了目标。 [PROMPTS.md](../../docs/architecture/PROMPTS.md)、[prompts_spec.lua](../../server/tests/unit/prompts_spec.lua)

Verified · Seen: 1× (2026-11-09)

<a id="l-065"></a>

### L-065 原生构建参数改变时按配置内容使对象失效

秒级时间戳可能让同一秒更新的 stamp 与旧对象同龄。配置内容改变才强制重建，连续切换参数并检查实际编译。 [makefile](../../common/native/agent_runtime/makefile)

Verified · Seen: 1× (2026-11-10)

<a id="l-108"></a>

### L-108 长等待输出回调要用 Release 构建验证

轮询期间反复复制含回调的对象会积累包装并在释放时递归。每个请求持有稳定引用，验证长等待只回调一次且可继续访问进程。 [AgentServices.swift](../../client/native/apple/Sources/SkynetHostCore/AgentServices.swift)、[LocalExecutionTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/LocalExecutionTests.swift)

Verified · Seen: 1× (2026-11-14)
