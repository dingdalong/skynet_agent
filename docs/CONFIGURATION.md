# 配置说明

服务端配置位于 `server/etc/cfg/`，客户端连接配置见 `client/.env.example`。
本文说明配置方式、可用值与生效条件；首次启动见[项目首页](../README.md#快速开始)。

## 环境文件

将 `server/.env.example` 复制为 `server/.env`，填写模型 API Key。该文件使用 shell 兼容语法，
由 `server/start.sh` 加载；只保存本机密钥和环境选择，不提交真实密钥。可用环境变量如下：

| 变量                   | 用途与可用值                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `SKYNET_ENV_FILE`      | 启动脚本读取的环境文件路径；未指定时读取 `server/.env`，需在启动脚本前设置               |
| `SKYNET_CFG_CHANNEL`   | 渠道文件名，省略时使用 `develop`；以字母开头，仅含字母、数字、下划线，且渠道文件必须存在 |
| `DEEPSEEK_API_KEY`     | 非空 API Key，启动脚本要求提供                                                           |
| `DEEPSEEK_BASE_URL`    | 开发渠道的模型服务地址                                                                   |
| `DEEPSEEK_MODEL`       | 开发渠道的模型名称及新会话默认模型 ID；该 ID 必须存在于模型清单                          |
| `AGENT_WORKSPACE_ROOT` | 云端会话工作目录的根路径                                                                 |

密钥由服务端持有，不传给客户端。当前接入 DeepSeek；模型服务需要支持项目使用的 Responses API、
流式输出与工具调用，不能仅凭 OpenAI 兼容的声明判断可用性。

## 渠道与配置加载

`server/etc/cfg/init.lua` 根据渠道选择 `channel/<name>.lua`，与 `common.lua` 深度合并并统一校验。
渠道中的 `agent.models` 整体替换公共模型清单。配置在进程启动时加载，变更后重启。
环境变量的读取仅在配置初始化层进行，业务代码通过配置模块获取值。

Skynet 线程与启动配置位于 `server/etc/config`。三类工作池的实例数未指定时取工作线程数，
也可在渠道配置中分别覆盖。

### 运行与网关

| 配置                                | 可用值与含义                         |
| ----------------------------------- | ------------------------------------ |
| `runtime.control_port`              | 1–65535 的整数；控制台仅监听回环地址 |
| `runtime.executable_search_path`    | 工具子进程的可执行文件搜索路径字符串 |
| `protocol.agent_gateway_schema_dir` | 非空 schema 目录路径                 |
| `agent_gateway.socket.host`         | 非空监听地址                         |
| `agent_gateway.socket.port`         | 1–65535 的整数                       |
| `agent_gateway.socket.path`         | 以 `/` 开头的 WebSocket 路径         |
| `agent_gateway.instance.client`     | 1–32 的整数                          |
| `agent_gateway.instance.logind`     | 1–32 的整数                          |
| `agent_gateway.instance.websocket`  | 1–32 的整数                          |
| `agent_gateway.login_timeout_ticks` | 正整数；未完成登录连接的存活时间     |

配置目录的相对路径以服务端工作目录为基准。控制端口变更后，管理脚本需显式传入目标端口，
见[服务管理](DEVELOPMENT.md#服务管理)。

### 模型与会话

| 配置                                   | 可用值与含义                                                    |
| -------------------------------------- | --------------------------------------------------------------- |
| `agent.llm.api_key`                    | 模型密钥；设置时须为非空字符串                                  |
| `agent.llm.base_url`                   | 非空模型服务地址                                                |
| `agent.llm.model`                      | 非空模型名称                                                    |
| `agent.llm.request_timeout_ticks`      | 正整数；覆盖发送到流结束的请求总时长                            |
| `agent.models`                         | 有序模型清单，每项提供非空的 `id`、`name`、`model`，ID 不可重复 |
| `agent.default_model_id`               | 模型清单中的 ID，指定新会话默认模型                             |
| `agent.max_message_length`             | 正整数；客户端输入文本长度上限                                  |
| `agent.session_title_length`           | 正整数；会话标题长度上限                                        |
| `agent.project_instructions_max_bytes` | 非负整数；根项目规则的字节上限，`0` 关闭自动加载                |

模型清单的每项可覆盖 `agent.llm` 的连接默认值。客户端只获得公开模型描述，可按会话选择模型。
运行中的模型请求继续使用已取得的配置，后续请求使用新选择；权限模型由下文配置决定。
对话与模型生命周期见[会话模型与思考流](architecture/AGENT_GATEWAY.md#会话模型与思考流)，
根规则选择、超限与读取失败行为见[项目规则](architecture/PROMPTS.md#项目规则)。

### 工具与权限

| 配置                             | 可用值与含义                                                   |
| -------------------------------- | -------------------------------------------------------------- |
| `agent.tools.workspace_root`     | 非空路径；云端工作目录根路径，可由 `AGENT_WORKSPACE_ROOT` 提供 |
| `agent.tools.timeout_ms`         | 1–3600000 的整数；工具进程执行期限，单位毫秒                   |
| `agent.tools.max_processes`      | 1–64 的整数；会话进程数量上限                                  |
| `agent.tools.max_output_bytes`   | 4096–4194304 的整数；输出字节上限                              |
| `agent.permission.rules_enabled` | `true` 或 `false`；是否启用规则拦截                            |
| `agent.permission.deny_patterns` | 可选字符串数组；每项为有效 Lua pattern，用于禁止规则           |
| `agent.permission.model_id`      | 可选模型清单 ID；省略时跟随会话模型                            |
| `agent.permission.timeout_ticks` | 1–12000 的整数；独立权限判断超时                               |

所有 `_ticks` 字段单位为厘秒，工具执行的 `timeout_ms` 单位为毫秒。工具调用次数不设上限。
规则只能阻止动作，通过规则后仍逐次调用独立权限模型；拒绝、失败或判断无效均不执行工具，
也不转交人工审批。关闭规则拦截不会关闭模型判断或系统沙盒。

工具参数 `sandbox_permissions` 可取 `use_default`、`require_escalated`；沙盒外执行需提供
`justification` 并通过权限判断。默认沙盒允许联网，写入限制在会话工作目录。
文件独立保留在磁盘，不随清空聊天历史或服务端重启自动删除。

macOS、Linux 桌面可绑定本机工作目录，并手动开启“允许其他设备远程执行”。开关和目录绑定按用户名
保存在该桌面；目标离线时拒绝执行，不重放未确认操作。Web、移动端和 Windows 提供云端与远程继续，
不在这些设备选择本地目录。切换目标前需结束任务及后台进程，文件不会自动复制。
执行、取消、重试和授权机制见[工具执行与权限](architecture/AGENT_GATEWAY.md#工具执行与权限)。

## 客户端连接

通过 `client/.env.local` 的 `VITE_AGENT_WS_URL` 覆盖客户端连接地址，格式为
`ws://<host>:<port>/<path>` 或 `wss://<host>:<port>/<path>`；地址与网关监听或反向代理入口对应，
示例见 [`client/.env.example`](../client/.env.example)。

Web 开发、桌面启动和构建使用同一套 Vite 环境配置。桌面 Rust 核心的连接地址在构建时注入，
修改后需重启桌面开发进程，或重新构建安装包；已安装的包不会读取源码目录中的环境文件。

## 部署边界

本机回环连接可使用 `ws://`，其他地址使用 `wss://`，由反向代理终止 TLS 后转发到网关。
模型密钥只由服务端使用，不写入客户端环境文件。

当前仅按用户名识别用户，没有密码认证，非回环监听限于受控网络。公网发布前需要认证、授权、
限流和连接配额。聊天数据只保留在进程内存，服务端重启后清空；会话目录中的文件独立保留。
