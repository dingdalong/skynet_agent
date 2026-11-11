# 项目级 hig-mcp

来源：https://github.com/aka-kika/hig-mcp

按官方 Python 包和 stdio 入口安装，使用项目独立环境，版本固定为 `0.3.0`。
Codex 入口配置位于 `../../config.toml`，未向用户级配置添加启用项。

在项目根目录重新安装：

```sh
uv venv --python python3 .codex/mcp/hig/.venv
uv pip install --python .codex/mcp/hig/.venv/bin/python -r .codex/mcp/hig/requirements.txt
```

需要 Python 3.10 或更高版本。移动项目后需同步修改 `.codex/config.toml` 中
`command`、`cwd`、`HIG_MCP_CALL_LOG` 的绝对路径。

调用日志保存在 `state/calls.jsonl`，环境、日志与验证产物均不进入版本控制。
新增 MCP 后重新打开当前项目会话，以加载工具目录；`codex mcp get hig` 可核对配置。
