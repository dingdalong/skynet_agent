local cjson = require("cjson")
local FakeHttp = require("tests.support.fake_http")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local current_httpc
local original_compat = package.loaded["openai.skynet_compat"]
local original_httpc = package.loaded["http.httpc"]
local httpc_proxy = {
    request_stream = function(...)
        assert(current_httpc, "测试未配置 Skynet HTTP 客户端")
        return current_httpc.request_stream(...)
    end,
}

local original_skynet = package.loaded.skynet
package.loaded.skynet = { now = function() return 0 end, timeout = function() end }
package.loaded["http.httpc"] = httpc_proxy
package.loaded["openai.skynet_compat"] = nil
local llm = require("llm.base")
local compat = package.loaded["openai.skynet_compat"]
package.loaded.skynet = original_skynet
package.loaded["http.httpc"] = original_httpc
package.loaded["openai.skynet_compat"] = original_compat

local previous_compat
local previous_httpc

before_each(function()
    previous_compat = package.loaded["openai.skynet_compat"]
    previous_httpc = package.loaded["http.httpc"]
    current_httpc = nil
    package.loaded["openai.skynet_compat"] = compat
end)

after_each(function()
    current_httpc = nil
    package.loaded["openai.skynet_compat"] = previous_compat
    package.loaded["http.httpc"] = previous_httpc
end)

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

---@param fake_http table
---@return table
local function new_client(fake_http)
    current_httpc = fake_http:as_httpc()
    return llm.new({
        api_key = "secret",
        base_url = "https://api.deepseek.com/",
        model = "deepseek-flash",
    })
end

describe("llm.base", function()
    it("构造 OpenAI 兼容客户端并返回流式文本", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "你" }),
                event({ type = "response.output_text.delta", delta = "好" }),
                completed_event(),
            },
        })
        local client = new_client(fake)
        local deltas = {}

        local text, err = llm.stream_responses(client, {
            { role = "system", content = "保持简洁" },
            { role = "user", content = "介绍自己" },
        }, function(delta)
            deltas[#deltas + 1] = delta
        end)

        luassert.is_nil(err)
        luassert.are.equal("openai.skynet_compat", client.config.http_provider)
        luassert.are.equal("https://api.deepseek.com", client.api_base)
        luassert.are.equal("deepseek-flash", client.default_model)
        luassert.are.equal("你好", text)
        luassert.are.same({ "你", "好" }, deltas)

        local captured = fake.requests[1]
        luassert.are.equal("https://api.deepseek.com", captured.target)
        luassert.are.equal("/responses", captured.path)
        luassert.are.equal("Bearer secret", captured.headers.Authorization)
        local payload = cjson.decode(captured.body)
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
        local client = new_client(fake)

        local text, err = llm.stream_responses(client, {
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
        local client = new_client(incomplete)
        local text, err = llm.stream_responses(client, {
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
        client = new_client(failed)
        text, err = llm.stream_responses(client, {
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
        client = new_client(error_event)
        text, err = llm.stream_responses(client, {
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
        local client = new_client(fake)

        local text, err = llm.stream_responses(client, {
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
        local client = new_client(fake)

        local text, err = llm.stream_responses(client, {
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
        local client = new_client(fake)

        local text, err = llm.stream_responses(client, {
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

    it("LLM 配置无效时使用通用错误", function()
        local ok, err = pcall(llm.new, "invalid")
        luassert.is_false(ok)
        luassert.matches("LLM 配置必须是 table", tostring(assert(err)))

        local cases = {
            {
                config = {
                    base_url = "https://api.deepseek.com",
                    model = "deepseek-flash",
                },
                error = "LLM API Key 不能为空",
            },
            {
                config = {
                    api_key = "secret",
                    model = "deepseek-flash",
                },
                error = "LLM base_url 不能为空",
            },
            {
                config = {
                    api_key = "secret",
                    base_url = "https://api.deepseek.com",
                },
                error = "LLM model 不能为空",
            },
        }
        for _, test_case in ipairs(cases) do
            ok, err = pcall(llm.new, test_case.config)
            luassert.is_false(ok)
            luassert.matches(test_case.error, tostring(assert(err)))
        end
    end)
    it("同一 VM 的并发客户端各自持有取消上下文", function()
        local first = new_client(FakeHttp.new({}))
        local second = new_client(FakeHttp.new({}))
        local streams = {}
        for index = 1, 2 do
            streams[index] = setmetatable({ status = 200, closes = 0, sent = false,
                close = function(self) self.closes = self.closes + 1 end,
            }, { __call = function(self)
                if self.sent then return nil end
                self.sent = true
                coroutine.yield("reading")
                return event({ type = "response.output_text.delta", delta = "answer" }) .. completed_event()
            end })
        end
        local index = 0
        current_httpc = { request_stream = function()
            index = index + 1
            return streams[index]
        end }
        local a = require("llm.request"):new()
        local b = require("llm.request"):new()
        local result_a, result_b
        local input = { { role = "user", content = "test" } }
        local reader_a = coroutine.create(function()
            result_a = table.pack(llm.stream_responses(first, input, function() end, a))
        end)
        local reader_b = coroutine.create(function()
            result_b = table.pack(llm.stream_responses(second, input, function() end, b))
        end)
        luassert.are.same({ true, "reading" }, { coroutine.resume(reader_a) })
        luassert.are.same({ true, "reading" }, { coroutine.resume(reader_b) })
        luassert.are.equal(streams[1], a.stream)
        luassert.are.equal(streams[2], b.stream)
        a:cancel()
        luassert.are.equal(1, streams[1].closes)
        luassert.are.equal(0, streams[2].closes)
        luassert.is_true(coroutine.resume(reader_a))
        luassert.is_true(coroutine.resume(reader_b))
        luassert.is_nil(result_a[1])
        luassert.are.equal("用户已取消生成", result_a[2])
        luassert.are.equal("answer", result_b[1])
        luassert.is_false(b.cancelled)
        luassert.is_nil(first.current_request)
        luassert.is_nil(second.current_request)
    end)

end)
