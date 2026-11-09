local FakeLlm = require("tests.support.fake_llm")
local project = require("agent.prompts.project")
local templates = { base = "system", tools = "工具", permissions = "权限", permission_judge = "判断" }

describe("Agent 工具循环检查点", function()
    local scope, fake_llm, agent, model, effects, calls, request
    local instructions, loads, load_error
    before_each(function()
        effects, calls = 0, 0
        instructions, loads, load_error = { workspace = "/test" }, 0, nil
        local Executor = require("class")()
        function Executor:ctor() end
        function Executor:specs() return {} end
        function Executor:execute()
            effects = effects + 1
            return { ok = true, output = "已写入" }
        end
        fake_llm, scope = FakeLlm.new({ ["agent.agent"] = false, ["agent.executor"] = Executor,
            ["agent.sandbox"] = { platform = function() return "macos" end },
            ["agent.prompts.project"] = {
                update = project.update,
                load = function()
                    loads = loads + 1
                    if load_error then error(load_error, 0) end
                    return table.deep_copy(instructions)
                end,
            } })
        fake_llm.response_handler = function(_, input)
            calls = calls + 1
            return model(calls, input)
        end
        agent = require("agent.agent"):new({}, templates, { workspace = "/test", tools = { } })
        request = require("agent.run"):new()
        request.id = "r1"
    end)
    after_each(function() scope:restore() end)

    local function tool_response()
        local call = { type = "function_call", call_id = "call1", name = "exec_command",
            arguments = '{"cmd":"write"}' }
        return "", nil, { output = { call }, calls = { call } }
    end

    local function set_rules(text)
        instructions = { workspace = "/test", path = "/test/AGENTS.md", text = text }
    end

    local function has_text(input, text)
        for _, item in ipairs(input) do
            if type(item.content) == "string" and item.content:find(text, 1, true) then return true end
        end
        return false
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
        set_rules("失败前规则")
        model = function(index, input)
            if index == 1 then return tool_response() end
            assert.are.equal("function_call_output", input[#input].type)
            assert.is_true(has_text(input, "失败前规则"))
            assert.is_false(has_text(input, "失败后规则"))
            if index == 2 then return nil, "模型暂时失败" end
            return "最终回答"
        end
        local text, err = agent:chat("修改文件", function() end, request)
        assert.is_nil(text)
        assert.matches("模型暂时失败", assert(err))
        assert.are.equal(1, effects)
        set_rules("失败后规则")
        request.retry = true
        text, err = agent:chat("修改文件", function() end, request)
        assert.is_nil(err)
        assert.are.equal("最终回答", text)
        assert.are.equal(1, effects)
        assert.are.equal(1, #request.assistant.tool_calls)
        assert.are.equal(1, loads)
    end)

    it("无工具请求失败保留规则快照，重试后新任务才刷新", function()
        set_rules("最初规则")
        local previous = table.deep_copy(agent.messages)
        model = function(index, input)
            if index == 1 then return nil, "暂时失败" end
            assert.is_true(has_text(input, "最初规则"))
            assert.is_false(has_text(input, "下一轮规则"))
            return "完成"
        end
        assert.is_nil(agent:chat("任务", function() end, request))
        assert.are.same(previous, agent.messages)
        assert.is_nil(agent.project_instructions)
        set_rules("下一轮规则")
        request.retry = true
        assert.are.equal("完成", agent:chat("任务", function() end, request))
        assert.are.equal(1, loads)
        previous = table.deep_copy(agent.messages)
        model = function(_, input)
            assert.is_true(has_text(input, "下一轮规则"))
            for index, item in ipairs(previous) do
                local original = table.copy(item)
                original.source = nil
                assert.are.same(original, input[index])
            end
            return "刷新完成"
        end
        assert.are.equal("刷新完成", agent:chat("新任务", function() end))
        assert.are.equal(2, loads)
    end)

    it("工具循环内不刷新规则，未变化的后续任务不重复注入", function()
        set_rules("轮次规则")
        model = function(index, input)
            assert.is_true(has_text(input, "轮次规则"))
            assert.is_false(has_text(input, "磁盘新规则"))
            if index == 1 then set_rules("磁盘新规则"); return tool_response() end
            return "完成"
        end
        assert.are.equal("完成", agent:chat("任务", function() end, request))
        assert.are.equal(1, loads)
        set_rules("轮次规则")
        model = function() return "下一轮完成" end
        assert.are.equal("下一轮完成", agent:chat("新任务", function() end))
        local updates = 0
        for _, item in ipairs(agent.messages) do if item.source == "project" then updates = updates + 1 end end
        assert.are.equal(1, updates)
        assert.are.equal(2, loads)
    end)

    it("规则移除后工具取消仍提交状态，恢复旧规则追加恢复通知", function()
        set_rules("已恢复的规则")
        model = function() return "初始完成" end
        assert.are.equal("初始完成", agent:chat("初始任务", function() end))
        instructions = { workspace = "/test" }
        model = function() return tool_response() end
        local Executor = require("agent.executor")
        function Executor:execute()
            request.cancelled = true
            return { ok = false, error = "已停止" }
        end
        assert.is_nil(agent:chat("删除后的任务", function() end, request))
        assert.is_nil(agent.project_instructions.text)
        assert.is_nil(agent.turn)
        local previous = table.deep_copy(agent.messages)
        set_rules("已恢复的规则")
        model = function(_, input)
            local update = input[#previous + 1]
            assert.are.equal("user", update.role)
            assert.is_not_nil(update.content:find("已恢复的规则", 1, true))
            return "恢复完成"
        end
        assert.are.equal("恢复完成", agent:chat("恢复任务", function() end))
        assert.are.equal("已恢复的规则", agent.project_instructions.text)
    end)

    it("读取规则失败后修复重试，不复用上个失败任务", function()
        model = function() return nil, "上个任务失败" end
        assert.is_nil(agent:chat("上个任务", function() end, request))
        load_error = "规则读取失败"
        assert.is_nil(agent:chat("本次任务", function() end, request))
        assert.is_nil(agent.turn)
        load_error = nil
        set_rules("修复规则")
        request.retry = true
        model = function(_, input)
            assert.are.equal("本次任务", input[#input].content)
            assert.is_false(has_text(input, "上个任务"))
            assert.is_true(has_text(input, "修复规则"))
            return "完成"
        end
        assert.are.equal("完成", agent:chat("本次任务", function() end, request))
    end)

    it("来源由宿主覆盖，工具结果与用户输入保留各自来源", function()
        model = function(index)
            if index == 1 then
                local text, err, response = tool_response()
                response.output[1].source = "user"
                return text, err, response
            end
            return "完成", nil, { output = {
                { role = "assistant", content = "完成", source = "app" },
            }, calls = {} }
        end
        assert.are.equal("完成", agent:chat("任务", function() end, request))
        local count = #agent.messages
        assert.are.equal("user", agent.messages[count - 3].source)
        assert.are.equal("model", agent.messages[count - 2].source)
        assert.are.equal("tool", agent.messages[count - 1].source)
        assert.are.equal("model", agent.messages[count].source)
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
