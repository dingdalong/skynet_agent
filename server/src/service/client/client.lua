local User = require("client.user")
local class = require("class")
local rpc = require("rpc")
local skynet = require("skynet")
local log = require("log")
local codes = require("enum.error_code")
local usernames = require("helper.username")
local Frame = require("network.frame")
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
---@field targets table<string, string>

---@class client.Service
---@field users table<string, client.User>
---@field connections table<string, client.Connection>
---@field apps table<string, table>
---@field cursors table<string, integer>
---@field revision integer
---@field center integer?
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
    self.cursors = {}
    self.apps = {}
    self.revision = 0
    self.center = nil
end

function ClientService:sync_routes(context, snapshot)
    assert(context.source == self.center, "应用目录来源无效")
    if snapshot.revision <= self.revision then return true end
    local apps, changes = {}, {}
    for _, definition in ipairs(snapshot.apps) do
        local id = definition.app_id
        assert(not apps[id] and Frame.valid_app(id), "应用目录无效")
        apps[id] = definition
        local previous = self.apps[id]
        if not previous or previous.enabled ~= definition.enabled or previous.transition ~= definition.transition then
            changes[#changes + 1] = definition.notification
        end
        if not previous or previous.generation ~= definition.generation then self.cursors[id] = 0 end
    end
    for id, previous in pairs(self.apps) do
        if not apps[id] then
            changes[#changes + 1] = previous.offline_notification
            self.cursors[id] = nil
        end
    end
    self.apps, self.revision = apps, snapshot.revision
    for id, state in pairs(self.connections) do
        for app, generation in pairs(state.targets) do
            if not apps[app] or apps[app].generation ~= generation then state.targets[app] = nil end
        end
        for _, notification in ipairs(changes) do
            rpc.send(state.websocket, "send_response", id, 0, "app-center", Frame.notification, notification)
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

function ClientService:handle_request(context, id, message_id, app_id, body)
    local state = self.connections[id]
    if not state or context.source ~= state.websocket then return end
    local function failed(code, reason)
        rpc.send(state.websocket, "send_response", id, message_id, app_id, Frame.routing_error,
            string.char(code) .. reason)
    end
    local app = self.apps[app_id]
    if app_id == "login" then
        rpc.send(state.websocket, "close_connection", id, codes.websocket_policy_violation, "连接已登录")
        return
    end
    if not app then return failed(codes.invalid_param, "未知应用") end
    local draining = app.transition == "disabling" or app.transition == "disable_failed"
    if not app.address or (not app.enabled and not (draining and state.targets[app_id] == app.generation)) then
        return failed(codes.server_busy, "应用服务已下线")
    end
    state.targets[app_id] = app.generation
    local call = app_id == "app-center" and rpc.call_no_timeout or rpc.call
    local code, result = call(app.address, "request", app.generation, state.user.identity, id, body, draining)
    if self.connections[id] ~= state then return end
    if state.targets[app_id] ~= app.generation then return failed(codes.server_busy, "应用服务已下线") end
    if code ~= codes.succ or type(result) ~= "string" then return failed(codes.call_fail, "应用请求失败") end
    rpc.send(state.websocket, "send_response", id, message_id, app_id, Frame.response, result)
end

function ClientService:publish(context, app_id, generation, username, body, connection_id, cursor)
    assert(context.source == self.center, "应用通知来源无效")
    local app = self.apps[app_id]
    if not app or app.generation ~= generation or cursor <= (self.cursors[app_id] or 0) then return end
    self.cursors[app_id] = cursor
    local user = self.users[username]
    if not user then return end
    for id, state in pairs(user.connections) do
        if state.targets[app_id] == generation and (not connection_id or id == connection_id) then
            rpc.send(state.websocket, "send_response", id, 0, app_id, Frame.notification, body)
        end
    end
end

function ClientService:disconnect(context, id)
    local state = self.connections[id]
    if not state or (context.source ~= state.websocket and context.source ~= state.logind) then return end
    self.connections[id] = nil
    state.user.connections[id] = nil
    for app_id, generation in pairs(state.targets) do
        local app = self.apps[app_id]
        if app and app.address and app.generation == generation then
            rpc.send(app.address, "disconnect", generation, state.user.identity, id)
        end
    end
end

return ClientService
