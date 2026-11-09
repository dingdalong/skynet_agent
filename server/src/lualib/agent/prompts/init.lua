local Prompts = {}

---@class agent.PromptTemplates
---@field base string
---@field tools string
---@field permissions string
---@field permission_judge string

---@class agent.PromptFacts
---@field workspace string
---@field platform string
---@field tools table[]
---@field permission agent.PermissionConfig?
---@field tool_config agent.ToolConfig?

---@param templates agent.PromptTemplates
---@param name string
---@return string
local function template(templates, name)
    assert(type(templates) == "table", "提示词模板必须是 table")
    local text = templates[name]
    assert(type(text) == "string" and text:match("%S"), "提示词模板不能为空: " .. name)
    return text
end

---@return agent.PromptTemplates
function Prompts.load_templates()
    local templates = {}
    for _, name in ipairs({ "base", "tools", "permissions", "permission_judge" }) do
        local path = "src/lualib/agent/prompts/templates/" .. name .. ".md"
        local file, open_error = io.open(path, "rb")
        assert(file, "无法读取提示词模板 " .. path .. ": " .. tostring(open_error))
        local text, read_error = file:read("a")
        local closed, close_error = file:close()
        assert(text and not read_error, "无法读取提示词模板 " .. path .. ": " .. tostring(read_error))
        assert(closed, "无法关闭提示词模板 " .. path .. ": " .. tostring(close_error))
        assert(utf8.len(text) and not text:find("%z"), "提示词模板必须是 UTF-8 文本: " .. path)
        assert(text:match("%S"), "提示词模板不能为空: " .. path)
        templates[name] = text
    end
    return templates
end

---@param templates agent.PromptTemplates
---@param facts agent.PromptFacts?
---@return llm.Message[]
function Prompts.initial_messages(templates, facts)
    local messages = { { role = "system", source = "app", content = template(templates, "base") } }
    if not facts then return messages end

    local names = {}
    for _, spec in ipairs(facts.tools) do names[#names + 1] = spec.name end
    if #names > 0 then
        messages[#messages + 1] = { role = "developer", source = "app", content = template(templates, "tools") }
        messages[#messages + 1] = {
            role = "developer", source = "app", content = template(templates, "permissions"),
        }
    end
    local environment = { "<environment_context>", "工作目录: " .. facts.workspace,
        "操作系统: " .. facts.platform, "可用工具: " .. (#names > 0 and table.concat(names, ", ") or "无") }
    if #names > 0 then
        environment[#environment + 1] = "Shell: /bin/bash --noprofile --norc"
        environment[#environment + 1] = "默认执行范围: 当前会话沙盒；默认允许联网"
        local config = facts.tool_config or {}
        if config.timeout_ms then
            environment[#environment + 1] = "单个命令最长执行毫秒: " .. config.timeout_ms
        end
        if config.max_processes then
            environment[#environment + 1] = "会话进程数量上限: " .. config.max_processes
        end
        if config.max_output_bytes then
            environment[#environment + 1] = "进程输出字节上限: " .. config.max_output_bytes
        end
        local permission = facts.permission or {}
        if permission.rules_enabled ~= nil then
            environment[#environment + 1] = "拒绝规则: " .. (permission.rules_enabled and "启用" or "关闭")
        end
    end
    environment[#environment + 1] = "</environment_context>"
    messages[#messages + 1] = { role = "developer", source = "app", content = table.concat(environment, "\n") }
    return messages
end

---@param templates agent.PromptTemplates
---@param evidence string
---@return llm.Message[]
function Prompts.permission_messages(templates, evidence)
    assert(type(evidence) == "string", "权限判断证据必须是字符串")
    return {
        { role = "system", source = "app", content = template(templates, "permission_judge") },
        { role = "user", source = "app", content = evidence },
    }
end

return Prompts
