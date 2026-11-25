local class = require("class")
local codes = require("enum.error_code")

---@class agent.DesktopConnections
---@field app agent.App
---@field devices table<string, table>
local DesktopConnections = class()

function DesktopConnections:ctor(app)
    self.app = app
    self.devices = {}
end

function DesktopConnections:snapshot()
    local result = {}
    for _, device in pairs(self.devices) do
        result[#result + 1] = {
            id = device.id,
            name = device.name,
            online = device.connection ~= nil,
            remote_enabled = device.remote_enabled
        }
    end
    table.sort(result, function(a, b) return a.id < b.id end)
    return result
end

function DesktopConnections:publish(device)
    self.app:publish("AgentDesktopUpdatedNtf", {
        device = {
            id = device.id,
            name = device.name,
            online = device.connection ~= nil,
            remote_enabled = device.remote_enabled
        }
    })
end

function DesktopConnections:register(args, connection)
    assert(type(args.device_id) == "string" and args.device_id:match("^[%w_-]+$")
        and #args.device_id <= 128, "设备标识无效")
    assert(type(args.name) == "string" and #args.name <= 256, "设备名称无效")
    assert(type(args.authorization_id) == "string" and #args.authorization_id <= 128
        and args.authorization_id:match("^[%w_-]+$"), "执行授权标识无效")
    assert(not connection.device_id or connection.device_id == args.device_id, "连接已绑定其他设备")
    local device = self.devices[args.device_id]
    local key = "device/" .. args.device_id
    if not self.app.blocked_settings[key]
        and (not device or device.name ~= args.name or device.remote_enabled ~= (args.remote_enabled == true)) then
        local ok = pcall(require("agent.persistence").settings, self.app, key,
            { name = args.name, remote_enabled = args.remote_enabled == true })
        if not ok then
            return nil, { ret = codes.call_fail, error = { message = "设备设置保存未确认", retryable = true } }
        end
    end
    if not device then
        device = { id = args.device_id }
        self.devices[device.id] = device
    end
    if device.connection and device.connection ~= connection then self.app:disconnect_desktop(device.connection) end
    connection.device_id = device.id
    device.connection, device.name, device.remote_enabled = connection, args.name, args.remote_enabled == true
    device.authorization_id = args.authorization_id
    return device
end

function DesktopConnections:available(target, source_device)
    local device = self.devices[target.device_id]
    assert(device and device.connection, "目标桌面离线")
    assert(source_device == device.id or device.remote_enabled, "目标桌面未开启远程执行")
    return device.connection, device.authorization_id
end

function DesktopConnections:validate_target(target, connection)
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

function DesktopConnections:disconnect(connection)
    local device = connection.device_id and self.devices[connection.device_id]
    if not device or device.connection ~= connection then return end
    device.connection = nil
    connection.device_id = nil
    return device
end

return DesktopConnections
