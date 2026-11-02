local cjson = require("cjson")
local compat = require("openai.skynet_compat")
local FakeHttp = require("tests.support.fake_http")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local ltn12 = require("openai.ltn12")
local sse = require("openai.sse")
local url = require("openai.url")

local original_httpc

before_each(function()
    original_httpc = package.loaded["http.httpc"]
end)

after_each(function()
    package.loaded["http.httpc"] = original_httpc
end)

---@param sink openai.ltn12.Sink
---@return openai.skynet_compat.RequestOptions
local function request_options(sink)
    return {
        method = "POST",
        url = "https://llm.example.com/responses?trace=1",
        headers = {
            Authorization = "Bearer secret",
            ["Content-Length"] = "999",
            Host = "ignored.example",
        },
        source = ltn12.source.string('{"input":"hello","stream":true}'),
        sink = sink,
    }
end

---@param fake_http table
local function install_httpc(fake_http)
    package.loaded["http.httpc"] = fake_http:as_httpc()
end

describe("openai.skynet_compat", function()
    it("显式安装 lua-openai 兼容依赖", function()
        compat.install()
        luassert.are.equal(ltn12, package.loaded.ltn12)
        luassert.are.equal(url, package.loaded["socket.url"])
        luassert.are.equal(sse, package.loaded["openai.sse"])
        luassert.is_nil(package.loaded["socket.core"])
        luassert.is_nil(package.loaded["socket.http"])

        compat.install()
        luassert.are.equal(ltn12, package.loaded.ltn12)
        luassert.are.equal(url, package.loaded["socket.url"])
    end)

    describe("URL 兼容", function()
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

    describe("ltn12 兼容", function()
        it("提供请求体和响应体所需的 source/sink", function()
            local source = ltn12.source.string("body")
            luassert.are.equal("body", source())
            luassert.is_nil(source())

            local output = {}
            local sink = ltn12.sink.table(output)
            luassert.are.equal(1, sink("one"))
            luassert.are.equal(1, sink(nil))
            luassert.are.same({ "one" }, output)

            local ok, err = sink(nil, "sink failed")
            luassert.is_nil(ok)
            luassert.are.equal("sink failed", err)
        end)

        it("串联过滤器和响应 sink", function()
            local output = {}
            local filter = function(chunk, err)
                if err then
                    return nil, err
                end
                if chunk then
                    return chunk:upper()
                end
                return nil
            end
            local sink = ltn12.sink.chain(filter, ltn12.sink.table(output))

            luassert.are.equal(1, sink("text"))
            luassert.are.equal(1, sink(nil))
            luassert.are.same({ "TEXT" }, output)

            local rejected = ltn12.sink.chain(function()
                return nil, "filter failed"
            end, ltn12.sink.table({}))
            local ok, err = rejected("text")
            luassert.is_nil(ok)
            luassert.are.equal("filter failed", err)
        end)
    end)

    describe("SSE 兼容", function()
        it("使用可热更新的共享 Parser 类表", function()
            local parser = sse.new_parser(function()
            end)

            luassert.are.equal(sse.Parser, getmetatable(parser))
            luassert.are.equal(sse.Parser.feed, parser.feed)
        end)

        it("处理跨 chunk、CRLF 和连续事件", function()
            local events = {}
            local filter = sse.create_stream_filter(function(event)
                events[#events + 1] = event
            end)

            filter(": keep-alive\r\ndata: " .. cjson.encode({ type = "first", value = "你" }):sub(1, 12))
            filter(cjson.encode({ type = "first", value = "你" }):sub(13) .. "\r\n\r")
            filter("\ndata: " .. cjson.encode({ type = "second" }) .. "\r\n\r\n")
            filter(nil)

            luassert.are.same({
                { type = "first", value = "你" },
                { type = "second" },
            }, events)
        end)

        it("拼接多行 data 并在 EOF 派发未闭合事件", function()
            local events = {}
            local filter = sse.create_stream_filter(function(event)
                events[#events + 1] = event
            end)

            filter('data: {"type":"delta",\ndata: "delta":"A"}')
            filter(nil)

            luassert.are.same({
                { type = "delta", delta = "A" },
            }, events)
        end)

        it("使用 event 字段补全缺失的事件类型", function()
            local event
            local filter = sse.create_stream_filter(function(value)
                event = value
            end)

            filter("event: response.completed\ndata: {}\n\n")

            luassert.are.same({ type = "response.completed" }, event)
        end)

        it("忽略注释、未知字段和 [DONE]", function()
            local events = {}
            local filter = sse.create_stream_filter(function(event)
                events[#events + 1] = event
            end)

            filter(": comment\nid: 1\ndata: [DONE]\n\n")
            filter(nil)

            luassert.are.same({}, events)
        end)

        it("非法 JSON 会终止解析", function()
            local filter = sse.create_stream_filter(function()
            end)

            local ok, err = pcall(filter, "data: {invalid}\n\n")
            luassert.is_false(ok)
            luassert.matches("SSE data 不是合法 JSON", assert(err))
        end)

        it("读取错误会终止 SSE 过滤器", function()
            local filter = sse.create_stream_filter(function()
            end)

            local ok, err = pcall(filter, nil, "read failed")
            luassert.is_false(ok)
            luassert.matches("SSE 流读取失败", assert(err))
        end)
    end)

    describe("Skynet HTTP Provider", function()
        it("把 LuaSocket 风格请求转发给 Skynet httpc", function()
            local fake = FakeHttp.new({
                status = 200,
                headers = { ["content-type"] = "text/event-stream" },
                chunks = { "data: one\n\n", "data: two\n\n" },
            })
            install_httpc(fake)
            local output = {}
            local ok, status, headers = compat.request(request_options(ltn12.sink.table(output)))

            luassert.are.equal(1, ok)
            luassert.are.equal(200, status)
            luassert.are.equal("text/event-stream", assert(headers)["content-type"])
            luassert.are.equal("data: one\n\ndata: two\n\n", table.concat(output))

            local captured = fake.requests[1]
            luassert.are.equal("POST", captured.method)
            luassert.are.equal("https://llm.example.com", captured.target)
            luassert.are.equal("/responses?trace=1", captured.path)
            luassert.are.equal("llm.example.com", captured.headers.Host)
            luassert.is_nil(captured.headers["Content-Length"])
            luassert.are.equal('{"input":"hello","stream":true}', captured.body)
            luassert.is_true(fake.closed)
        end)

        it("sink 异常时关闭响应流", function()
            local fake = FakeHttp.new({
                chunks = { "chunk" },
            })
            install_httpc(fake)
            local ok, err = compat.request(request_options(function()
                error("sink failed")
            end))

            luassert.is_nil(ok)
            luassert.matches("sink failed", assert(err))
            luassert.is_true(fake.closed)
        end)

        it("读取流异常时关闭响应流", function()
            local fake = FakeHttp.new({
                read_error = "stream failed",
            })
            install_httpc(fake)
            local ok, err = compat.request(request_options(ltn12.sink.table({})))

            luassert.is_nil(ok)
            luassert.matches("stream failed", assert(err))
            luassert.is_true(fake.closed)
        end)

        it("sink 返回错误时关闭响应流", function()
            local fake = FakeHttp.new({
                chunks = { "chunk" },
            })
            install_httpc(fake)
            local ok, err = compat.request(request_options(function()
                return nil, "sink rejected"
            end))

            luassert.is_nil(ok)
            luassert.matches("sink rejected", assert(err))
            luassert.is_true(fake.closed)
        end)

        it("拒绝非 HTTP/HTTPS URL", function()
            local fake = FakeHttp.new({})
            install_httpc(fake)
            local options = request_options(ltn12.sink.table({}))
            options.url = "ftp://example.com/file"

            local ok, err = compat.request(options)

            luassert.is_nil(ok)
            luassert.matches("不支持的协议", assert(err))
            luassert.are.equal(0, #fake.requests)
        end)
    end)

    it("通过 lua-openai 完成流式响应请求", function()
        local fake = FakeHttp.new({
            chunks = {
                "data: " .. cjson.encode({
                    type = "response.output_text.delta",
                    delta = "你",
                }) .. "\n\n",
                "data: " .. cjson.encode({
                    type = "response.completed",
                    response = { id = "resp_1", status = "completed" },
                }) .. "\n\n",
            },
        })
        package.loaded["http.httpc"] = fake:as_httpc()
        compat.install()
        local client = require("openai").new("secret")
        client.config.http_provider = "openai.skynet_compat"
        client.api_base = "https://api.example.com/v1"
        client.default_model = "example-model"
        luassert.are.equal(compat, client:get_http())
        local events = {}

        local status = client:create_response({
            { role = "user", content = "hello" },
        }, {
            stream = true,
        }, function(event)
            events[#events + 1] = event
        end)

        luassert.are.equal(200, status)
        luassert.are.equal("你", events[1].delta)
        luassert.are.equal("response.completed", events[2].type)
        luassert.are.equal("/v1/responses", fake.requests[1].path)
        luassert.are.equal("Bearer secret", fake.requests[1].headers.Authorization)

        local payload = cjson.decode(fake.requests[1].body)
        luassert.are.equal("example-model", payload.model)
        luassert.is_true(payload.stream)
    end)
end)
