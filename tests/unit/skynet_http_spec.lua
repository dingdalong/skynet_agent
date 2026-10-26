local ltn12 = require("ltn12")
local skynet_http = require("openai.skynet_http")
local FakeHttp = require("tests.support.fake_http")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local function request_options(sink)
    return {
        method = "POST",
        url = "https://api.deepseek.com/responses?trace=1",
        headers = {
            Authorization = "Bearer secret",
            ["Content-Length"] = "999",
            Host = "ignored.example",
        },
        source = ltn12.source.string('{"input":"hello","stream":true}'),
        sink = sink,
    }
end

describe("openai.skynet_http", function()
    it("把 LuaSocket 风格请求转发给 Skynet httpc", function()
        local fake = FakeHttp.new({
            status = 200,
            headers = { ["content-type"] = "text/event-stream" },
            chunks = { "data: one\n\n", "data: two\n\n" },
        })
        local provider = skynet_http.new(fake:as_httpc())
        local output = {}
        local ok, status, headers = provider:request(request_options(ltn12.sink.table(output)))

        luassert.are.equal(1, ok)
        luassert.are.equal(200, status)
        luassert.are.equal("text/event-stream", assert(headers)["content-type"])
        luassert.are.equal("data: one\n\ndata: two\n\n", table.concat(output))

        local captured = fake.requests[1]
        luassert.are.equal("POST", captured.method)
        luassert.are.equal("https://api.deepseek.com", captured.target)
        luassert.are.equal("/responses?trace=1", captured.path)
        luassert.are.equal("api.deepseek.com", captured.headers.Host)
        luassert.are.equal("text/event-stream", captured.headers.Accept)
        luassert.is_nil(captured.headers["Content-Length"])
        luassert.are.equal('{"input":"hello","stream":true}', captured.body)
    end)

    it("sink 异常时关闭响应流", function()
        local fake = FakeHttp.new({
            chunks = { "chunk" },
        })
        local provider = skynet_http.new(fake:as_httpc())
        local ok, err = provider:request(request_options(function()
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
        local provider = skynet_http.new(fake:as_httpc())
        local ok, err = provider:request(request_options(ltn12.sink.table({})))

        luassert.is_nil(ok)
        luassert.matches("stream failed", assert(err))
        luassert.is_true(fake.closed)
    end)

    it("拒绝非 HTTP/HTTPS URL", function()
        local fake = FakeHttp.new({})
        local provider = skynet_http.new(fake:as_httpc())
        local options = request_options(ltn12.sink.table({}))
        options.url = "ftp://example.com/file"

        local ok, err = provider:request(options)
        luassert.is_nil(ok)
        luassert.matches("不支持的协议", assert(err))
        luassert.are.equal(0, #fake.requests)
    end)
end)
