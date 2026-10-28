local cjson = require("cjson")
local deepseek = require("llm.deepseek")
local FakeHttp = require("tests.support.fake_http")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

---@param value table
---@return string
local function event(value)
    return "data: " .. cjson.encode(value) .. "\n\n"
end

---@return string
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

---@param http_provider table
---@return llm.Provider
local function new_provider(http_provider)
    return deepseek.new({
        api_key = "secret",
        base_url = "https://api.deepseek.com/",
        model = "deepseek-flash",
        http_provider = http_provider,
    })
end

describe("llm.deepseek", function()
    it("通过 LLM Provider 接口返回流式文本", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "你" }),
                event({ type = "response.output_text.delta", delta = "好" }),
                completed_event(),
            },
        })
        local provider = new_provider(fake:as_provider())
        local deltas = {}

        local text, err = provider:stream_response({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "介绍自己" },
        }, function(delta)
            deltas[#deltas + 1] = delta
        end)

        luassert.is_nil(err)
        luassert.are.equal("deepseek", provider.name)
        luassert.are.equal("你好", text)
        luassert.are.same({ "你", "好" }, deltas)

        local captured = fake.request_options
        luassert.are.equal("https://api.deepseek.com/responses", captured.url)
        luassert.are.equal("Bearer secret", captured.headers.Authorization)
        local payload = cjson.decode(fake.request_body)
        luassert.are.equal("deepseek-flash", payload.model)
        luassert.is_true(payload.stream)
        luassert.is_nil(payload.previous_response_id)
    end)

    it("非 2xx 响应使用通用 LLM 错误且不泄漏 API Key", function()
        local fake = FakeHttp.new({
            status = 401,
            chunks = {
                cjson.encode({ error = { message = "invalid api key" } }),
            },
        })
        local provider = new_provider(fake:as_provider())

        local text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
        end)

        luassert.is_nil(text)
        local error_message = assert(err)
        luassert.matches("LLM HTTP 401", error_message)
        luassert.matches("invalid api key", error_message)
        luassert.is_not_matches("secret", error_message)
    end)

    it("incomplete 和 failed 终态使用通用 LLM 错误", function()
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
        local provider = new_provider(incomplete:as_provider())
        local text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
        end)
        luassert.is_nil(text)
        luassert.matches("LLM 响应未完成", assert(err))
        luassert.matches("max_output_tokens", tostring(assert(err)))

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
        provider = new_provider(failed:as_provider())
        text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
        end)
        luassert.is_nil(text)
        luassert.matches("LLM 响应失败", assert(err))
        luassert.matches("upstream failed", tostring(assert(err)))

        local error_event = FakeHttp.new({
            chunks = {
                event({
                    type = "error",
                    message = "provider error",
                }),
            },
        })
        provider = new_provider(error_event:as_provider())
        text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
        end)
        luassert.is_nil(text)
        luassert.matches("LLM 返回错误事件", assert(err))
        luassert.matches("provider error", tostring(assert(err)))
    end)

    it("完成事件没有文本时失败", function()
        local fake = FakeHttp.new({
            chunks = { completed_event() },
        })
        local provider = new_provider(fake:as_provider())

        local text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
        end)

        luassert.is_nil(text)
        luassert.matches("流式响应中没有文本内容", assert(err))
    end)

    it("缺少 response.completed 时失败", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "partial" }),
            },
        })
        local provider = new_provider(fake:as_provider())

        local text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
        end)

        luassert.is_nil(text)
        luassert.matches("response.completed", assert(err))
    end)

    it("回调异常使用通用 LLM 请求错误", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "partial" }),
            },
        })
        local provider = new_provider(fake:as_provider())

        local text, err = provider:stream_response({
            { role = "user", content = "hello" },
        }, function()
            error("consumer failed")
        end)

        luassert.is_nil(text)
        local error_message = assert(err)
        luassert.matches("LLM 请求失败", error_message)
        luassert.matches("consumer failed", error_message)
        luassert.is_not_matches("secret", error_message)
    end)

    it("DeepSeek 配置缺少必填字段时拒绝创建", function()
        ---@diagnostic disable-next-line: missing-fields
        local ok, err = pcall(deepseek.new, {
            api_key = "secret",
            base_url = "https://api.deepseek.com",
        })

        luassert.is_false(ok)
        luassert.matches("DeepSeek model 不能为空", tostring(assert(err)))
    end)
end)
