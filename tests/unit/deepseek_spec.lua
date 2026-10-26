local cjson = require("cjson")
local deepseek = require("openai.deepseek")
local FakeHttp = require("tests.support.fake_http")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local function event(value)
    return "data: " .. cjson.encode(value) .. "\n\n"
end

local function completed_event()
    return event({
        type = "response.completed",
        response = {
            id = "resp_1",
            status = "completed",
            output = {},
        },
    })
end

describe("openai.deepseek", function()
    it("发送 Responses 请求并返回流式文本与完成响应", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "你" }),
                event({ type = "response.output_text.delta", delta = "好" }),
                completed_event(),
            },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com/",
            http_provider = fake:as_provider(),
        })

        local deltas = {}
        local final, err = client:stream_response("介绍自己", {
            instructions = "保持简洁",
        }, function(delta)
            deltas[#deltas + 1] = delta
        end)

        if not final then
            error(err)
        end
        luassert.is_nil(err)
        luassert.are.equal("resp_1", final.id)
        luassert.are.same({ "你", "好" }, deltas)

        local captured = fake.request_options
        luassert.are.equal("https://api.deepseek.com/responses", captured.url)
        luassert.are.equal("Bearer secret", captured.headers.Authorization)
        local payload = cjson.decode(fake.request_body)
        luassert.are.equal("deepseek-flash", payload.model)
        luassert.are.equal("保持简洁", payload.instructions)
        luassert.are.equal("介绍自己", payload.input)
        luassert.is_true(payload.stream)
    end)

    it("支持一次性 Responses 请求", function()
        local fake = FakeHttp.new({
            chunks = { cjson.encode({ id = "resp_2", status = "completed" }) },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = fake:as_provider(),
            model = "deepseek-v4-pro",
        })

        local status, response = client:create_response("hello")
        luassert.are.equal(200, status)
        luassert.are.equal("resp_2", response.id)

        local payload = cjson.decode(fake.request_body)
        luassert.are.equal("deepseek-v4-pro", payload.model)
        luassert.is_nil(payload.stream)
    end)

    it("保留非 2xx 状态和响应体", function()
        local fake = FakeHttp.new({
            status = 401,
            chunks = {
                cjson.encode({ error = { message = "invalid api key" } }),
            },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = fake:as_provider(),
        })

        local final, err, raw = client:stream_response("hello")
        luassert.is_nil(final)
        local error_message = assert(err)
        luassert.matches("HTTP 401", error_message)
        luassert.matches("invalid api key", error_message)
        luassert.are.equal(401, raw.status)
        luassert.is_not_matches("secret", error_message)
    end)

    it("把 incomplete 和 failed 视为失败", function()
        local incomplete = FakeHttp.new({
            chunks = {
                event({
                    type = "response.incomplete",
                    response = {
                        status = "incomplete",
                        incomplete_details = { reason = "max_output_tokens" },
                    },
                }),
            },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = incomplete:as_provider(),
        })
        local final, err = client:stream_response("hello")
        luassert.is_nil(final)
        luassert.matches("max_output_tokens", assert(err))

        local failed = FakeHttp.new({
            chunks = {
                event({
                    type = "response.failed",
                    response = {
                        status = "failed",
                        error = { message = "upstream failed" },
                    },
                }),
            },
        })
        client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = failed:as_provider(),
        })
        final, err = client:stream_response("hello")
        luassert.is_nil(final)
        luassert.matches("upstream failed", assert(err))
    end)

    it("缺少 response.completed 时失败", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "partial" }),
            },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = fake:as_provider(),
        })

        local final, err = client:stream_response("hello")
        luassert.is_nil(final)
        luassert.matches("response.completed", assert(err))
    end)

    it("非法 SSE JSON 会作为请求失败返回", function()
        local fake = FakeHttp.new({
            chunks = { "data: {invalid}\n\n" },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = fake:as_provider(),
        })

        local final, err = client:stream_response("hello")
        luassert.is_nil(final)
        luassert.matches("SSE data 不是合法 JSON", assert(err))
    end)

    it("回调异常不会泄漏 API Key", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "partial" }),
            },
        })
        local client = deepseek.new("secret", {
            base_url = "https://api.deepseek.com",
            http_provider = fake:as_provider(),
        })

        local final, err = client:stream_response("hello", nil, function()
            error("consumer failed")
        end)
        luassert.is_nil(final)
        local error_message = assert(err)
        luassert.matches("consumer failed", error_message)
        luassert.is_not_matches("secret", error_message)
    end)
end)
