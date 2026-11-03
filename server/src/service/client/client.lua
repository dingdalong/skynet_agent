local connection_class = require("client.connection")
local class = require("class")
local rpc = require("rpc")
local log = require("log")
local error_code = require("enum.error_code")
local skynet = require("skynet")

---@class client.ConnectionState
---@field connection client.Connection
---@field websocket_address integer

---@class client.Service
---@field new fun(self: client.Service): client.Service
---@field connections table<string, client.ConnectionState>
---@field pending_requests table<client.Request, boolean>
local ClientService = class()

ClientService.commands = { open = "open", handle_request = "handle_request", disconnect = "disconnect" }
ClientService.closing_commands = { disconnect = true }
ClientService.requests = {
    SessionCreateReq = "SessionCreateReq",
    SessionSelectReq = "SessionSelectReq",
    MessageSendReq = "MessageSendReq",
    MessageCancelReq = "MessageCancelReq",
}

function ClientService:ctor()
    self.connections = {}
    self.pending_requests = {}
end

---@param id string
---@param message_id integer
---@param name string
---@param args table
function ClientService:_respond(id, message_id, name, args)
    local state = self.connections[id]
    if state then
        rpc.send(state.websocket_address, "send_response", id, message_id, name, args)
    end
end

---@param _ base.CommandContext
---@param id string
---@param websocket_address integer
---@return table|nil
function ClientService:open(_, id, websocket_address)
    assert(not self.connections[id], "连接已经绑定 client 服务")
    local connection = connection_class:new(function(...)
        self:_respond(id, ...)
    end, self.pending_requests)
    local session, err = connection:create_session()
    if not session then
        connection:disconnect()
        log.failure("client", "open connection=" .. id, err)
        return nil
    end
    self.connections[id] = { connection = connection, websocket_address = websocket_address }
    return connection:snapshot()
end

---@param context base.CommandContext
---@param id string
---@param message_id integer
---@param name string
---@param args table
function ClientService:handle_request(context, id, message_id, name, args)
    local state = self.connections[id]
    if not state or context.source ~= state.websocket_address then
        log.info("client", "handle_request", "连接来源无效 connection=%s source=%s", id, context.source)
        return
    end
    local method = self.requests[name]
    if not method then
        log.info("client", "handle_request", "未知请求 connection=%s name=%s", id, name)
        rpc.send(state.websocket_address, "close_connection", id, error_code.websocket_policy_violation, "未知请求")
        return
    end
    local ok, err = xpcall(function()
        state.connection[method](state.connection, message_id, args)
    end, debug.traceback)
    if not ok then
        log.failure("client", "handle_request connection=" .. id, err)
        rpc.send(
            state.websocket_address, "close_connection", id, error_code.websocket_internal_error, "请求处理失败"
        )
    end
end

---@param _ base.CommandContext?
---@param id string
function ClientService:disconnect(_, id)
    local state = self.connections[id]
    if state then
        self.connections[id] = nil
        state.connection:disconnect()
    end
end

function ClientService:close()
    local succeeded = true
    local requests = {}
    for request in pairs(self.pending_requests) do
        requests[#requests + 1] = request
    end
    for _, request in ipairs(requests) do
        if not request:cancel() then
            succeeded = false
        end
    end
    for id in pairs(self.connections) do
        self:disconnect(nil, id)
    end
    while next(self.pending_requests) do
        skynet.sleep(1)
    end
    -- 响应头等待期间取消后，释放错误可能在生成协程收尾时才出现。
    for _, request in ipairs(requests) do
        if request.close_error then
            succeeded = false
            log.failure("client", "close", request.close_error)
        end
    end
    return succeeded
end

return ClientService
