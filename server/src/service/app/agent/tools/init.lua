local _, module_file = ...
local class = require("class")
local cjson = require("cjson")
local Arguments = require("agent.tools.arguments")
local lfs = require("lfs")
local Runtime = require("agent.tools.runtime")
local Judge = require("agent.permission.llm_judge")
local rules = require("agent.permission.rules")
local log = require("log")

---@class agent.ToolConfig
---@field sandbox_backend string?
---@field tcp_ports string?
---@field workspace_root string
---@field timeout_ms integer
---@field max_processes integer
---@field max_output_bytes integer

---@class agent.PermissionConfig
---@field rules_enabled boolean
---@field timeout_ticks integer
---@field deny_patterns string[]?
---@field model_id string?

---@class agent.ToolCall
---@field id string
---@field name string
---@field arguments string
---@field status string
---@field output string
---@field run_id string
---@field permission_reason string?
---@field permission_mode string?
---@field working_directory string?
---@field process_id string?
---@field exit_code integer?
---@field truncated boolean?
---@field changed_files string[]?
---@field error string?
---@field reasoning llm.ReasoningBlock[]?

---@class agent.ToolRegistry
---@field specs table[] 按模块文件名排序的模型描述
---@field by_name table<string, table> 工具名到模块表，热修后从表中取方法

---@class agent.Tools
---@field registry agent.ToolRegistry
---@field root string
---@field config agent.ToolConfig
---@field permission agent.PermissionConfig
---@field owner agent.session.AgentSession?
---@field session_id string
---@field runtime agent.ToolRuntime
---@field judge agent.PermissionJudge
local Tools = class()

---@param options agent.Options
---@param llm_config llm.Config
function Tools:ctor(options, llm_config)
    self.registry = options.tool_registry
    self.root, self.config, self.permission = options.workspace, options.tools, options.permission
    self.owner, self.session_id = options.owner, options.session_id
    self.runtime = Runtime.new(options)
    self.judge = Judge:new(llm_config, self.permission, options.prompt_templates)
end

function Tools:set_llm(llm_config)
    self.judge:set_llm(llm_config)
end

---按文件名排序，每个服务实例首次使用时构建完整注册表。
---@return agent.ToolRegistry
function Tools.discover()
    local directory = module_file:match("^(.*/)") .. "buildin"
    local files = {}
    for file in lfs.dir(directory) do
        if file:match("%.lua$") and lfs.symlinkattributes(directory .. "/" .. file, "mode") == "file" then
            files[#files + 1] = file
        end
    end
    table.sort(files)
    local registry = { specs = {}, by_name = {} }
    for _, file in ipairs(files) do
        local path = directory .. "/" .. file
        local module = "agent.tools.buildin." .. assert(file:match("^([%w_]+)%.lua$"), "工具模块文件名无效: " .. path)
        local ok, tool = pcall(require, module)
        assert(ok, "工具加载失败 " .. path .. ": " .. tostring(tool))
        assert(type(tool) == "table" and type(tool.prepare) == "function" and type(tool.execute) == "function",
            "工具缺少 prepare 或 execute 方法: " .. path)
        Arguments.check_spec(tool.spec, path)
        local name = tool.spec.name
        assert(not registry.by_name[name], "工具名重复: " .. name .. " (" .. path .. ")")
        registry.by_name[name] = tool
        registry.specs[#registry.specs + 1] = tool.spec
    end
    log.info("agent.tools", "discover", "内置工具目录=%s 工具数=%d", directory, #files)
    return registry
end

function Tools:publish(run, record)
    if self.owner then self.owner:_on_tool_update(run.message_id, record) end
end

---@param call llm.Message
---@param context table
---@param run agent.Run
---@param record agent.ToolCall
---@return table
function Tools:execute(call, context, run, record)
    local ok, result = xpcall(function()
        local args = cjson.decode(call.arguments)
        local tool = assert(self.registry.by_name[call.name], "未知工具: " .. tostring(call.name))
        local action = Arguments.prepare(tool, args, self.root, self.config)
        action = self.runtime:prepare(tool, action, run, record)
        action.arguments = call.arguments
        record.working_directory = action.cwd or self.root
        record.permission_mode = action.mode
        record.status = "judging"
        self:publish(run, record)
        local allowed, reason = rules.check(action, self.permission)
        if allowed then allowed, reason = self.judge:decide(action, context, run, record) end
        record.permission_reason = reason
        if not allowed or run.cancelled then
            record.status = run.cancelled and "cancelled" or "denied"
            log.info("agent.permission", "denied", "session=%s tool=%s reason=%s",
                self.session_id or "", call.name, reason)
            return { ok = false, error = reason }
        end
        record.permission_mode = action.mode
        return self.runtime:execute(tool, action, run, record)
    end, debug.traceback)
    if not ok then
        local detail = tostring(result):match("^[^\n]+") or "未知错误"
        detail = detail:gsub("^.-:%d+:%s*", "")
        record.status, record.error = "failed", "工具执行失败: " .. detail
        log.failure("agent.tools", "execute name=" .. tostring(call.name), result)
        result = { ok = false, error = record.error }
    end
    self:publish(run, record)
    return result
end

function Tools:close()
    self.runtime:close()
end

return Tools
