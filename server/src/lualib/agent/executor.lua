local class = require("class")
local cjson = require("cjson")
local lfs = require("lfs")
local native = require("agent_process")
local workspace = require("agent.workspace")
local Processes = require("agent.process")
local Judge = require("agent.permission.llm_judge")
local rules = require("agent.permission.rules")
local log = require("log")

---@class agent.ToolConfig
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

---@class agent.Executor
local Executor = class()

---@param options agent.Options
---@param llm_config llm.Config
function Executor:ctor(options, llm_config)
    self.root, self.config, self.permission = options.workspace, options.tools, options.permission
    self.owner, self.session_id = options.owner, options.session_id
    self.processes = Processes:new(self.root, self.config, self.owner, self.session_id)
    self.judge = Judge:new(llm_config, self.permission)
end

function Executor:set_llm(llm_config)
    self.judge:set_llm(llm_config)
end

function Executor:specs()
    local specs = {}
    for _, name in ipairs({ "exec_command", "write_stdin", "apply_patch" }) do
        specs[#specs + 1] = require("agent.tools." .. name).spec
    end
    return specs
end

function Executor:publish(run, record)
    if self.owner then self.owner:_on_tool_update(self.session_id, run.message_id, record) end
end

local function number(args, name, default, minimum, maximum)
    local value = args[name] == nil and default or args[name]
    assert(type(value) == "number" and value % 1 == 0 and value >= minimum and value <= maximum,
        "参数 " .. name .. " 必须为 " .. minimum .. " 到 " .. maximum .. " 的整数")
    return value
end

function Executor:prepare(name, args)
    assert(type(args) == "table", "工具参数必须是 JSON 对象")
    local spec
    for _, item in ipairs(self:specs()) do if item.name == name then spec = item end end
    assert(spec, "未知工具: " .. tostring(name))
    for key, value in pairs(args) do
        local property = spec.parameters.properties[key]
        assert(property, "未知工具参数: " .. tostring(key))
        assert(type(value) == (property.type == "integer" and "number" or property.type), "参数类型无效: " .. key)
        if type(value) == "string" then assert(not value:find("%z"), "参数不能包含 NUL") end
    end
    for _, key in ipairs(spec.parameters.required) do assert(args[key] ~= nil, "缺少工具参数: " .. key) end
    local mode = args.sandbox_permissions or "use_default"
    assert(mode == "use_default" or mode == "require_escalated", "执行权限模式无效")
    if mode == "require_escalated" then
        assert(type(args.justification) == "string" and args.justification:match("%S"),
            "沙盒外执行必须说明原因")
    end
    local action = { name = name, args = args, workspace = self.root, mode = mode }
    action.max_tokens = number(args, "max_output_tokens", 4000, 1, 16384)
    action.wait_ms = number(args, "yield_time_ms", name == "write_stdin" and 1000 or 10000, 1, 30000)
    if name == "exec_command" then
        assert(args.cmd:match("%S") and #args.cmd <= 65536, "命令为空或过长")
        action.cwd = workspace.resolve(args.workdir or ".", self.root)
        assert(lfs.attributes(action.cwd, "mode") == "directory", "命令工作目录不存在")
        assert(mode == "require_escalated" or workspace.inside(action.cwd, self.root), "工作目录超出当前会话")
        action.timeout = number(args, "timeout_ms", self.config.timeout_ms, 1, self.config.timeout_ms)
    elseif name == "write_stdin" then
        local process = self.processes:get(args.session_id)
        assert(#(args.chars or "") <= 65536, "终端输入过长")
        action.mode, action.cwd, action.launch_argv = process.mode, process.cwd, process.argv
    else
        local operations = require("agent.tools.apply_patch").parse(args.patch)
        action.paths = {}
        for _, operation in ipairs(operations) do
            for _, path in ipairs({ operation.path, operation.move }) do
                local target = workspace.resolve(path, self.root)
                assert(mode == "require_escalated" or workspace.inside(target, self.root),
                    "补丁目标超出会话工作目录")
                action.paths[#action.paths + 1] = target
            end
        end
    end
    return action
end

function Executor:patch(action, run, record)
    local root = assert(native.realpath("."))
    local input = native.temporary_file(cjson.encode({ patch = action.args.patch, workspace = self.root,
        mode = action.mode }))
    local code = string.format('require("agent.worker").main(%q)', input)
    local argv = { assert(native.realpath("3rd/skynet/3rd/lua/lua")), "-e", code }
    local ok, process = pcall(self.processes.start, self.processes, argv, self.root, false, action.mode,
        self.config.timeout_ms, run, record,
        { root .. "/src/lualib", root .. "/luaclib", argv[1], input },
        { "LUA_PATH=" .. root .. "/src/lualib/?.lua;" .. root .. "/src/lualib/?/init.lua",
            "LUA_CPATH=" .. root .. "/luaclib/?.so" })
    if not ok then os.remove(input); error(process, 0) end
    process.cleanup_path = input
    local result, output = nil, ""
    repeat
        result = self.processes:collect(process, 1000, 16384)
        output = output .. result.output
        assert(#output <= self.config.max_output_bytes, "补丁执行输出过长")
    until not result.session_id
    local decoded, value = pcall(cjson.decode, output)
    if decoded and type(value) == "table" then
        record.changed_files = value.changed_files
        self:publish(run, record)
        return value
    end
    return { ok = false, error = result.error or output, exit_code = result.exit_code }
end

---@param call llm.Message
---@param context table
---@param run agent.Run
---@param record agent.ToolCall
---@return table
function Executor:execute(call, context, run, record)
    local ok, result = xpcall(function()
        local args = cjson.decode(call.arguments)
        local action = self:prepare(call.name, args)
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
        if call.name == "apply_patch" then return self:patch(action, run, record) end
        local process
        if call.name == "exec_command" then
            process = self.processes:start({ "/bin/bash", "--noprofile", "--norc", "-c", args.cmd },
                action.cwd, args.tty or false, action.mode, action.timeout, run, record)
        else
            process = self.processes:get(args.session_id)
            run.processes[process.id] = self.processes
            record.process_id, record.status = process.id, "running"
        end
        local response = self.processes:collect(process, action.wait_ms, action.max_tokens, args.chars)
        record.status = response.session_id and "running" or process.record.status
        record.exit_code, record.output = response.exit_code, response.output
        return response
    end, debug.traceback)
    if not ok then
        local detail = tostring(result):match("^[^\n]+") or "未知错误"
        detail = detail:gsub("^.-:%d+:%s*", "")
        record.status, record.error = "failed", "工具执行失败: " .. detail
        log.failure("agent.executor", "execute name=" .. tostring(call.name), result)
        result = { ok = false, error = record.error }
    end
    self:publish(run, record)
    return result
end

function Executor:close()
    self.processes:close()
end

return Executor
