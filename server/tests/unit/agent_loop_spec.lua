local FakeLlm = require("tests.support.fake_llm")

describe("Agent 工具循环检查点", function()
    local scope, fake_llm, agent, model, effects, calls, request
    before_each(function()
        effects, calls = 0, 0
        local Executor = require("class")()
        function Executor:ctor() end
        function Executor:specs() return {} end
        function Executor:execute()
            effects = effects + 1
            return { ok = true, output = "已写入" }
        end
        fake_llm, scope = FakeLlm.new({ ["agent.agent"] = false, ["agent.executor"] = Executor })
        fake_llm.response_handler = function(_, input)
            calls = calls + 1
            return model(calls, input)
        end
        agent = require("agent.agent"):new({}, "system", { workspace = "/test", tools = { } })
        request = require("agent.run"):new()
        request.id = "r1"
    end)
    after_each(function() scope:restore() end)

    local function tool_response()
        local call = { type = "function_call", call_id = "call1", name = "exec_command",
            arguments = '{"cmd":"write"}' }
        return "", nil, { output = { call }, calls = { call } }
    end

    it("同一轮完成超过原上限的工具调用，模型输入只追加结果", function()
        local previous
        model = function(index, input)
            if previous then
                for position, item in ipairs(previous) do assert.are.same(item, input[position]) end
            end
            previous = table.deep_copy(input)
            if index > 40 then return "完成" end
            local call = { type = "function_call", call_id = "call" .. index,
                name = "exec_command", arguments = '{"cmd":"write"}' }
            return "", nil, { output = { call }, calls = { call } }
        end
        assert.are.equal("完成", agent:chat("逐步执行", function() end, request))
        assert.are.equal(40, effects)
        assert.are.equal(40, #request.assistant.tool_calls)
    end)

    it("请求中切换配置，当前客户端完成后下一次模型调用使用新配置", function()
        local created, seen = 0, {}
        fake_llm.response_handler = function(client)
            created = #fake_llm.new_configs
            seen[#seen + 1] = client.config.model or "old"
            if #seen == 1 then
                agent:set_llm({ model = "new" })
                return tool_response()
            end
            return "切换完成"
        end
        local Executor = require("agent.executor")
        function Executor:set_llm() end
        assert.are.equal("切换完成", agent:chat("切换任务", function() end, request))
        assert.are.same({ "old", "new" }, seen)
        assert.are.equal(2, created)
    end)

    it("工具完成后模型失败，重试从结果继续而不重复副作用", function()
        model = function(index, input)
            if index == 1 then return tool_response() end
            assert.are.equal("function_call_output", input[#input].type)
            if index == 2 then return nil, "模型暂时失败" end
            return "最终回答"
        end
        local text, err = agent:chat("修改文件", function() end, request)
        assert.is_nil(text)
        assert.matches("模型暂时失败", assert(err))
        assert.are.equal(1, effects)
        request.retry = true
        text, err = agent:chat("修改文件", function() end, request)
        assert.is_nil(err)
        assert.are.equal("最终回答", text)
        assert.are.equal(1, effects)
        assert.are.equal(1, #request.assistant.tool_calls)
    end)

    it("工具期间取消保留调用结果并停止后续模型请求", function()
        model = function(index)
            assert.are.equal(1, index)
            return tool_response()
        end
        local Executor = require("agent.executor")
        function Executor:execute()
            effects = effects + 1
            request.cancelled = true
            return { ok = false, error = "已停止" }
        end
        local text, err = agent:chat("任务", function() end, request)
        assert.is_nil(text)
        assert.are.equal("用户已取消生成", err)
        assert.are.equal(1, calls)
        assert.are.equal("function_call_output", agent.messages[#agent.messages].type)
    end)

    it("取消关闭期间请求槽被清除，仍保留两个请求的关闭结果", function()
        local main = { close_error = "主请求关闭失败" }
        local permission = {}
        function main:cancel()
            request.llm_request = nil
            request.permission_request = nil
            return false
        end
        local permission_closed = false
        function permission:cancel()
            permission_closed = true
            return true
        end
        request.llm_request, request.permission_request = main, permission
        assert.is_false(request:cancel())
        assert.is_true(permission_closed)
        assert.are.equal("主请求关闭失败", request.close_error)
    end)
end)
