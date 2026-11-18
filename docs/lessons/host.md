# 客户端宿主与运行时

[返回经验索引](../../LESSONS.md)

<a id="l-071"></a>

### L-071 后台文档的就绪和清理要有独立于动画帧的路径

隐藏的 WebView 可能暂停时间线。状态、主题和租约先同步，视图恢复时直接使用有效快照。验收覆盖文档隐藏后再显示。 [react.tsx](../../client/packages/app-sdk/src/react.tsx)、[CLIENT_RUNTIME.md](../../docs/architecture/CLIENT_RUNTIME.md)

Verified · Seen: 2× (2026-11-10, 2026-11-13)

<a id="l-090"></a>

### L-090 分别验证表现重载、业务运行时故障和宿主资源释放

界面只订阅快照。重载后核对物理连接与任务身份，再单独验证业务崩溃隔离及资源回收。macOS 在独立进程验证，iOS 在独立 VM 验证。 [隐式约定.md](../../client/隐式约定.md)、[ProcessTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/ProcessTests.swift)、[EmbeddedRuntimeTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/EmbeddedRuntimeTests.swift)

Verified · Seen: 1× (2026-11-13)

<a id="l-093"></a>

### L-093 逐行 IPC 用真实双向 socket 验证短帧

短回复在长寿命连接上必须及时交付。按可用字节读取，保留半帧并限制帧大小，同时验证两个方向的消息。 [main.swift](../../client/native/apple/Sources/SkynetAppRuntime/main.swift)、[RuntimeProcess.swift](../../client/native/apple/Sources/SkynetHostCore/RuntimeProcess.swift)

Verified · Seen: 1× (2026-11-13)

<a id="l-098"></a>

### L-098 首屏渲染读取当前文档的状态和主题

主文档开始时注入快照和文档身份，首次布局应用主题。就绪信号只允许揭开对应视图的遮罩。覆盖重开、重载及旧信号晚到。 [bridge.ts](../../client/packages/app-sdk/src/bridge.ts)、[react.tsx](../../client/packages/app-sdk/src/react.tsx)、[AppSurface.swift](../../client/apps/host/macos/SkynetHost-macOS/AppSurface.swift)

Verified · Seen: 1× (2026-11-13)

<a id="l-105"></a>

### L-105 失效代次仍需完成原请求的资源收尾

晚到的回调按原请求完成或拒绝，回到所有者队列后再判断能否更新当前业务状态。验证取消后回调到达时在途计数能够排空。 [ResourceBroker.swift](../../client/native/apple/Sources/SkynetHostCore/ResourceBroker.swift)、[ProcessTests.swift](../../client/native/apple/Tests/SkynetHostCoreTests/ProcessTests.swift)

Verified · Seen: 1× (2026-11-14)

<a id="l-107"></a>

### L-107 长运行 JS helper 按消息释放临时对象

每条消息使用独立的 autoreleasepool，通过固定 JS 函数传数据，避免为每次输入重新编译脚本。持续收发并测量进程驻留内存。 [main.swift](../../client/native/apple/Sources/SkynetAppRuntime/main.swift)

Verified · Seen: 1× (2026-11-14)

<a id="l-113"></a>

### L-113 分别管理业务存活与真实 WebView 的缓存

切回应用时复用有效表现，隐藏期间分别控制绘制、命中和辅助功能。覆盖内存压力、迟到动画和关闭应用。旧真机截图的偶发现象仍缺同机复验。 [workspace-presentation.test.ts](../../client/tooling/workspace-presentation.test.ts)、[CLIENT_RUNTIME.md](../../docs/architecture/CLIENT_RUNTIME.md)

Verified · Seen: 1× (2026-11-14)

<a id="l-116"></a>

### L-116 WebView 冷启动测量按启动阶段和设备拆分

记录导航、首个本地请求、提交和可见正文。用同包最小页面对照，分别测量开启辅助功能检查前后的模拟器和真机 Release，区分首次进程与后续新视图。 [AppSurface.swift](../../client/apps/host/ios/SkynetHost/AppSurface.swift)

Verified · Seen: 1× (2026-11-14)
