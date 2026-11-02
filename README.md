# skynet_agent

基于 Skynet 的 Agent。

## 配置

将 `.env.example` 复制为 `.env`，填写 DeepSeek 配置：

```dotenv
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_MODEL=deepseek-flash
```

当前接入的是 DeepSeek Provider；上层对话逻辑统一依赖 LLM Provider 接口，后续可以增加其他 LLM 实现。

`.env` 使用 shell 兼容语法，只在本机保存，不提交真实密钥。
Skynet 运行日志写入 `logs/skynet.log`，对话内容输出到 stdout，错误写入 stderr。

## 热更新

热更新只用于修复缺陷。功能、公开接口、持久数据格式和第三方库升级仍通过重启发布。
当前 `main` 是一次性演示服务，不启用热更新；以下接入方式面向后续长期服务。

长期服务在启动时注册热更新调试命令：

```lua
local skynet = require("skynet")
local hotfix = require("base.hotfix")

skynet.start(function()
    hotfix.install_debug_command()
    -- 初始化长期服务
end)
```

长期对象只在实例字段保存数据，方法放在模块返回的共享类表中。已有实例的 metatable 必须指向该稳定类表，
不得在实例字段或长期闭包中缓存方法函数。完整编码约束见 [`AGENTS.md`](AGENTS.md)。

已经进入执行的方法继续运行旧字节码；热修完成后的新方法调用使用新实现。服务、对象和数据不会重建。

开发环境启动 `debug_console` 后，可以直接发送模块名：

```text
dbgcmd .agent HOTFIX llm.deepseek openai.sse
```

文件监听工具基于 POSIX 文件时间和内容校验，不需要额外的 Lua C 模块：

```bash
./tools/watch_hotfix.sh .agent 8000
```

服务地址使用 Skynet 注册名（以 `.` 开头）或数字地址（以 `:` 开头）。watcher 默认监听
`src/lualib/**/*.lua`；连续保存会合并为一次热更新。模块加载、方法集合或数据字段校验失败时，
服务保留旧实现。

## 构建与运行

构建前需安装 OpenSSL(版本3以上) 开发文件；MinGW 交叉构建还需指向 MinGW 版本的 OpenSSL。

```bash
make build
./start.sh
```

## 测试

单元测试使用 Busted，需要提前运行 `luarocks install busted`：

```bash
make check
```

`make check` 同时运行单元测试、watcher 烟雾测试和真实 Skynet 进程测试；`make test` 只运行
Busted 单元测试。

真实接口冒烟测试会读取 `.env` 并消耗少量 API 额度：

```bash
make test-live
```

静态诊断统一使用 VS Code 的 sumneko.lua 插件；`.luarc.json` 固定 Lua 5.5 并启用代码风格检查。
