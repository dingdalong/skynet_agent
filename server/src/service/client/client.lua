local User = require("client.user")
local class = require("class")
local rpc = require("rpc")
local skynet = require("skynet")
local log = require("log")
local codes = require("enum.error_code")
local usernames = require("helper.username")
local applications = require("client.applications")
local Pool = require("helper.service_pool")
local pools = require("etc.cfg").agent_gateway.instance

local function registered_source(pool, address)
    for index = 1, pools[pool] do
        if skynet.localname("." .. pool .. "_" .. index) == address then return true end
    end
    return false
end

---@class client.Connection
---@field user client.User
---@field websocket integer
---@field logind integer
---@field targets table<integer, boolean>

---@class client.Service
---@field users table<string, client.User>
---@field connections table<string, client.Connection>
---@field routes table<string, helper.ServicePool>
local ClientService = class()

ClientService.commands = {
    open = "open", handle_request = "handle_request", disconnect = "disconnect", publish = "publish",
}
ClientService.closing_commands = { disconnect = true }

function ClientService:ctor()
    self.users = {}
    self.connections = {}
    self.routes = {}
end

---@param params {app_services: table<string, integer[]>}
function ClientService:init(params)
    for app, definition in pairs(applications) do
        local addresses = params.app_services[app]
        if definition.address then
            local address = skynet.localname(definition.address)
            assert(address, "公共服务未注册: " .. definition.address)
            addresses = { address }
        end
        local pool = Pool:new(addresses)
        for _, request in ipairs(definition.requests) do
            assert(not self.routes[request], "应用请求重复注册: " .. request)
            self.routes[request] = pool
        end
    end
    log.info("client", "init", "应用路由已加载")
end

function ClientService:open(context, id, websocket_address, name)
    if not registered_source("logind", context.source) or not registered_source("websocket", websocket_address) then
        log.failure("client", "open", "登录或连接服务来源无效")
        return nil
    end
    assert(not self.connections[id], "连接已经绑定 client 服务")
    if not name or usernames.normalize(name) ~= name then return nil end
    local user = self.users[name]
    if not user then
        user = User:new(name)
        self.users[name] = user
        log.info("client", "open", "创建用户 user=%s", user.identity.user_id)
    end
    local state = { user = user, websocket = websocket_address, logind = context.source, targets = {} }
    user.connections[id] = state
    self.connections[id] = state
    return user.identity
end

function ClientService:handle_request(context, id, message_id, name, args)
    local state = self.connections[id]
    if not state or context.source ~= state.websocket then
        log.info("client", "handle_request", "连接来源无效 connection=%s source=%s", id, context.source)
        return
    end
    local pool = self.routes[name]
    if not pool then
        log.info("client", "handle_request", "未知请求 connection=%s name=%s", id, name)
        rpc.send(state.websocket, "close_connection", id, codes.websocket_policy_violation, "未知请求")
        return
    end
    local identity = state.user.identity
    local address = pool:select(identity.username)
    state.targets[address] = true
    local code, response = rpc.call_no_timeout(address, "handle_request", identity, id, name, args)
    if self.connections[id] ~= state then return end
    if code ~= codes.succ or type(response) ~= "table" then
        log.failure("client", "handle_request target=" .. address .. " request=" .. name, code)
        response = { ret = codes.call_fail, error = { message = "应用服务请求失败", retryable = true } }
    end
    rpc.send(state.websocket, "send_response", id, message_id, name:gsub("Req$", "Res"), response)
end

function ClientService:publish(context, username, name, args, connection_id)
    local user = self.users[username]
    if not user or name:sub(-3) ~= "Ntf" then return end
    for id, state in pairs(user.connections) do
        if state.targets[context.source] and (not connection_id or id == connection_id) then
            rpc.send(state.websocket, "send_response", id, 0, name, args)
        end
    end
end

function ClientService:disconnect(context, id)
    local state = self.connections[id]
    if not state or (context.source ~= state.websocket and context.source ~= state.logind) then return end
    self.connections[id] = nil
    state.user.connections[id] = nil
    for address in pairs(state.targets) do rpc.send(address, "disconnect", state.user.identity, id) end
end

return ClientService
