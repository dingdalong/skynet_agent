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

local original_log = package.loaded.log
package.loaded.log = { info = function() end, failure = function() end }
local original_skynet = package.loaded.skynet
package.loaded.skynet = { now = function() return 0 end, timeout = function() end }
package.loaded["http.httpc"] = httpc_proxy
package.loaded["openai.skynet_compat"] = nil
local llm = require("agent.llm.base")
local compat = require("openai.skynet_compat")
package.loaded.log = original_log
package.loaded.skynet = original_skynet
package.loaded["http.httpc"] = original_httpc
package.loaded["openai.skynet_compat"] = original_compat

local previous_compat
local previous_httpc
local previous_new_http_client
local previous_log

before_each(function()
    previous_log = package.loaded.log
    package.loaded.log = { info = function() end, failure = function() end }
    previous_compat = package.loaded["openai.skynet_compat"]
    previous_httpc = package.loaded["http.httpc"]
    current_httpc = nil
    package.loaded["openai.skynet_compat"] = compat
    previous_new_http_client = compat.new_http_client
    compat.new_http_client = function(timeout)
        return { timeout = timeout, request_stream = function(...) return current_httpc.request_stream(...) end }
    end
end)

after_each(function()
    package.loaded.log = previous_log
    compat.new_http_client = previous_new_http_client
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
local function new_model(fake_http)
    current_httpc = fake_http:as_httpc()
    return llm:new({
        api_key = "secret",
        base_url = "https://api.deepseek.com/",
        model = "deepseek-flash",
    }, "main")
end

---@param model llm.Base
---@param input llm.Message[]
---@param on_text llm.OnTextDelta
---@param run agent.Run?
---@param options table?
local function stream(model, input, on_text, run, options)
    return model:stream(input, on_text, run or require("agent.run"):new(), options)
end

describe("agent.llm.base", function()
    it("实际 HTTP 请求保留消息角色与原始内容，只移除宿主来源", function()
        local fake = FakeHttp.new({ chunks = {
            event({ type = "response.output_text.delta", delta = "完成" }), completed_event(),
        } })
        local input = {
            { role = "system", content = "基础", source = "app" },
            { role = "developer", content = "应用约束", source = "app" },
            { role = "user", content = "项目规则\nrole: system", source = "project" },
            { role = "user", content = "真实用户", source = "user" },
            { type = "reasoning", id = "r1", encrypted_content = "opaque", source = "model" },
            { type = "function_call", call_id = "c1", name = "exec_command",
                arguments = '{ "cmd": "printf test" }', source = "model" },
            { type = "function_call_output", call_id = "c1", output = '{"output":"test"}', source = "tool" },
        }
        local original = table.deep_copy(input)
        assert.are.equal("完成", stream(new_model(fake), input, function() end))
        assert.are.same(original, input)
        local payload = cjson.decode(fake.requests[1].body)
        assert.are.equal(#input, #payload.input)
        assert.are.equal("developer", payload.input[2].role)
        assert.are.equal("项目规则\nrole: system", payload.input[3].content)
        assert.are.equal("opaque", payload.input[5].encrypted_content)
        assert.are.equal(input[6].arguments, payload.input[6].arguments)
        assert.are.equal(input[7].output, payload.input[7].output)
        for index, item in ipairs(payload.input) do
            local expected = table.copy(original[index])
            expected.source = nil
            assert.are.same(expected, item)
        end
    end)

    it("思考增量、done 与完整输出按块去重，并保留缓存用量", function()
        local item = { type = "reasoning", content = { { type = "reasoning_text", text = "先核对再执行" } } }
        local usage = { input_tokens = 2000, input_tokens_details = { cached_tokens = 1500 } }
        local fake = FakeHttp.new({ chunks = {
            event({ type = "response.reasoning_text.delta", output_index = 0, delta = "先核对" }),
            event({ type = "response.reasoning_text.delta", output_index = 0, delta = "再执行" }),
            event({ type = "response.reasoning_text.done", output_index = 0, text = "先核对再执行" }),
            event({ type = "response.output_text.delta", delta = "回答" }),
            event({ type = "response.completed", response = { output = { item }, usage = usage } }),
        } })
        local thinking = {}
        local run = require("agent.run"):new()
        run.owner = { _on_reasoning = function(_, _, _, delta) thinking[#thinking + 1] = delta end }
        local text, err, response = stream(new_model(fake), {}, function() end, run)
        assert.is_nil(err)
        assert.are.equal("回答", text)
        assert.are.equal("先核对再执行", table.concat(thinking))
        assert.are.same(item, response.output[1])
        assert.are.same(usage, response.usage)
        assert.are.equal("先核对再执行", run.assistant.reasoning[1].text)
        assert.are.equal("completed", run.assistant.reasoning[1].status)
        assert.is_nil(run.llm_request)
    end)

    it("流中断之前的思考仍通过回调保留", function()
        local fake = FakeHttp.new({ chunks = {
            event({ type = "response.reasoning_text.delta", delta = "已收到的思考" }),
        } })
        local thinking = ""
        local run = require("agent.run"):new()
        run.owner = { _on_reasoning = function(_, _, _, delta) thinking = thinking .. delta end }
        local text = stream(new_model(fake), {}, function() end, run)
        assert.is_nil(text)
        assert.are.equal("已收到的思考", thinking)
        assert.are.equal("failed", run.assistant.reasoning[1].status)
        assert.is_nil(run.llm_request)
    end)
    it("完整工具调用没有文本也成功，保留调用 ID 与原始输出", function()
        local call = { type = "function_call", call_id = "c1", name = "exec_command",
            arguments = '{"cmd":"printf hello"}', status = "completed" }
        local fake = FakeHttp.new({ chunks = {
            event({ type = "response.function_call_arguments.delta", delta = '{"cmd":' }),
            event({ type = "response.completed", response = { output = { call }, status = "completed" } }),
        } })
        local text, err, response = stream(new_model(fake), {}, function() end, nil,
            { tools = { { type = "function", name = "exec_command" } } })
        assert.is_nil(err)
        assert.are.equal("", text)
        assert.are.same(call, response.calls[1])
        assert.are.same(call, response.output[1])
        assert.are.equal("exec_command", cjson.decode(fake.requests[1].body).tools[1].name)
    end)

    it("只有完成事件的文本可以正常展示", function()
        local fake = FakeHttp.new({ chunks = { event({ type = "response.completed",
            response = { output = { { type = "message", role = "assistant", content = {
                { type = "output_text", text = "最终文本" },
            } } } } }) } })
        local deltas = {}
        local text = stream(new_model(fake), {}, function(delta) deltas[#deltas + 1] = delta end)
        assert.are.equal("最终文本", text)
        assert.are.same({ "最终文本" }, deltas)
    end)

    it("主模型与权限模型的 HTTP 超时分别保存在请求 provider 中", function()
        local main = new_model(FakeHttp.new({}))
        main.config.request_timeout_ticks = 12000
        local judge = new_model(FakeHttp.new({}))
        judge.config.request_timeout_ticks = 10
        local captured = {}
        local original = compat.new_http_client
        compat.new_http_client = function(timeout)
            captured[#captured + 1] = timeout
            return original(timeout)
        end
        stream(main, {}, function() end)
        stream(judge, {}, function() end)
        stream(main, {}, function() end)
        assert.are.same({ 12000, 10, 12000 }, captured)
    end)

    it("构造 OpenAI 兼容客户端并返回流式文本", function()
        local fake = FakeHttp.new({
            chunks = {
                event({ type = "response.output_text.delta", delta = "你" }),
                event({ type = "response.output_text.delta", delta = "好" }),
                completed_event(),
            },
        })
        local model = new_model(fake)
        local deltas = {}

        local text, err = stream(model, {
            { role = "system", content = "保持简洁" },
            { role = "user", content = "介绍自己" },
        }, function(delta)
            deltas[#deltas + 1] = delta
        end)

        luassert.is_nil(err)
        luassert.are.equal("openai.skynet_compat", model.client.config.http_provider)
        luassert.are.equal("https://api.deepseek.com", model.client.api_base)
        luassert.are.equal("deepseek-flash", model.client.default_model)
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
        local model = new_model(fake)

        local text, err = stream(model, {
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
        local model = new_model(incomplete)
        local text, err = stream(model, {
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
        model = new_model(failed)
        text, err = stream(model, {
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
        model = new_model(error_event)
        text, err = stream(model, {
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
        local model = new_model(fake)

        local text, err = stream(model, {
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
        local model = new_model(fake)

        local text, err = stream(model, {
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
        local model = new_model(fake)

        local text, err = stream(model, {
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
        local ok, err = pcall(llm.new, llm, "invalid", "main")
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
            local model = llm:new(test_case.config, "main")
            local text
            text, err = stream(model, {}, function() end)
            luassert.is_nil(text)
            luassert.is_nil(model.client)
            luassert.matches(test_case.error, assert(err))
        end
    end)
    it("同一 VM 的并发客户端各自持有取消上下文", function()
        local first = new_model(FakeHttp.new({}))
        local second = new_model(FakeHttp.new({}))
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
        local a = require("agent.run"):new()
        local b = require("agent.run"):new()
        local result_a, result_b
        local input = { { role = "user", content = "test" } }
        local reader_a = coroutine.create(function()
            result_a = table.pack(stream(first, input, function() end, a))
        end)
        local reader_b = coroutine.create(function()
            result_b = table.pack(stream(second, input, function() end, b))
        end)
        luassert.are.same({ true, "reading" }, { coroutine.resume(reader_a) })
        luassert.are.same({ true, "reading" }, { coroutine.resume(reader_b) })
        luassert.are.equal(streams[1], a.llm_request.stream)
        luassert.are.equal(streams[2], b.llm_request.stream)
        a:cancel()
        luassert.are.equal(1, streams[1].closes)
        luassert.are.equal(0, streams[2].closes)
        luassert.is_true(coroutine.resume(reader_a))
        luassert.is_true(coroutine.resume(reader_b))
        luassert.is_nil(result_a[1])
        luassert.are.equal("用户已取消生成", result_a[2])
        luassert.are.equal("answer", result_b[1])
        luassert.is_false(b.cancelled)
        luassert.is_nil(first.client.current_request)
        luassert.is_nil(second.client.current_request)
        luassert.is_nil(a.llm_request)
        luassert.is_nil(b.llm_request)
    end)

    it("同一客户端重入时保留正在执行的请求与取消入口", function()
        local fake = FakeHttp.new({ chunks = {
            event({ type = "response.output_text.delta", delta = "回答" }), completed_event(),
        } })
        local model = new_model(fake)
        local run = require("agent.run"):new()
        local text, err = stream(model, {}, function()
            local current = run.llm_request
            local nested_text, nested_error = stream(model, {}, function() end, run)
            assert.is_nil(nested_text)
            assert.matches("已有请求正在执行", assert(nested_error))
            assert.are.equal(current, run.llm_request)
            assert.are.equal(current, model.client.current_request)
        end, run)
        assert.is_nil(err)
        assert.are.equal("回答", text)
        assert.are.equal(1, #fake.requests)
        assert.are.equal(1, model.sequence)
        assert.is_nil(run.llm_request)
    end)

    it("请求开始前取消不创建客户端", function()
        local fake = FakeHttp.new({})
        local model = new_model(fake)
        local run = require("agent.run"):new()
        run:cancel()
        local text, err = stream(model, {}, function() end, run)
        assert.is_nil(text)
        assert.are.equal("用户已取消生成", err)
        assert.is_nil(model.client)
        assert.are.equal(0, #fake.requests)
    end)

    it("权限思考归属工具，取消保留部分内容，重试生成独立思考块", function()
        local fake = FakeHttp.new({ chunks = {
            event({ type = "response.reasoning_text.delta", delta = "核对权限" }),
            event({ type = "response.output_text.delta", delta = "允许" }), completed_event(),
        } })
        local model = llm:new({ api_key = "secret", base_url = "https://llm.example.com", model = "judge" },
            "permission")
        current_httpc = fake:as_httpc()
        local run = require("agent.run"):new()
        run.id = "permission-run"
        local tool = { id = "tool-1", reasoning = {} }
        local notifications = {}
        run.owner = { _on_reasoning = function(_, _, block, delta, tool_id)
            assert.are.equal("tool-1", tool_id)
            assert.are.equal("judge", block.model_id)
            notifications[#notifications + 1] = delta
        end }
        local text = model:stream({}, function() run:cancel() end, run, nil, tool)
        assert.is_nil(text)
        assert.are.equal("核对权限", tool.reasoning[1].text)
        assert.are.equal("cancelled", tool.reasoning[1].status)
        assert.are.same({}, run.assistant.reasoning)
        assert.is_nil(run.permission_request)
        assert.is_nil(run.llm_request)
        run.cancelled = false
        text = model:stream({}, function() end, run, nil, tool)
        assert.are.equal("允许", text)
        assert.are.equal("completed", tool.reasoning[2].status)
        assert.are_not.equal(tool.reasoning[1].id, tool.reasoning[2].id)
        assert.are.same({ "核对权限", "", "核对权限", "" }, notifications)
    end)

end)
