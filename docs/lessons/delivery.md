# 构建、平台与开发工具

[返回经验索引](../../LESSONS.md)

<a id="l-012"></a>

### L-012 清理接口前核对使用者和文档承诺

从线上入口、公开协议和集成文档核对实际职责。测试是唯一调用者时，区分对公共能力的测试与仅为测试添加的接口。 [编码与协作规范.md](../../编码与协作规范.md)、[隐式约定.md](../../server/隐式约定.md)

Verified · Seen: 1× (2026-11-05)

<a id="l-037"></a>

### L-037 安装项目扩展后检查实际生效的作用域

核对项目来源、有效配置、模型可见技能及运行时工具。对照项目外的状态，辨别管理清单里仍列出的禁用项。 [AGENTS.md](../../AGENTS.md)、[config.toml](../../.codex/config.toml)

Verified · Seen: 2× (2026-11-06, 2026-11-10)

<a id="l-046"></a>

### L-046 验证签名时检查整个 macOS App bundle

可执行文件的签名不覆盖所有资源。对实际产物执行 `codesign --verify --deep --strict`，随后使用 L-095 的启动检查。 [configure-xcode.rb](../../client/tooling/configure-xcode.rb)、[macos.mjs](../../client/tooling/macos.mjs)

Verified · Seen: 1× (2026-11-07)

<a id="l-052"></a>

### L-052 跨进程读取的证据文件要原子发布

截断后写入会让读者拿到空文件或半份 JSON。先在同目录完成写入再替换，让独立进程在写入期间持续读取验证。 [prompts_spec.lua](../../server/tests/unit/prompts_spec.lua)、[Workspace.swift](../../client/native/apple/Sources/SkynetHostCore/Workspace.swift)

Verified · Seen: 1× (2026-11-08)

<a id="l-064"></a>

### L-064 异步模式切换验收要等业务结果

选项的即时值会早于宿主授权和服务器确认。切换执行目标时检查实际会话目标，拒绝时检查失败结果，取消时等待对应运行的终态。 [agent-client.test.ts](../../client/tooling/agent-client.test.ts)、[CLIENT_AGENT.md](../../docs/architecture/CLIENT_AGENT.md)

Verified · Seen: 1× (2026-11-09)

<a id="l-089"></a>

### L-089 测试变更沿实际受影响的服务端流程验收

覆盖真实进程、网络探针、控制命令和异常清理，按改动涉及的端与子系统选择回归入口。 [编码与协作规范.md](../../server/编码与协作规范.md)、[DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

Verified · Seen: 1× (2026-11-13)

<a id="l-094"></a>

### L-094 用完整的新目录替换带摘要的内置资源

叠加复制会留下旧哈希文件，导致清单与实际内容不符。从已有旧资源的产物更新，再启动并校验包。 [copy-resources.mjs](../../client/tooling/copy-resources.mjs)、[configure-ios.rb](../../client/tooling/configure-ios.rb)

Verified · Seen: 1× (2026-11-13)

<a id="l-095"></a>

### L-095 直接启动新构建且已完成本地签名的 App

dyld 对嵌入框架的校验发生在启动时。本地构建需从产物验证启动和界面，发行签名、Hardened Runtime 与公证按发行流程另验。 [configure-xcode.rb](../../client/tooling/configure-xcode.rb)、[编码与协作规范.md](../../client/编码与协作规范.md)

Verified · Seen: 1× (2026-11-13)

<a id="l-096"></a>

### L-096 界面验收按实际授权使用输入设备

后台检查失败时先确认是否获准占用前台输入。工具受限时记录未验收的操作。锁屏交互需要单独授权和实际验证。 [编码与协作规范.md](../../client/编码与协作规范.md)

Verified · Seen: 1× (2026-11-13)

<a id="l-097"></a>

### L-097 扩展配置变更后在新服务进程验证

管理界面显示启用时，已运行的服务仍可能使用旧环境。重新加载承载工具的客户端，以只读查询确认本项目实际连接到期望服务。 [AGENTS.md](../../AGENTS.md)、[config.toml](../../.codex/config.toml)

Verified · Seen: 1× (2026-11-13)

<a id="l-099"></a>

### L-099 先隔离平台依赖，再开放平台构建入口

共享工作区只依赖标准 RN 能力，由平台注入视图与桥接。逐平台核对宿主、运行时与隔离能力，再启用对应构建。 [CLIENT_PLATFORMS.md](../../docs/architecture/CLIENT_PLATFORMS.md)、[platforms.test.ts](../../client/tooling/platforms.test.ts)

Verified · Seen: 1× (2026-11-13)

<a id="l-100"></a>

### L-100 Swift 包增加 C/C++ 依赖时验证最终 Xcode 工程

Swift 模块的外部消费者也需要头文件和 module map。用实际 App 工程编译导入路径。 [module.modulemap](../../client/native/core/include/module.modulemap)、[configure-xcode.rb](../../client/tooling/configure-xcode.rb)

Verified · Seen: 1× (2026-11-13)

<a id="l-101"></a>

### L-101 原生目录移动后用干净构建核对头文件

独立编译桥接头检查相对包含路径，再从干净的构建目录编译最终消费者，排除旧缓存遮蔽缺失依赖。 [shim.h](../../client/native/apple/Sources/AgentRuntime/shim.h)、[Package.swift](../../client/native/Package.swift)

Verified · Seen: 1× (2026-11-13)

<a id="l-110"></a>

### L-110 Fabric 自定义图像加载器要在 iOS 宿主注册

通过依赖提供者注册原生 loader，在实际宿主用标准 Image 验证符号加载。 [SymbolLoader.m](../../client/apps/host/ios/SkynetHost/SymbolLoader.m)、[HostApplication.swift](../../client/apps/host/ios/SkynetHost/HostApplication.swift)

Verified · Seen: 1× (2026-11-14)

<a id="l-111"></a>

### L-111 Hosted 测试复用 App 已链接的静态核心

同一静态核心被装入两次会产生类型或运行时身份冲突。设置 `TEST_HOST`、`BUNDLE_LOADER` 和模块搜索路径，再从测试 bundle 使用宿主实现。 [configure-ios.rb](../../client/tooling/configure-ios.rb)、[MobileHostTests.swift](../../client/apps/host/ios/SkynetHostTests/MobileHostTests.swift)

Verified · Seen: 1× (2026-11-14)

<a id="l-112"></a>

### L-112 最低平台版本同时满足原生框架和系统 WebKit

检查 RN、Swift 包、WebView 及共享 CSS 的能力边界，再同步工程生成配置和平台支持文档。 [CLIENT_PLATFORMS.md](../../docs/architecture/CLIENT_PLATFORMS.md)、[Package.swift](../../client/native/Package.swift)、[Podfile](../../client/apps/host/ios/Podfile)

Verified · Seen: 1× (2026-11-14)
