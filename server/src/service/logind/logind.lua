local username = require("helper.username")
local class = require("class")
local Protocol = require("network.protocol")
local config = require("etc.cfg").agent_gateway
local Frame = require("network.frame")
local pool = require("helper.service_pool")
local rpc = require("rpc")
local log = require("log")
local error_code = require("enum.error_code")

---@class logind.Service
---@field new fun(self: logind.Service): logind.Service
---@field client_services helper.ServicePool?
---@field version string?
---@field codec network.Protocol
local Login = class()

Login.commands = { handle_request = "handle_request" }

function Login:ctor()
    self.version = nil
    self.client_services = nil
    self.codec = Protocol:new()
end

---@param params {client_services: integer[]}
function Login:init(params)
    self.client_services = pool:new(params.client_services)
    self.codec:init("login")
    self.version = require("helper.node_version").read("gateway")
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
---@param app_id string?
---@return boolean
function Login:_fail(websocket_address, id, message_id, ret, message, app_id)
    log.info("logind", "login", "拒绝登录 connection=%s code=%d", id, ret)
    local kind, body
    if app_id then
        kind, body = Frame.routing_error, string.char(ret) .. message
    else
        kind = Frame.response
        body = self.codec:encode_body("LoginRes", {
            ret = ret, error = { message = message, retryable = ret ~= error_code.invalid_param },
        })
    end
    local sent = self:_call_websocket(websocket_address, "send_response", id, message_id, app_id or "login", kind, body)
    local close_code = ret == error_code.invalid_param
        and error_code.websocket_policy_violation or error_code.websocket_internal_error
    local closed = self:_call_websocket(websocket_address, "close_connection", id, close_code, message)
    return sent and closed
end

---@param context base.CommandContext
---@param id string
---@param message_id integer
---@param app_id string
---@param body string
---@return boolean
function Login:handle_request(context, id, message_id, app_id, body)
    local websocket_address = context.source
    if app_id ~= "login" then
        return self:_fail(websocket_address, id, message_id, error_code.invalid_param, "连接尚未登录", app_id)
    end
    local ok, name, args = pcall(self.codec.decode_body, self.codec, body, "Req")
    if not ok or name ~= "LoginReq" then
        return self:_fail(websocket_address, id, message_id, error_code.invalid_param, "无效登录请求")
    end
    local user_name = username.normalize(args.username)
    if not user_name then
        return self:_fail(
            websocket_address, id, message_id, error_code.invalid_param, "用户名须为 1–32 个字符"
        )
    end
    local code, identity = rpc.call_timeout(180, ".database", "user_identity", user_name)
    if code ~= error_code.succ or not identity then
        return self:_fail(websocket_address, id, message_id, error_code.call_fail, "暂时无法确认用户身份")
    end
    local client_address = self.client_services:select(user_name)
    local opened, bound = rpc.call(client_address, "open", id, websocket_address, identity)
    if opened ~= error_code.succ or not bound then
        rpc.send(client_address, "disconnect", id)
        return self:_fail(websocket_address, id, message_id, error_code.call_fail, "客户端上下文初始化失败")
    end
    if not self:_call_websocket(websocket_address, "bind_client", id, client_address) then
        rpc.send(client_address, "disconnect", id)
        return self:_fail(websocket_address, id, message_id, error_code.call_fail, "客户端服务绑定失败")
    end
    -- 绑定后的断线和写入失败统一由 WebSocket 通知 client 服务。
    local response = self.codec:encode_body("LoginRes", {
        ret = error_code.succ,
        identity = identity,
        gateway_version = self.version,
        max_message_bytes = config.socket.max_message_bytes,
    })
    return self:_call_websocket(websocket_address, "send_response", id, message_id, "login", Frame.response, response)
end

return Login
