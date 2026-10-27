# skynet_agent

基于 Skynet 的 Agent。

## 配置

将 `.env.example` 复制为 `.env`，填写 DeepSeek 配置：

```dotenv
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_MODEL=deepseek-flash
```

`.env` 使用 shell 兼容语法，只在本机保存，不提交真实密钥。
Skynet 运行日志写入 `logs/skynet.log`，对话内容输出到 stdout，错误写入 stderr。

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

真实接口冒烟测试会读取 `.env` 并消耗少量 API 额度：

```bash
make test-live
```

静态诊断统一使用 VS Code 的 sumneko.lua 插件；`.luarc.json` 固定 Lua 5.5 并启用代码风格检查。
