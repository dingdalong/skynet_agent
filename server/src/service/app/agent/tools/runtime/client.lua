local class = require("class")
local skynet = require("skynet")
local crypt = require("skynet.crypt")
local error_code = require("error_code")
local cjson = require("cjson")

---@class agent.ClientRequest
---@field connection table
---@field result table?
---@field error string?

---@class agent.tools.runtime.Client
---@field target table
---@field owner agent.session.AgentSession
---@field app agent.App
---@field records table<string, table>
---@field runs table<string, table>
---@field closed boolean
---@field config agent.ToolConfig
local Client = class()

function Client:ctor(options)
    self.target = options.execution_target
    self.owner = options.owner
    self.app = self.owner.owner.app
    self.records = {}
    self.runs = {}
    self.closed = false
    self.config = {
        timeout_ms = options.tools.timeout_ms,
        max_processes = options.tools.max_processes,
        max_output_bytes = options.tools.max_output_bytes
    }
end

function Client:invoke(operation, args, run, call_id)
    local target, source_device = self.target, run.source_device
    local control = operation == "cancel" or operation == "status"
    local connection, authorization_id = self.app.desktop_connections:available(target,
        control and target.device_id or source_device)
    local id = crypt.hexencode(crypt.randomkey()) .. "-" .. tostring(skynet.genid())
    local pending = { connection = connection }
    local message = {
        request_id = id,
        session_id = run.session_id or "",
        run_id = run.id or "",
        tool_call_id = call_id or "",
        operation = operation,
        arguments = cjson.encode(args),
        workspace_id = target.workspace_id,
        remote = source_device ~= target.device_id,
        authorization_id = authorization_id
    }
    local requests = self.app.pending_client_requests
    requests[id] = pending
    local sent, code = pcall(self.app.publish, self.app, "AgentExecutionActionNtf", message, connection.id)
    if not sent or code ~= error_code.succ then
        requests[id] = nil
        error("桌面执行请求发送失败")
    end
    local timeout = operation == "execute" and args.name == "apply_patch"
        and args.limits and args.limits.timeout_ms or 30000
    local deadline = skynet.now() + math.ceil(timeout / 10) + 1000
    while not pending.result and not pending.error and skynet.now() < deadline do
        skynet.sleep(1)
    end
    requests[id] = nil
    assert(pending.result, pending.error or "桌面执行中断，执行结果未确认；不会自动重放")
    return pending.result
end

---同一用户的会话共享回执入口，只有发出请求时绑定的连接可以完成请求。
---@param requests table<string, agent.ClientRequest>
function Client.receive_result(requests, args, connection)
    local pending = requests[args.request_id]
    if not pending then return { ret = error_code.succ } end
    if pending.connection ~= connection then return { ret = error_code.fail } end
    if pending.result or pending.error then return { ret = error_code.succ } end
    assert(type(args.result) == "string" and #args.result <= 1048576, "执行结果过大")
    local value = cjson.decode(args.result)
    assert(type(value) == "table", "执行结果无效")
    local function normalize(item)
        for key, field in pairs(item) do
            if field == cjson.null then
                item[key] = nil
            elseif type(field) == "table" then
                normalize(field)
            end
        end
    end
    normalize(value)
    pending.result = value
    return { ret = error_code.succ }
end

---@param requests table<string, agent.ClientRequest>
function Client.fail_connection(requests, connection)
    for _, pending in pairs(requests) do
        if pending.connection == connection and not pending.result then
            pending.error = "目标桌面离线，执行结果未确认"
        end
    end
end

function Client:project(run, max_bytes)
    local result = self:invoke("project", { max_bytes = max_bytes }, run)
    assert(result.ok, result.error)
    return result.project
end

function Client:prepare(tool, action, run, record)
    local result = self:invoke("prepare", { name = tool.spec.name, args = action.args, limits = self.config },
        run, record.id)
    assert(result.ok, result.error)
    -- 执行参数沿用服务端已校验的请求；桌面提供目录、进程及受影响文件等实际信息。
    result.action.name, result.action.args = tool.spec.name, action.args
    return result.action
end

function Client:execute(tool, action, run, record)
    self.runs[run.id] = { run = run, call_id = record.id }
    run.executions[run.id] = self
    local ok, result = pcall(self.invoke, self, "execute",
        { name = tool.spec.name, args = action.args, limits = self.config },
        run, record.id)
    self.runs[run.id], run.executions[run.id] = nil, nil
    if not ok then error(result, 0) end
    if result.session_id then
        local entry = self.records[result.session_id]
        if not entry then
            entry = { run = run, call_id = record.id, records = {} }
            self.records[result.session_id] = entry
            skynet.fork(function() self:watch(result.session_id, entry) end)
        end
        entry.records[#entry.records + 1] = { run = run, record = record }
        run.executions[result.session_id] = self
        record.process_id = result.session_id
    end
    record.output, record.exit_code = result.output or "", result.exit_code
    record.changed_files, record.error = result.changed_files or {}, result.error
    record.status = result.session_id and "running" or (run.cancelled or result.cancelled) and "cancelled"
        or result.ok == false and "failed"
        or result.exit_code and result.exit_code ~= 0 and "failed" or "completed"
    return result
end

function Client:watch(id, entry)
    while not self.closed and self.records[id] == entry do
        skynet.sleep(10)
        local ok, result = pcall(self.invoke, self, "status", { session_id = id }, entry.run, entry.call_id)
        if not ok then result = { done = true, error = tostring(result) } end
        if result.done then
            self.records[id] = nil
        end
        for _, item in ipairs(entry.records) do
            local record = item.record
            record.output = result.output or record.output
            record.truncated = result.truncated
            record.exit_code, record.error = result.exit_code, result.error
            if result.done then
                record.status = (item.run.cancelled or result.cancelled) and "cancelled"
                    or result.error and "failed" or result.exit_code == 0 and "completed" or "failed"
            end
            self.owner:_on_tool_update(item.run.message_id, record)
        end
    end
end

function Client:terminate(id)
    local entry = self.records[id]
    if entry then
        pcall(self.invoke, self, "cancel", { session_id = id }, entry.run, entry.call_id)
    elseif self.runs[id] then
        local pending = self.runs[id]
        pcall(self.invoke, self, "cancel", {}, pending.run, pending.call_id)
    end
end

function Client:stop_other_device_runs()
    for id, entry in pairs(self.records) do
        if entry.run.source_device ~= self.target.device_id then self:terminate(id) end
    end
end

function Client:close()
    for id in pairs(self.records) do self:terminate(id) end
    self.closed = true
end

return Client
