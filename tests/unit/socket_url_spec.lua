local url = require("socket.url")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

describe("socket.url", function()
    it("解析默认 HTTP 和 HTTPS 端口", function()
        luassert.are.same({
            scheme = "https",
            host = "llm.example.com",
            port = 443,
            path = "/responses",
            query = nil,
            authority = "llm.example.com",
        }, url.parse("https://llm.example.com/responses"))

        luassert.are.same({
            scheme = "http",
            host = "127.0.0.1",
            port = 80,
            path = "/",
            query = nil,
            authority = "127.0.0.1",
        }, url.parse("http://127.0.0.1"))
    end)

    it("保留显式端口、路径和查询串", function()
        luassert.are.same({
            scheme = "http",
            host = "localhost",
            port = 8188,
            path = "/v1/responses",
            query = "q=1&lang=zh",
            authority = "localhost:8188",
        }, url.parse("http://localhost:8188/v1/responses?q=1&lang=zh"))
    end)

    it("解析带方括号的 IPv6 host", function()
        local parsed = assert(url.parse("https://[::1]:8443/responses"))
        luassert.are.equal("::1", parsed.host)
        luassert.are.equal(8443, parsed.port)
        luassert.are.equal("[::1]:8443", parsed.authority)
    end)

    it("拒绝无效 URL", function()
        local parsed, err = url.parse("ftp://example.com")
        luassert.is_nil(parsed)
        luassert.matches("不支持的协议", assert(err))

        parsed, err = url.parse("https://::1/responses")
        luassert.is_nil(parsed)
        luassert.matches("IPv6", assert(err))
    end)

    it("按 RFC 3986 规则转义", function()
        luassert.are.equal("a%20b%2F%E4%BD%A0", url.escape("a b/你"))
        luassert.are.equal("AZaz09-_.~", url.escape("AZaz09-_.~"))
    end)
end)
