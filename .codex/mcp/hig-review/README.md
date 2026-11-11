# 项目级 HIG Review

来源：https://github.com/nlaratta/hig-review

使用官方自包含的 `plugin/server.mjs`，固定提交
`8d14f4a9f48b2baea56603372c3e653b94e2d34f`。下载内容由 `SHA256SUMS` 校验，
保留项目和第三方许可证；不安装插件、技能、审查子代理或 npm 依赖。

在项目根目录恢复运行文件：

```sh
sh .codex/mcp/hig-review/install.sh
```

需要 Node.js 20+、curl 和 shasum。项目移动或 Node 路径变化后，同步调整
`.codex/config.toml` 的 `command`、`args`、`cwd` 与 `HIG_CACHE_DIR`。
运行文件和引用缓存保存在本目录的忽略路径中。
Node.js 仅用于这个独立的开发辅助工具，项目构建和 Lua/Dart 测试不使用 Node.js 或 pnpm。

Codex 通过项目配置的工具白名单提供 HIG 查询、检查清单及对比度计算，
Flutter 审查不调用 `review_swiftui`。服务本身不分析截图。

配套 Sosumi 使用项目配置中的远程 MCP，不需要本地安装。三个服务的使用顺序、
依据与审查要求统一见 `docs/design/APPLE_FLUTTER_DESIGN.md`。

安装或变更工具配置后重新打开项目会话；用 `codex mcp get hig-review` 和
`codex mcp get sosumi` 检查配置，再实际调用工具验证连接。目录显示和配置解析不能代替运行验证。
