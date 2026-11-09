local class = require("class")
local skynet = require("skynet")
---@class agent.Remote
---@field target table
---@field owner agent_session.AgentSession
---@field controller user.Execution
---@field records table<string, table>
---@field runs table<string, agent.Run>
---@field source_device string?
---@field closed boolean
---@field current_run agent.Run?
---@field current_call_id string?
---@field config agent.ToolConfig
local Remote = class()

function Remote:ctor(options)
    self.target = options.execution_target
    self.owner = options.owner
    self.controller = self.owner.owner.user.execution
    self.records = {}
    self.runs = {}
    self.source_device = nil
    self.closed = false
    self.current_run = nil
    self.current_call_id = nil
    self.config = { timeout_ms = options.tools.timeout_ms, max_processes = options.tools.max_processes,
        max_output_bytes = options.tools.max_output_bytes }
end

function Remote:invoke(operation, args, run, id)
    run = run or self.current_run
    id = id or self.current_call_id
    return self.controller:invoke(self.target, operation, args, run, id,
        run and run.source_device or self.source_device)
end

function Remote:project(run, max_bytes)
    self.source_device = run.source_device
    local result = self:invoke("project", { max_bytes = max_bytes }, run)
    assert(result.ok, result.error)
    return result.project
end

function Remote:prepare(name, args)
    local result = self:invoke("prepare", { name = name, args = args, limits = self.config })
    assert(result.ok, result.error)
    return result.action
end

function Remote:has_active()
    return next(self.records) ~= nil
end

function Remote:execute(name, args, action, run, record)
    self.runs[run.id] = run
    run.processes[run.id] = self
    local ok, result = pcall(self.invoke, self, "execute", { name = name, args = args, limits = self.config },
        run, record.id)
    self.runs[run.id], run.processes[run.id] = nil, nil
    if not ok then error(result, 0) end
    if result.session_id then
        local entry = self.records[result.session_id]
        if not entry then
            entry = { run = run, records = {}, source_device = run.source_device }
            self.records[result.session_id] = entry
            skynet.fork(function() self:watch(result.session_id, entry) end)
        end
        entry.records[#entry.records + 1] = { run = run, record = record }
        run.processes[result.session_id] = self
        record.process_id = result.session_id
    end
    record.output, record.exit_code = result.output or "", result.exit_code
    record.changed_files, record.error = result.changed_files or {}, result.error
    record.status = result.session_id and "running" or (run.cancelled or result.cancelled) and "cancelled"
        or result.ok == false and "failed"
        or result.exit_code and result.exit_code ~= 0 and "failed" or "completed"
    return result
end

function Remote:watch(id, entry)
    while not self.closed and self.records[id] == entry do
        skynet.sleep(10)
        local ok, result = pcall(self.invoke, self, "status", { session_id = id }, entry.run)
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

function Remote:terminate(id)
    local entry = self.records[id]
    if entry then
        pcall(self.invoke, self, "cancel", { session_id = id }, entry.run)
    elseif self.runs[id] then
        pcall(self.invoke, self, "cancel", {}, self.runs[id])
    end
end

function Remote:stop_remote(device_id)
    for id, entry in pairs(self.records) do
        if entry.source_device ~= device_id then self:terminate(id) end
    end
end

function Remote:close()
    for id in pairs(self.records) do self:terminate(id) end
    self.closed = true
end

return Remote
