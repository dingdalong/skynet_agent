local class = require("class")
local Base = require("agent.llm.base")
local Run = require("agent.run")
local cjson = require("cjson")
local prompts = require("agent.prompts")
local project = require("agent.prompts.project")

---@class agent
---@field new fun(self: agent, llm_config: llm.Config, templates: agent.PromptTemplates, options: agent.Options?): agent
---@field llm llm.Base
---@field permission_llm_config llm.Config
---@field project_instructions agent.ProjectInstructions?
---@field messages llm.Message[]
---@field options agent.Options?
---@field tools agent.Tools?
---@field running boolean?
---@field turn agent.Turn?

---@class agent.Turn
---@field messages llm.Message[]
---@field text string[]
---@field results table<string, table>
---@field user_input string
---@field project_instructions agent.ProjectInstructions?

---@class agent.Options
---@field workspace string
---@field session_id string
---@field tool_registry agent.ToolRegistry
---@field tools agent.ToolConfig
---@field permission agent.PermissionConfig
---@field permission_llm llm.Config?
---@field owner agent.session.AgentSession?
---@field project_instructions_max_bytes integer?
---@field prompt_templates agent.PromptTemplates?
---@field execution_target table?

local Agent = class()

---@param llm_config llm.Config
---@param templates agent.PromptTemplates
---@param options agent.Options?
function Agent:ctor(llm_config, templates, options)
    assert(type(llm_config) == "table", "Agent 的 LLM 配置必须是 table")

    self.project_instructions = nil
    self.options = options and table.copy(options) or nil
    if self.options then self.options.prompt_templates = templates end
    self.permission_llm_config = table.deep_copy(options and options.permission_llm or llm_config)
    self.llm = Base:new(llm_config, "main")
    self.tools = nil
    self.running = false
    self.turn = nil
    local facts = options and {
        workspace = options.workspace,
        platform = options.execution_target and options.execution_target.platform
            or require("agent.sandbox").platform(),
        tools = options.tool_registry.specs,
        permission = options.permission,
        tool_config = options.tools
    } or nil
    self.messages = prompts.initial_messages(templates, facts)
end

---@param llm_config llm.Config
---@param permission_config llm.Config?
function Agent:set_llm(llm_config, permission_config)
    assert(type(llm_config) == "table", "Agent 的 LLM 配置必须是 table")
    self.permission_llm_config = table.deep_copy(permission_config or llm_config)
    self.llm:set_config(llm_config)
    if self.tools then self.tools:set_llm(self.permission_llm_config) end
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

    if self.options and not self.tools then
        self.tools = require("agent.tools"):new(self.options, self.permission_llm_config)
    end
    local turn = run and run.retry and self.turn or nil
    if not turn then
        -- 新任务读取失败时也不能误复用上一次失败任务的轮次。
        self.turn = nil
        local instructions = self.options and (self.options.execution_target
            and self.tools.processes:project(run, self.options.project_instructions_max_bytes or 32768)
            or project.load(self.options.workspace, self.options.project_instructions_max_bytes or 32768)) or nil
        turn = {
            messages = table.copy(self.messages),
            text = {},
            results = {},
            user_input = user_input,
            project_instructions = instructions
        }
        local update = instructions and project.update(self.project_instructions, instructions)
        if update then turn.messages[#turn.messages + 1] = update end
        turn.messages[#turn.messages + 1] = { role = "user", content = user_input, source = "user" }
    end
    self.turn = turn
    while true do
        local options = self.tools and { tools = self.options.tool_registry.specs, parallel_tool_calls = false } or nil
        local ok, text, err, response = pcall(self.llm.stream, self.llm,
            table.copy(turn.messages), on_text_delta, run, options)
        if not ok or text == nil then
            if run.cancelled then self.turn = nil end
            return nil, ok and (err or "LLM 请求失败") or "调用 LLM 失败: " .. tostring(text)
        end
        if run and run.cancelled then
            self.turn = nil
            return nil, "用户已取消生成"
        end
        response = response or { output = { { role = "assistant", content = text } }, calls = {} }
        local start = run.context_count or #self.messages
        turn.text[#turn.text + 1] = text
        for _, item in ipairs(response.output) do
            item = table.copy(item)
            item.source = "model"
            turn.messages[#turn.messages + 1] = item
        end
        if run.owner then
            -- 每次完整模型响应只追加本轮新增的上下文。
            local items = {}
            for i = start + 1, #turn.messages do items[#items + 1] = turn.messages[i] end
            run.owner:record("response", {
                run = run.id,
                items = items,
                text = text,
                calls = response.calls,
                project = turn.project_instructions
            })
            run.context_count = #turn.messages
        end
        if #response.calls == 0 then
            self.messages, self.project_instructions, self.turn = turn.messages, turn.project_instructions, nil
            return table.concat(turn.text)
        end
        assert(self.tools, "Agent 没有启用工具")
        -- 从第一条工具调用开始保留事实，失败和取消不再回滚已经发生的动作。
        self.messages, self.project_instructions = turn.messages, turn.project_instructions
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
                local record = {
                    id = call.call_id,
                    name = call.name,
                    arguments = call.arguments,
                    status = "judging",
                    output = "",
                    run_id = run.id,
                    changed_files = {}
                }
                run.assistant.tool_calls = run.assistant.tool_calls or {}
                run.assistant.tool_calls[#run.assistant.tool_calls + 1] = record
                result = self.tools:execute(call, {
                    user_input = turn.user_input,
                    history = turn.messages
                }, run, record)
                turn.results[call.call_id] = { name = call.name, arguments = call.arguments, result = result }
            end
            if run.owner and not saved then
                local records = run.assistant.tool_calls or {}
                run.owner:record("result", {
                    run = run.id,
                    id = call.call_id,
                    result = result,
                    tool = records[#records] and records[#records].id == call.call_id and records[#records] or nil
                })
            end
            turn.messages[#turn.messages + 1] = {
                type = "function_call_output",
                call_id = call.call_id,
                output = cjson.encode(result),
                source = "tool"
            }
            run.context_count = #turn.messages
        end
        if run.cancelled then
            self.turn = nil; return nil, "用户已取消生成"
        end
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
    if self.tools then
        self.tools:close(); self.tools = nil
    end
end

return Agent
