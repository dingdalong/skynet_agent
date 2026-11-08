local class = require("class")
local Base = require("agent.llm.base")
local Run = require("agent.run")
local cjson = require("cjson")

---@class agent
---@field new fun(self: agent, llm_config: llm.Config, system_prompt: string, options: agent.Options?): agent
---@field llm llm.Base
---@field permission_llm_config llm.Config
---@field messages llm.Message[]
---@field options agent.Options?
---@field executor agent.Executor?
---@field running boolean?
---@field turn table?

---@class agent.Options
---@field workspace string
---@field session_id string
---@field tools agent.ToolConfig
---@field permission agent.PermissionConfig
---@field permission_llm llm.Config?
---@field owner user.User?

local Agent = class()

---@param llm_config llm.Config
---@param system_prompt string
---@param options agent.Options?
function Agent:ctor(llm_config, system_prompt, options)
    assert(type(llm_config) == "table", "Agent 的 LLM 配置必须是 table")
    assert(
        type(system_prompt) == "string" and system_prompt ~= "",
        "Agent 的 system_prompt 不能为空"
    )

    self.options = options
    self.permission_llm_config = table.deep_copy(options and options.permission_llm or llm_config)
    self.llm = Base:new(llm_config, "main")
    self.executor = nil
    self.running = false
    self.turn = nil
    if options then
        system_prompt = system_prompt .. "\n你可以使用 bash 和 apply_patch"
            .. " 在服务器会话目录完成任务。"
            .. "权限由独立模型自动判断，不需要用户审批。"
            .. "优先使用沙盒；越界确有必要时明确申请 require_escalated 并说明依据。"
            .. "修改代码优先使用 apply_patch，保留已执行工具的结果，避免重复副作用。"
    end
    self.messages = { { role = "system", content = system_prompt } }
    if options then
        self.messages[#self.messages + 1] = { role = "user",
            content = "会话环境：工作目录为 " .. options.workspace .. "。" }
    end
end

---@param llm_config llm.Config
---@param permission_config llm.Config?
function Agent:set_llm(llm_config, permission_config)
    assert(type(llm_config) == "table", "Agent 的 LLM 配置必须是 table")
    self.permission_llm_config = table.deep_copy(permission_config or llm_config)
    self.llm:set_config(llm_config)
    if self.executor then self.executor:set_llm(self.permission_llm_config) end
end

---@param user_input string
---@param on_text_delta llm.OnTextDelta
---@param run agent.Run?
---@return string|nil
---@return string|nil
function Agent:_chat(user_input, on_text_delta, run)
    assert(
        type(user_input) == "string" and user_input ~= "",
        "Agent 的用户消息不能为空"
    )
    assert(type(on_text_delta) == "function", "Agent 的文本回调必须是函数")

    local turn = run and run.retry and self.turn or nil
    if not turn then
        turn = { messages = table.copy(self.messages), text = {}, results = {} }
        turn.messages[#turn.messages + 1] = { role = "user", content = user_input }
    end
    self.turn = turn
    if self.options and not self.executor then
        self.executor = require("agent.executor"):new(self.options, self.permission_llm_config)
    end
    while true do
        local options = self.executor and { tools = self.executor:specs(), parallel_tool_calls = false } or nil
        local ok, text, err, response = pcall(self.llm.stream, self.llm,
            table.copy(turn.messages), on_text_delta, run, options)
        if not ok or text == nil then
            if not turn.checkpoint then self.turn = nil end
            return nil, ok and (err or "LLM 请求失败") or "调用 LLM 失败: " .. tostring(text)
        end
        if run and run.cancelled then
            self.turn = nil
            return nil, "用户已取消生成"
        end
        response = response or { output = { { role = "assistant", content = text } }, calls = {} }
        turn.text[#turn.text + 1] = text
        for _, item in ipairs(response.output) do turn.messages[#turn.messages + 1] = item end
        if #response.calls == 0 then
            self.messages, self.turn = turn.messages, nil
            return table.concat(turn.text)
        end
        assert(self.executor, "Agent 没有启用工具")
        -- 从第一条工具调用开始保留事实，失败和取消不再回滚已经发生的动作。
        turn.checkpoint, self.messages = true, turn.messages
        for _, call in ipairs(response.calls) do
            local saved = turn.results[call.call_id]
            local result
            if saved then
                assert(saved.name == call.name and saved.arguments == call.arguments,
                    "工具调用 ID 被不同参数复用")
                result = saved.result
            elseif run.cancelled then
                result = { ok = false, error = "任务已停止" }
            else
                local record = { id = call.call_id, name = call.name, arguments = call.arguments,
                    status = "judging", output = "", run_id = run.id, changed_files = {} }
                run.assistant.tool_calls = run.assistant.tool_calls or {}
                run.assistant.tool_calls[#run.assistant.tool_calls + 1] = record
                result = self.executor:execute(call, { user_input = user_input,
                    history = turn.messages }, run, record)
                turn.results[call.call_id] = { name = call.name, arguments = call.arguments, result = result }
            end
            turn.messages[#turn.messages + 1] = { type = "function_call_output", call_id = call.call_id,
                output = cjson.encode(result) }
        end
        if run.cancelled then self.turn = nil; return nil, "用户已取消生成" end
    end
end

---@param user_input string
---@param on_text_delta llm.OnTextDelta
---@param run agent.Run?
---@return string|nil, string|nil
function Agent:chat(user_input, on_text_delta, run)
    assert(type(user_input) == "string" and user_input ~= "", "Agent 的用户消息不能为空")
    assert(type(on_text_delta) == "function", "Agent 的文本回调必须是函数")
    assert(not self.running, "Agent 已有任务正在执行")
    run = run or Run:new()
    self.running = true
    local ok, text, err = xpcall(function() return self:_chat(user_input, on_text_delta, run) end, debug.traceback)
    self.running = false
    if not ok then return nil, "Agent 执行失败: " .. tostring(text) end
    return text, err
end

function Agent:close()
    if self.executor then self.executor:close() end
end

return Agent
