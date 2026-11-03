local class = require("class")
local skynet = require("skynet")
local queue = require("skynet.queue")
local socket = require("skynet.socket")
local websocket = require("http.websocket")
local protocol = require("network.protocol")
local rpc = require("rpc")
local log = require("log")
local error_code = require("enum.error_code")
local config = require("etc.cfg").agent_gateway

---@class network.Connection
---@field id string
---@field fd integer
---@field logind integer
---@field client_address integer?
---@field last_message_id integer
---@field write_queue function

---@class websocket.Websocket
---@field new fun(self: websocket.Websocket): websocket.Websocket
---@field connections table<string, network.Connection>
---@field fds table<integer, string>
---@field protocol network.Protocol
---@field closing boolean
local Websocket = class()

Websocket.commands = {
    accept = "accept",
    bind_client = "bind_client",
    send_response = "send_response",
    close_connection = "close_connection",
}
Websocket.closing_commands = { accept = true, close_connection = true }

function Websocket:ctor()
    self.connections = {}
    self.fds = {}
    self.protocol = protocol:new()
    self.closing = false
end

function Websocket:init()
    self.protocol:init()
end

---@param connection network.Connection
---@return boolean
function Websocket:_detach(connection)
    if self.connections[connection.id] ~= connection then
        return false
    end
    self.connections[connection.id] = nil
    self.fds[connection.fd] = nil
    if connection.client_address then
        rpc.send(connection.client_address, "disconnect", connection.id)
    end
    return true
end

---@param connection network.Connection
---@param code integer
---@param reason string
---@return boolean
function Websocket:_close(connection, code, reason)
    if not self:_detach(connection) then
        return false
    end
    -- 握手前 websocket.accept 可能还没有登记连接。
    if websocket.is_close(connection.fd) then
        socket.close(connection.fd)
    else
        websocket.close(connection.fd, code, reason)
    end
    return true
end

---@param _ base.CommandContext
---@param id string
---@param code integer
---@param reason string
---@return boolean
function Websocket:close_connection(_, id, code, reason)
    local connection = self.connections[id]
    return connection ~= nil and self:_close(connection, code, reason)
end

---@param _ base.CommandContext
---@param id string
---@param client_address integer
---@return boolean
function Websocket:bind_client(_, id, client_address)
    local connection = self.connections[id]
    if not connection or math.type(client_address) ~= "integer" or client_address <= 0 then
        return false
    end
    if connection.client_address and connection.client_address ~= client_address then
        log.info("websocket", "bind_client", "绑定冲突 connection=%s client_address=%s", id, client_address)
        return false
    end
    connection.client_address = client_address
    return true
end

---@param connection network.Connection
---@param payload string
---@return boolean
function Websocket:_write(connection, payload)
    return connection.write_queue(function()
        if self.connections[connection.id] ~= connection then
            return false
        end
        local ok, err = pcall(websocket.write, connection.fd, payload, "binary")
        if not ok then
            log.failure("websocket", "write connection=" .. connection.id, err)
            return false
        end
        return self.connections[connection.id] == connection
    end)
end

---@param _ base.CommandContext
---@param id string
---@param message_id integer
---@param name string
---@param args table
---@return boolean
function Websocket:send_response(_, id, message_id, name, args)
    local connection = self.connections[id]
    if not connection then
        return false
    end
    local encoded, payload = pcall(self.protocol.encode_msg, self.protocol, message_id, name, args)
    if not encoded then
        log.failure("websocket", "encode connection=" .. id .. " name=" .. name, payload)
    end
    if not encoded or not self:_write(connection, payload) then
        self:_close(connection, error_code.websocket_internal_error, "服务端响应失败")
        return false
    end
    return true
end

---@param connection network.Connection
---@param message string
---@param message_type string
function Websocket:_handle_message(connection, message, message_type)
    if self.connections[connection.id] ~= connection then
        return
    end
    if message_type ~= "binary" then
        log.info("websocket", "message", "拒绝非二进制消息 connection=%s", connection.id)
        self:_close(connection, error_code.websocket_unsupported_data, "仅支持二进制 Protobuf 消息")
        return
    end
    local decoded, id, name, args = pcall(self.protocol.decode_msg, self.protocol, message)
    if not decoded or id == 0 then
        log.failure("websocket", "decode connection=" .. connection.id, decoded and "消息 ID 为零" or id)
        self:_close(connection, error_code.websocket_invalid_payload_data, "无效的 Protobuf 消息")
        return
    end
    if name:sub(-3) ~= "Req" then
        log.info("websocket", "message", "拒绝消息方向 connection=%s name=%s", connection.id, name)
        self:_close(connection, error_code.websocket_policy_violation, "无效的请求消息")
        return
    end
    if id <= connection.last_message_id then
        log.info("websocket", "message", "忽略重复消息 connection=%s message_id=%d", connection.id, id)
        return
    end
    connection.last_message_id = id
    local code, handled
    if connection.client_address then
        code = rpc.send(connection.client_address, "handle_request", connection.id, id, name, args)
        handled = true
    else
        -- 只暂停本连接的读协程；logind 回调本服务时仍可执行绑定和写响应。
        code, handled = rpc.call(connection.logind, "handle_request", connection.id, id, name, args)
    end
    if code ~= error_code.succ or handled ~= true then
        self:_close(connection, error_code.websocket_internal_error, "服务端消息处理失败")
    end
end

---@param _ base.CommandContext
---@param fd integer
---@param addr string
---@param logind_address integer
function Websocket:accept(_, fd, addr, logind_address)
    if self.fds[fd] then
        log.info("websocket", "accept", "重复接入 fd=%d", fd)
        return
    end
    if self.closing then
        socket.close_fd(fd)
        return
    end
    local connection = {
        id = string.format("%x:%d", skynet.self(), skynet.genid()),
        fd = fd,
        logind = logind_address,
        last_message_id = 0,
        write_queue = queue(),
    }
    self.connections[connection.id] = connection
    self.fds[fd] = connection.id
    skynet.timeout(config.login_timeout_ticks, function()
        if self.connections[connection.id] == connection and not connection.client_address then
            log.info("websocket", "timeout", "连接登录超时 connection=%s", connection.id)
            self:_close(connection, error_code.websocket_policy_violation, "登录超时")
        end
    end)
    local handle = {}
    function handle.handshake(_, _, url)
        if self.connections[connection.id] ~= connection then
            return
        end
        if tostring(url):match("^([^?]*)") ~= config.socket.path then
            log.info("websocket", "handshake", "拒绝路径 connection=%s", connection.id)
            self:_close(connection, error_code.websocket_policy_violation, "无效的 WebSocket 路径")
            return
        end
        log.info("websocket", "handshake", "connection=%s addr=%s", connection.id, addr)
    end

    function handle.message(_, message, kind)
        self:_handle_message(connection, message, kind)
    end

    function handle.close()
        self:_detach(connection)
    end

    function handle.error(_, err)
        log.failure("websocket", "socket connection=" .. connection.id, err)
        self:_detach(connection)
    end

    local accepted, ok, err = pcall(websocket.accept, fd, handle, "ws", addr)
    if not accepted or not ok then
        log.failure("websocket", "accept connection=" .. connection.id, accepted and err or ok)
    end
    self:_detach(connection)
end

function Websocket:close()
    self.closing = true
    while true do
        local _, connection = next(self.connections)
        if not connection then
            return
        end
        self:_close(connection, 1001, "服务正在关闭")
    end
end

return Websocket
