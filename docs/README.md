# 文档索引

首次了解和运行项目，请从[项目首页](../README.md)开始。

## 开发与配置

- [开发指南](DEVELOPMENT.md)：环境准备、开发运行、构建、测试、服务管理与热修操作。
- [配置说明](CONFIGURATION.md)：环境文件、渠道、模型、工具权限和客户端连接。
- [编码与协作规范](../编码与协作规范.md)：编码习惯、审查和测试验收要求。
- [隐式约定](../隐式约定.md)：客户端协议与请求分发约定。
- [Agent 编码约束](../AGENTS.md)：跨平台与热更新约束。

## 架构与接口

- [客户端运行时](architecture/CLIENT_RUNTIME.md)：Actor、表现订阅、生命周期与并发规则。

- [Agent WebSocket 网关](architecture/AGENT_GATEWAY.md)：服务生命周期、会话同步、二进制协议和工具执行。
- [Agent 提示词](architecture/PROMPTS.md)：提示词、项目规则、对话历史与 Agent 接入示例。
- [共用工具运行时](../common/native/agent_runtime/README.md)：服务端使用的公共 C 核心。

## 客户端设计

- [Flutter Apple 设计规范](design/APPLE_FLUTTER_DESIGN.md)：新客户端的视觉、跨平台交互、辅助功能与审查要求。
- [macOS 组件画廊](design/COMPONENT_GALLERY.md)：共享 UI 包、组件示例与运行验证。
- [hig-mcp](https://github.com/aka-kika/hig-mcp)：Apple HIG 与语义令牌查询。
