local class = require("class")
local Base = require("agent.llm.base")
local cjson = require("cjson")
local log = require("log")
local Prompts = require("agent.prompts")
---@class agent.PermissionJudge
---@field config agent.PermissionConfig
---@field llm llm.Base
---@field templates agent.PromptTemplates
local Judge = class()

---@param llm_config llm.Config
---@param config agent.PermissionConfig
---@param templates agent.PromptTemplates
function Judge:ctor(llm_config, config, templates)
    self.config = table.deep_copy(config)
    self.templates = templates
    self.llm = Base:new(self:llm_config(llm_config), "permission")
end

---@param config llm.Config
function Judge:llm_config(config)
    local resolved = table.deep_copy(config)
    resolved.request_timeout_ticks = self.config.timeout_ticks
    return resolved
end

function Judge:set_llm(config)
    self.llm:set_config(self:llm_config(config))
end

local function append_field(parts, name, value)
    if value ~= nil then parts[#parts + 1] = name .. ":\n" .. tostring(value) .. "\n" end
end

local function append_content(parts, name, content)
    if type(content) == "string" then
        append_field(parts, name, content)
    elseif type(content) == "table" then
        for _, part in ipairs(content) do
            append_field(parts, name, part.type)
            append_field(parts, "text", part.text)
            append_field(parts, "refusal", part.refusal)
        end
    end
end

local function permission_input(action, context)
    local parts = { "聊天历史\n" }
    for _, item in ipairs(context.history or {}) do
        parts[#parts + 1] = "\n消息\n"
        append_field(parts, "source", item.source)
        append_field(parts, "role", item.role)
        append_field(parts, "type", item.type)
        append_content(parts, "content", item.content)
        append_content(parts, "summary", item.summary)
        append_field(parts, "call_id", item.call_id)
        append_field(parts, "name", item.name)
        append_field(parts, "arguments", item.arguments)
        append_field(parts, "output", item.output)
    end
    append_field(parts, "当前用户目标", context.user_input)
    parts[#parts + 1] = "\n本次动作\n"
    append_field(parts, "工具", action.name)
    append_field(parts, "工作区", action.workspace)
    append_field(parts, "实际工作目录", action.cwd)
    append_field(parts, "权限模式", action.mode)
    for _, path in ipairs(action.paths or {}) do append_field(parts, "目标路径", path) end
    for _, argument in ipairs(action.launch_argv or {}) do append_field(parts, "已有进程参数", argument) end
    append_field(parts, "执行超时毫秒", action.timeout)
    append_field(parts, "等待毫秒", action.wait_ms)
    append_field(parts, "输出 token 上限", action.max_tokens)
    -- 原始参数已经过执行器校验，直接保留模型给出的文本，不再重新编码。
    append_field(parts, "原始参数", action.arguments)
    return table.concat(parts)
end

---@param action table
---@param context table
---@param run agent.Run
---@return boolean
---@return string
function Judge:decide(action, context, run, record)
    if run.cancelled then return false, "任务已停止" end
    local input = permission_input(action, context)
    local ok, result, err = pcall(function()
        return self.llm:stream(Prompts.permission_messages(self.templates, input),
            function() end, run, nil, record)
    end)
    if run.cancelled then return false, "任务已停止" end
    if not ok or not result then
        log.failure("agent.permission", "decide", ok and err or result)
        return false, "权限模型请求失败，已阻止执行"
    end
    local decoded_ok, decision = pcall(cjson.decode, result)
    if not decoded_ok or type(decision) ~= "table" or type(decision.reason) ~= "string"
        or decision.reason == "" or #decision.reason > 4096
        or (decision.decision ~= "allow" and decision.decision ~= "deny") then
        log.failure("agent.permission", "decide", "权限模型响应格式无效")
        return false, "权限模型响应无效，已阻止执行"
    end
    return decision.decision == "allow", decision.reason
end

return Judge
