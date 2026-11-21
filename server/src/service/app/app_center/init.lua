local class = require("class")
local skynet = require("skynet")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local Pool = require("helper.service_pool")
local json = require("cjson")
local log = require("log")
local Protocol = require("network.protocol")
local Frame = require("network.frame")
local Deployment = require("app_center.deployment")
---@class app_center.Service
---@field apps table<string, table>
---@field clients table<integer, integer>
---@field acknowledged table<integer, integer>
---@field connections table<string, table>
---@field enabled table<string, boolean>
---@field revision integer
---@field changing table?
---@field closed boolean
---@field freezing boolean
---@field codec network.Protocol
local Center = class()

Center.commands = {
    subscribe = "subscribe", request = "request", disconnect = "disconnect", freeze = "freeze",
}

function Center:ctor()
    self.apps = {}
    self.clients = {}
    self.acknowledged = {}
    self.connections = {}
    self.enabled = {}
    self.revision = 0
    self.changing = nil
    self.closed = false
    self.freezing = false
    self.codec = Protocol:new()
end

function Center:_discover()
    local records = Deployment.discover()
    if self.freezing then return end
    local seen = {}
    for _, record in ipairs(records) do
        local id = record.app_id
        assert(Frame.valid_app(id) and id ~= "login" and id ~= "app-center" and not seen[id], "无效应用清单")
        seen[id] = true
        local app = self.apps[id]
        if not app then
            app = { app_id = id, name = record.name, service = record.service, count = 0, enabled = false }
            self.apps[id] = app
            Deployment.watch(self, app)
            self:_sync()
        elseif app.service ~= record.service then
            app.service, app.address, app.generation = record.service, nil, nil
            app.enabled, app.count = false, 0
            self:_sync()
        end
        app.name = record.name
        local desired = self.enabled[id]
        if desired == nil then desired = record.default_enabled end
        if not self.freezing and not self.changing and ((desired and not app.enabled)
            or (not desired and (record.running or app.transition))) and skynet.now() >= (app.retry_at or 0) then
            self:_change(app, desired, false)
        end
    end
    for id, app in pairs(self.apps) do
        if id ~= "app-center" and not seen[id] and not self.changing then
            self.apps[id] = nil
            self:_sync()
        end
    end
end

function Center:init()
    self.codec:init("app-center")
    local file, err, errno = io.open(config.app_center.state_path, "r")
    if file then
        local data = file:read("a")
        file:close()
        self.enabled = json.decode(data)
        assert(type(self.enabled) == "table", "应用注册状态无效")
        for id, value in pairs(self.enabled) do
            assert(type(id) == "string" and type(value) == "boolean", "应用注册状态无效")
        end
    else
        assert(errno == 2, err)
    end
    self.apps["app-center"] = { app_id = "app-center", name = "应用中心", service = "app_center",
        address = skynet.self(), generation = "local", count = 1, enabled = true }
    self:_sync()
    skynet.fork(function()
        while not self.closed do
            local ok, err = pcall(self._discover, self)
            if not ok then log.failure("app_center", "discover", err) end
            skynet.sleep(100)
        end
    end)
end

function Center:_snapshot()
    local apps = {}
    for _, app in pairs(self.apps) do
        apps[#apps + 1] = { app_id = app.app_id, address = app.address, generation = app.generation,
            enabled = app.enabled, transition = app.transition, notification = self.codec:encode_body(
                "AppCenterChangedNtf", { app_id = app.app_id, enabled = app.enabled }),
            offline_notification = self.codec:encode_body("AppCenterChangedNtf", { app_id = app.app_id }) }
    end
    return { apps = apps, revision = self.revision }
end

function Center:subscribe(context)
    for index = 1, config.agent_gateway.instance.client do
        if context.source == skynet.localname(".client_" .. index) then
            self.clients[context.source] = index
            self.acknowledged[context.source] = self.revision
            return self:_snapshot()
        end
    end
    error("订阅应用路由的来源无效")
end

function Center:_push(client, snapshot)
    local index = self.clients[client]
    if self.closed or not index or self.revision ~= snapshot.revision then return true end
    if client ~= skynet.localname(".client_" .. index) then
        self.clients[client] = nil
        self.acknowledged[client] = nil
        return true
    end
    local code, applied = rpc.call(client, "sync_routes", snapshot)
    if code == codes.succ and applied then
        self.acknowledged[client] = math.max(self.acknowledged[client] or 0, snapshot.revision)
        return true
    end
    skynet.timeout(100, function() self:_push(client, snapshot) end)
    return false
end

function Center:_sync(wait)
    self.revision = self.revision + 1
    local snapshot = self:_snapshot()
    local synced = true
    for client in pairs(self.clients) do
        if not self:_push(client, snapshot) then synced = false end
    end
    while wait and not synced do
        assert(not self.closed, "节点正在关闭")
        skynet.sleep(1)
        synced = true
        for client in pairs(self.clients) do
            if (self.acknowledged[client] or 0) < snapshot.revision then synced = false; break end
        end
    end
    return synced
end

function Center:_save(app, enabled)
    local desired = table.copy(self.enabled)
    desired[app.app_id] = enabled
    local path = config.app_center.state_path
    local file = assert(io.open(path .. ".tmp", "w"))
    local written, write_error = file:write(json.encode(desired), "\n")
    local closed, close_error = file:close()
    assert(written and closed, write_error or close_error)
    assert(os.rename(path .. ".tmp", path))
    self.enabled = desired
end

function Center:_set(app, enabled, persist)
    if persist then self:_save(app, enabled) end
    if enabled and app.enabled and not app.transition then return end
    app.transition = enabled and "enabling" or "disabling"
    app.enabled = false
    self:_sync(true)
    if enabled then Deployment.start(self, app) else Deployment.stop(self, app) end
    app.transition = nil
    self:_sync(true)
end

local function failure(message)
    log.info("app_center", "request", "%s", message)
    return { ret = codes.fail, error = { message = message } }
end

function Center:handle_request(context, identity, id, name, args)
    local slot = Pool.slot(identity.username, config.agent_gateway.instance.client)
    assert(self.clients[context.source] and context.source == skynet.localname(".client_" .. slot),
        "应用请求来源无效")
    local connection = self.connections[id]
    if not connection then
        connection = { client = context.source, username = identity.username, admin = false }
        self.connections[id] = connection
    end
    assert(connection.client == context.source and connection.username == identity.username, "连接身份无效")
    if name == "AppCenterListReq" then
        local names, services = {}, {}
        for _, app in pairs(self.apps) do
            if app.enabled then names[#names + 1] = app.name end
            if connection.admin then
                services[#services + 1] = { app_id = app.app_id, name = app.name, service = app.service,
                    instances = app.count, enabled = app.enabled, transition = app.transition }
            end
        end
        table.sort(names)
        table.sort(services, function(left, right) return left.app_id < right.app_id end)
        return { ret = codes.succ, names = names, services = services, administrator = connection.admin }
    end
    if name == "AppCenterUnlockReq" then
        local token = config.app_center.admin_token
        connection.admin = type(token) == "string" and token ~= "" and args.token == token
        if not connection.admin then return failure("管理令牌无效或管理功能未启用") end
        return { ret = codes.succ }
    end
    if name ~= "AppCenterSetReq" or not connection.admin then return failure("需要管理员权限") end
    local app = self.apps[args.app_id]
    if not app or app.app_id == "app-center" then return failure("此应用无法启停") end
    if self.freezing or self.closed then return failure("节点正在关闭") end
    if args.enabled and app.transition == "disable_failed" then return failure("请先完成服务下线") end
    return self:_change(app, args.enabled == true, true)
end

function Center:_change(app, enabled, persist)
    local change = self.changing
    if change then
        if change.app ~= app or change.enabled ~= enabled then
            return failure("应用正在启停，请稍后重试")
        end
        if persist and self.enabled[app.app_id] ~= enabled then self:_save(app, enabled) end
        while not change.response do skynet.sleep(1) end
        return change.response
    end
    change = { app = app, enabled = enabled }
    self.changing = change
    local ok, err = pcall(self._set, self, app, enabled, persist)
    if not ok then
        if app.transition then
            app.transition = enabled and "enable_failed" or "disable_failed"
            self:_sync()
        end
        log.failure("app_center", "set app=" .. app.app_id, err)
        change.response = failure("应用启停未完成，请刷新并重试")
        app.retry_delay = math.min(3000, (app.retry_delay or 50) * 2)
        app.retry_at = skynet.now() + app.retry_delay
    else
        app.retry_at, app.retry_delay = nil, nil
        change.response = { ret = codes.succ }
    end
    self.changing = nil
    return change.response
end

function Center:request(context, generation, identity, id, body)
    assert(generation == "local", "无效的目录代次")
    local name, args = self.codec:decode_body(body, "Req")
    local response = self:handle_request(context, identity, id, name, args)
    return self.codec:encode_body(name:gsub("Req$", "Res"), response)
end

function Center:disconnect(context, _, identity, id)
    local connection = self.connections[id]
    if connection and connection.client == context.source and connection.username == identity.username then
        self.connections[id] = nil
    end
end

function Center:close()
    self.closed = true
    return true
end

function Center:freeze(context)
    assert(context.source == skynet.localname(".main"), "节点来源无效")
    self.freezing = true
    while self.changing do skynet.sleep(1) end
    for id, app in pairs(self.apps) do
        if id ~= "app-center" then
            assert(self:_change(app, false, false).ret == codes.succ, "应用排空失败")
        end
    end
    self.closed = true
    return true
end

return Center
