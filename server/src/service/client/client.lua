local User = require("client.user")
local class = require("class")
local rpc = require("rpc")
local skynet = require("skynet")
local log = require("log")
local codes = require("enum.error_code")
local usernames = require("helper.username")
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
    sync_routes = "sync_routes",
}
ClientService.initializing_commands = { sync_routes = true }
ClientService.closing_commands = { disconnect = true }

function ClientService:ctor()
    self.users = {}
    self.connections = {}
    self.routes = {}
    self.cleanup_routes = {}
    self.apps = {}
    self.revision = 0
    self.center = nil
end

function ClientService:sync_routes(context, snapshot)
    assert(context.source == self.center, "应用目录来源无效")
    if snapshot.revision <= self.revision then return true end
    local routes, cleanup, apps, live, changes = {}, {}, {}, {}, {}
    for _, definition in ipairs(snapshot.apps) do
        local pool = #definition.addresses > 0 and Pool:new(definition.addresses) or nil
        assert(pool or not definition.enabled, "已上线应用缺少服务实例")
        for _, address in ipairs(definition.addresses) do live[address] = true end
        local previous = self.apps[definition.app_id]
        apps[definition.app_id] = definition
        if not previous or previous.enabled ~= definition.enabled or previous.transition ~= definition.transition then
            changes[#changes + 1] = { app_id = definition.app_id, enabled = definition.enabled }
        end
        for _, request in ipairs(definition.requests) do
            assert(routes[request] == nil, "应用请求重复注册: " .. request)
            routes[request] = definition.enabled and pool or false
        end
        for _, request in ipairs(definition.cleanup_requests or {}) do
            cleanup[request] = pool
        end
    end
    self.routes, self.cleanup_routes, self.revision = routes, cleanup, snapshot.revision
    self.apps = apps
    for id, state in pairs(self.connections) do
        for address in pairs(state.targets) do
            if not live[address] then state.targets[address] = nil end
        end
        for _, change in ipairs(changes) do
            rpc.send(state.websocket, "send_response", id, 0, "AppCenterChangedNtf", change)
        end
    end
    return true
end

function ClientService:init()
    self.center = assert(skynet.localname(".app_center"))
    local code, snapshot = rpc.call(self.center, "subscribe")
    assert(code == codes.succ and snapshot, "获取应用路由失败")
    self:sync_routes({ source = self.center }, snapshot)
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
    local cleanup = self.cleanup_routes[name]
    if pool == false and cleanup and state.targets[cleanup:select(state.user.identity.username)] then pool = cleanup end
    if pool == false then
        rpc.send(state.websocket, "send_response", id, message_id, name:gsub("Req$", "Res"),
            { ret = codes.server_busy, error = { message = "应用服务已下线", retryable = true } })
        return
    end
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
    if not state.targets[address] then
        response = { ret = codes.server_busy, error = { message = "应用服务已下线", retryable = true } }
    elseif code ~= codes.succ or type(response) ~= "table" then
        log.failure("client", "handle_request target=" .. address .. " request=" .. name, code)
        response = { ret = codes.call_fail, error = { message = "应用服务请求失败", retryable = true } }
    end
    rpc.send(state.websocket, "send_response", id, message_id, name:gsub("Req$", "Res"), response)
end

function ClientService:publish(context, username, name, args, connection_id)
    local user = self.users[username]
    if not user or name:sub(-3) ~= "Ntf" or name == "AppCenterChangedNtf" then return end
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
