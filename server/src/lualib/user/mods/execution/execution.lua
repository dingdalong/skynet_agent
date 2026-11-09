local class = require("class")
local skynet = require("skynet")
local crypt = require("skynet.crypt")
local rpc = require("rpc")
local codes = require("enum.error_code")
local cjson = require("cjson")
local log = require("log")

---@class user.Execution
---@field user user.User
---@field devices table<string, table>
---@field pending table<string, table>
local Execution = class()

function Execution:ctor(user)
    self.user = user
    self.devices = {}
    self.pending = {}
end

function Execution:snapshot()
    local result = {}
    for _, device in pairs(self.devices) do
        result[#result + 1] = { id = device.id, name = device.name,
            online = device.connection ~= nil, remote_enabled = device.remote_enabled }
    end
    table.sort(result, function(a, b) return a.id < b.id end)
    return result
end

function Execution:publish(device)
    self.user.owner:publish(self.user, "DesktopUpdatedNtf", { device = {
        id = device.id, name = device.name, online = device.connection ~= nil,
        remote_enabled = device.remote_enabled } })
end

function Execution:register(args, connection)
    assert(type(args.device_id) == "string" and args.device_id:match("^[%w_-]+$")
        and #args.device_id <= 128, "设备标识无效")
    assert(type(args.name) == "string" and #args.name <= 256, "设备名称无效")
    assert(type(args.authorization_id) == "string" and #args.authorization_id <= 128
        and args.authorization_id:match("^[%w_-]+$"), "执行授权标识无效")
    assert(not connection.device_id or connection.device_id == args.device_id, "连接已绑定其他设备")
    local device = self.devices[args.device_id]
    if not device then
        device = { id = args.device_id }
        self.devices[device.id] = device
    end
    if device.connection and device.connection ~= connection then self:disconnect(device.connection) end
    connection.device_id = device.id
    device.connection, device.name, device.remote_enabled = connection, args.name, args.remote_enabled == true
    device.authorization_id = args.authorization_id
    if not device.remote_enabled then
        for _, session in pairs(self.user.chat.sessions) do
            if session.execution_target and session.execution_target.device_id == device.id then
                session:stop_remote()
            end
        end
    end
    self:publish(device)
    return { ret = codes.succ }
end

function Execution:available(target, source_device)
    local device = self.devices[target.device_id]
    assert(device and device.connection, "目标桌面离线")
    assert(source_device == device.id or device.remote_enabled, "目标桌面未开启远程执行")
    return device.connection
end

function Execution:validate_target(target, connection)
    if not target or target.device_id == "" then return nil end
    assert(connection and connection.device_id == target.device_id, "请在目标桌面选择工作目录")
    self:available(target, connection.device_id)
    assert(type(target.workspace_id) == "string" and target.workspace_id ~= ""
        and #target.workspace_id <= 128, "工作区标识无效")
    assert(type(target.directory) == "string" and target.directory:sub(1, 1) == "/"
        and #target.directory <= 4096 and not target.directory:find("%z"), "工作目录无效")
    assert(target.platform == "macos" or target.platform == "linux", "不支持本地执行的平台")
    return table.copy(target)
end

function Execution:invoke(target, operation, args, run, call_id, source_device)
    local control = operation == "cancel" or operation == "status"
    local connection = self:available(target, control and target.device_id or source_device)
    local device = self.devices[target.device_id]
    local id = crypt.hexencode(crypt.randomkey()) .. "-" .. tostring(skynet.genid())
    local pending = { connection = connection }
    self.pending[id] = pending
    local code = rpc.send(connection.websocket_address, "send_response", connection.id, 0,
        "ExecutionActionNtf", { request_id = id, session_id = run and run.session_id or "",
            run_id = run and run.id or "", tool_call_id = call_id or "", operation = operation,
            arguments = cjson.encode(args), workspace_id = target.workspace_id,
            remote = source_device ~= target.device_id, authorization_id = device.authorization_id })
    if code ~= codes.succ then self.pending[id] = nil; error("桌面执行请求发送失败") end
    local timeout = operation == "execute" and args.name == "apply_patch"
        and args.limits and args.limits.timeout_ms or 30000
    local deadline = skynet.now() + math.ceil(timeout / 10) + 1000
    while not pending.result and not pending.error and skynet.now() < deadline do
        skynet.sleep(1)
    end
    self.pending[id] = nil
    assert(pending.result, pending.error or "桌面执行中断，执行结果未确认；不会自动重放")
    return pending.result
end

function Execution:result(args, connection)
    local pending = self.pending[args.request_id]
    if not pending then return { ret = codes.succ } end
    if pending.connection ~= connection then return { ret = codes.fail } end
    assert(type(args.result) == "string" and #args.result <= 1048576, "执行结果过大")
    local value = cjson.decode(args.result)
    assert(type(value) == "table", "执行结果无效")
    local function normalize(item)
        for key, field in pairs(item) do
            if field == cjson.null then item[key] = nil
            elseif type(field) == "table" then normalize(field) end
        end
    end
    normalize(value)
    pending.result = value
    return { ret = codes.succ }
end

function Execution:disconnect(connection)
    local device = connection.device_id and self.devices[connection.device_id]
    if not device or device.connection ~= connection then return end
    device.connection = nil
    for _, pending in pairs(self.pending) do
        if pending.connection == connection then pending.error = "目标桌面离线，执行结果未确认" end
    end
    for _, session in pairs(self.user.chat.sessions) do
        if session.execution_target and session.execution_target.device_id == device.id and session.run then
            log.info("execution", "disconnect", "device=%s session=%s", device.id, session.id)
            session.run:cancel()
        end
    end
    self:publish(device)
end

return Execution
