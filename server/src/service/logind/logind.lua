local username = require("helper.username")
local class = require("class")
local pool = require("helper.service_pool")
local rpc = require("rpc")
local log = require("log")
local error_code = require("enum.error_code")

---@class logind.Service
---@field new fun(self: logind.Service): logind.Service
---@field client_services helper.ServicePool?
local Login = class()

Login.commands = { handle_request = "handle_request" }

function Login:ctor()
end

---@param params {client_services: integer[]}
function Login:init(params)
    self.client_services = pool:new(params.client_services)
end

---@param websocket_address integer
---@param command string
---@param id string
---@param ... any
---@return boolean
function Login:_call_websocket(websocket_address, command, id, ...)
    local code, result = rpc.call(websocket_address, command, id, ...)
    return code == error_code.succ and result == true
end

---@param websocket_address integer
---@param id string
---@param message_id integer
---@param ret error_code
---@param message string
---@return boolean
function Login:_fail(websocket_address, id, message_id, ret, message)
    log.info("logind", "login", "拒绝登录 connection=%s code=%d", id, ret)
    local sent = self:_call_websocket(websocket_address, "send_response", id, message_id, "LoginRes", {
        ret = ret,
        error = { message = message, retryable = ret ~= error_code.invalid_param },
    })
    local close_code = ret == error_code.invalid_param
        and error_code.websocket_policy_violation or error_code.websocket_internal_error
    local closed = self:_call_websocket(websocket_address, "close_connection", id, close_code, message)
    return sent and closed
end

---@param context base.CommandContext
---@param id string
---@param message_id integer
---@param name string
---@param args table
---@return boolean
function Login:handle_request(context, id, message_id, name, args)
    local websocket_address = context.source
    if name ~= "LoginReq" then
        return self:_fail(websocket_address, id, message_id, error_code.invalid_param, "连接尚未登录")
    end
    local user_name = username.normalize(args.username)
    if not user_name then
        return self:_fail(
            websocket_address, id, message_id, error_code.invalid_param, "用户名须为 1–32 个字符"
        )
    end
    local client_address = self.client_services:select(user_name)
    local code, snapshot = rpc.call(client_address, "open", id, websocket_address, user_name)
    if code ~= error_code.succ or type(snapshot) ~= "table" then
        rpc.send(client_address, "disconnect", id)
        return self:_fail(websocket_address, id, message_id, error_code.call_fail, "客户端上下文初始化失败")
    end
    if not self:_call_websocket(websocket_address, "bind_client", id, client_address) then
        rpc.send(client_address, "disconnect", id)
        return self:_fail(websocket_address, id, message_id, error_code.call_fail, "客户端服务绑定失败")
    end
    -- 绑定后的断线和写入失败统一由 WebSocket 通知 client 服务。
    return self:_call_websocket(websocket_address, "send_response", id, message_id, "LoginRes", {
        ret = error_code.succ,
        snapshot = snapshot,
    })
end

return Login
