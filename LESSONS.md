# 项目经验

## 强制检查

- **LC-051** 验收带有限动效的界面时，等过渡结束再量终态。涉及中断或反向接管时另取中间帧。[L-051](docs/lessons/workspace.md#l-051)

## 主题索引

| 主题 | 查找场景 |
| --- | --- |
| [Skynet 服务与热修](docs/lessons/server.md) | RPC、模块加载、登录路由、节点关闭、热修 |
| [协议、会话与模型](docs/lessons/agent.md) | 二进制帧、快照、重连、取消、重试、模型请求 |
| [工具执行与沙盒](docs/lessons/execution.md) | 权限、文件、进程、项目规则、原生 C 构建 |
| [客户端宿主与运行时](docs/lessons/host.md) | 资源归属、子应用、IPC、WebView、表现缓存 |
| [工作区与界面验收](docs/lessons/workspace.md) | 主题、首屏、动效、分屏、手势、键盘 |
| [构建、平台与开发工具](docs/lessons/delivery.md) | 产物、签名、原生链接、平台能力、扩展与验收权限 |

## 旧编号索引

历史证据按旧编号查 `git show 8986035:LESSONS.md`。L-117 至 L-134 已由过程日志使用，保留编号。

| 旧编号 | 去向 | 核对日期 |
| --- | --- | --- |
| L-061 | 应用请求显式登记，见[服务端隐式约定](server/隐式约定.md) | 2026-11-19 |
| L-005 | [L-017](docs/lessons/server.md#l-017) | 2026-11-05 |
| L-015 | [L-016](docs/lessons/server.md#l-016) | 2026-11-05 |
| L-043 | 当时转入 L-044，现见 [L-090](docs/lessons/host.md#l-090) | 2026-11-07 |
| L-054 | [L-056](docs/lessons/agent.md#l-056) | 2026-11-08 |
| L-067 | 当时转入 L-073，现见 [L-090](docs/lessons/host.md#l-090) | 2026-11-11 |
| L-073 | [L-090](docs/lessons/host.md#l-090) | 2026-11-13 |
| L-006 | 共用目录模块的搜索路径检查，合并到 [L-002](docs/lessons/server.md#l-002) | 2026-11-18 |
| L-079 | 过渡中读取终态的复现日期合并到 [L-051](docs/lessons/workspace.md#l-051) | 2026-11-18 |
| L-010 | 现行打包态验收见 [L-095](docs/lessons/delivery.md#l-095) | 2026-11-18 |
| L-013、L-030 | [网关架构](docs/architecture/AGENT_GATEWAY.md)维护登录编排及服务命名 | 2026-11-18 |
| L-044 | 界面订阅与连接的所有权由 [L-090](docs/lessons/host.md#l-090) 接替 | 2026-11-18 |
| L-102 | 输入授权与实际验收边界见 [L-096](docs/lessons/delivery.md#l-096) | 2026-11-18 |
| L-003、L-033、L-053 | 原二进制视图、同步传输回调与序列化适配器已移除。现行协议见[Agent 客户端](docs/architecture/CLIENT_AGENT.md) | 2026-11-18 |
| L-035、L-038、L-039、L-045、L-047、L-059、L-062、L-066、L-068、L-069、L-070 | 对应的客户端依赖、资源管线、测试夹具或原型已移除 | 2026-11-18 |
| L-076、L-078、L-080 | 单文件工作区原型及其 DOM 输入和焦点实现已移除。现行交互见[客户端设计规范](docs/design/CLIENT_DESIGN.md) | 2026-11-18 |
