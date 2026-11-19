local class = require("class")
local native = require("agent_process")
local filesystem = require("agent_filesystem")
local skynet = require("skynet")
local socket = require("skynet.socket")
local sandbox = require("agent.sandbox")
local log = require("log")

---@class agent.Processes
local Processes = class()

function Processes:ctor(root, config, owner, session_id)
    self.root, self.config, self.owner, self.session_id = root, config, owner, session_id
    self.processes, self.sequence, self.closed = {}, 0, false
    self.launcher = assert(filesystem.realpath("bin/process_launcher"))
    log.info("agent.process", "init", "session=%s sandbox=%s max_processes=%d timeout_ms=%d",
        session_id, sandbox.platform(), config.max_processes, config.timeout_ms)
end

function Processes:publish(process)
    if self.owner then self.owner:_on_tool_update(process.message_id, process.record) end
end

local function text_bytes(bytes, final)
    local output, index = {}, 1
    while index <= #bytes do
        local first = bytes:byte(index)
        local length = first < 128 and 1 or first >= 194 and first <= 223 and 2
            or first >= 224 and first <= 239 and 3 or first >= 240 and first <= 244 and 4 or 1
        if index + length - 1 > #bytes and not final then break end
        local value = bytes:sub(index, index + length - 1)
        if utf8.len(value) then output[#output + 1] = value else output[#output + 1] = "�" end
        index = index + length
    end
    return table.concat(output):gsub("[%z\1-\8\11\12\14-\31\127]", ""), bytes:sub(index)
end

function Processes:_append(process, bytes)
    process.dirty = true
    local cap = self.config.max_output_bytes
    process.pending = process.pending .. bytes
    if #process.pending > cap then
        process.pending = process.pending:sub(-cap)
        process.truncated = true
    end
    process.record.output = (process.record.output .. bytes):sub(-32768)
    -- Truncation may split a code point; normalize only the retained tail.
    process.record.output = text_bytes(process.record.output, true)
    process.record.truncated = process.truncated or #process.pending > 32768
    if skynet.now() - process.published_at >= 10 then
        process.published_at = skynet.now()
        self:publish(process)
    end
end

function Processes:_read(process, id)
    local pending = ""
    local ok, err = pcall(function()
        while true do
            local bytes = socket.read(id)
            if not bytes then break end
            local text
            text, pending = text_bytes(pending .. bytes, false)
            self:_append(process, text)
        end
        if pending ~= "" then self:_append(process, text_bytes(pending, true)) end
    end)
    if not ok then log.failure("agent.process", "read session=" .. process.id, err) end
    local closed, close_error = pcall(socket.close, id)
    if not closed then log.failure("agent.process", "close fd=" .. tostring(id), close_error) end
    process.readers = process.readers - 1
end

function Processes:_watch(process)
    while process.exit_code == nil do
        if skynet.now() >= process.deadline and not process.stopping then
            process.record.error, process.timed_out = "命令执行超时", true
            self:terminate(process.id)
        end
        if process.dirty and skynet.now() - process.published_at >= 10 then
            process.dirty, process.published_at = false, skynet.now()
            self:publish(process)
        end
        process.exit_code = process.handle:poll()
        if process.exit_code == nil then skynet.sleep(1) end
    end
    while process.readers > 0 do skynet.sleep(1) end
    process.done = true
    process.record.exit_code = process.exit_code
    process.record.status = (process.timed_out or process.start_failed) and "failed" or process.stopping and "cancelled"
        or process.exit_code == 0 and "completed" or "failed"
    if process.exit_code ~= 0 then
        log.info("agent.process", "exit", "process=%s mode=%s code=%d status=%s",
            process.id, process.mode or "use_default", process.exit_code, process.record.status)
    end
    process.handle:close()
    if process.cleanup_path then os.remove(process.cleanup_path) end
    self:publish(process)
end

function Processes:start(argv, cwd, tty, mode, timeout, run, record, dependencies, extra_env)
    assert(not self.closed, "工具执行器已经关闭")
    local active, count = 0, 0
    for id, process in pairs(self.processes) do
        count = count + 1
        if not process.done then active = active + 1 elseif count > 64 then self.processes[id] = nil end
    end
    assert(active < self.config.max_processes, "会话运行进程数量已达上限")
    local env = sandbox.environment(self.root)
    for _, value in ipairs(extra_env or {}) do env[#env + 1] = value end
    if mode ~= "require_escalated" then argv = sandbox.command(argv, self.root, dependencies) end
    local handle = native.spawn(self.launcher, cwd, argv, env, tty)
    self.sequence = self.sequence + 1
    local id = self.session_id .. ":" .. self.sequence
    local output, errors = handle:fds()
    local process = { id = id, handle = handle, tty = tty, mode = mode, argv = argv, cwd = cwd,
        pending = "", record = record, message_id = run.message_id, published_at = skynet.now(),
        deadline = skynet.now() + math.ceil(timeout / 10), readers = 0 }
    self.processes[id] = process
    run.processes[id] = self
    record.process_id, record.status = id, "running"
    local attached, attach_error = pcall(function()
        process.output_id = socket.bind(output)
        process.readers = process.readers + 1
        skynet.fork(function() self:_read(process, process.output_id) end)
        if errors then
            process.error_id = socket.bind(errors)
            process.readers = process.readers + 1
            skynet.fork(function() self:_read(process, process.error_id) end)
        end
    end)
    if not attached then
        process.start_failed, record.error = true, "进程 I/O 接入失败"
        self:terminate(id)
    end
    skynet.fork(function() self:_watch(process) end)
    if not attached then error(attach_error, 0) end
    self:publish(process)
    return process
end

function Processes:get(id)
    return assert(self.processes[id], "执行会话不存在或不属于当前聊天会话")
end

function Processes:collect(process, duration, max_tokens, input)
    if input and input ~= "" then
        assert(not process.done and process.tty, "执行会话输入已关闭，交互命令请使用 tty=true")
        assert(socket.write(process.output_id, input), "写入终端失败")
    end
    local deadline = skynet.now() + math.ceil(duration / 10)
    repeat
        if process.done then break end
        skynet.sleep(1)
    until skynet.now() >= deadline
    local output = process.pending
    process.pending = ""
    local cap = math.min(65536, max_tokens * 4)
    local truncated = process.truncated or #output > cap
    if #output > cap then output = output:sub(1, cap // 2) .. "\n… 输出已截断 …\n" .. output:sub(-cap // 2) end
    output = text_bytes(output, true)
    self:publish(process)
    return { session_id = not process.done and process.id or nil, output = output,
        exit_code = process.exit_code, truncated = truncated, error = process.record.error }
end

function Processes:terminate(id)
    local process = self.processes[id]
    if process and not process.done then process.stopping = true; process.handle:terminate() end
end

function Processes:close()
    self.closed = true
    for id in pairs(self.processes) do self:terminate(id) end
    for _, process in pairs(self.processes) do while not process.done do skynet.sleep(1) end end
end

return Processes
