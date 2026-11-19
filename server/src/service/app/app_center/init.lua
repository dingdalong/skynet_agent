local class = require("class")
local skynet = require("skynet")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local Pool = require("helper.service_pool")
local json = require("cjson")
local log = require("log")
---@class app_center.Service
local Center = class()

Center.commands = {
    subscribe = "subscribe", handle_request = "handle_request", disconnect = "disconnect", freeze = "freeze",
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
end

function Center:register(id, name, service, count, addresses, requests, cleanup_requests)
    assert(type(id) == "string" and id ~= "" and type(name) == "string" and name ~= "", "无效应用")
    assert(not self.apps[id] and count > 0 and #requests > 0, "应用声明无效或重复")
    local seen = { LoginReq = true }
    for other, app in pairs(self.apps) do
        if other ~= id then
            for _, request in ipairs(app.requests) do seen[request] = true end
        end
    end
    for _, request in ipairs(requests) do
        assert(request:match("Req$") and not seen[request], "应用请求重复或无效: " .. request)
        seen[request] = true
    end
    for _, cleanup in ipairs(cleanup_requests or {}) do
        local found = false
        for _, request in ipairs(requests) do if cleanup == request then found = true; break end end
        assert(found, "清理请求未登记: " .. cleanup)
    end
    self.apps[id] = { app_id = id, name = name, service = service, addresses = addresses, requests = requests,
        count = count, cleanup_requests = cleanup_requests, enabled = #addresses > 0 }
end

local function set_instances(app, enabled)
    local code, addresses = rpc.call_no_timeout(".main", "set_instances", app.service, enabled and app.count or 0)
    assert(code == codes.succ and addresses, "服务实例变更失败: " .. app.service)
    app.addresses, app.enabled = addresses, enabled
end

function Center:init(params)
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
    self:register("app-center", "应用中心", "app_center", 1, { skynet.self() },
        { "AppCenterListReq", "AppCenterUnlockReq", "AppCenterSetReq" })
    if params.agent_count > 0 then
        local routes = require("agent.routes")
        self:register("agent", "Agent", "agent", params.agent_count, {}, routes.requests, routes.cleanup_requests)
        if self.enabled.agent ~= false then set_instances(self.apps.agent, true) end
    end
    self:_sync()
end

function Center:_snapshot()
    local apps = {}
    for _, app in pairs(self.apps) do
        apps[#apps + 1] = { app_id = app.app_id, service = app.service, addresses = app.addresses,
            requests = app.requests, cleanup_requests = app.cleanup_requests, enabled = app.enabled,
            transition = app.transition }
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

function Center:_set(app, enabled)
    if app.enabled == enabled and not app.transition then return end
    local desired = table.copy(self.enabled)
    desired[app.app_id] = enabled
    local path = config.app_center.state_path
    local file = assert(io.open(path .. ".tmp", "w"))
    local written, write_error = file:write(json.encode(desired), "\n")
    local closed, close_error = file:close()
    assert(written and closed, write_error or close_error)
    assert(os.rename(path .. ".tmp", path))
    self.enabled = desired
    app.transition = enabled and "enabling" or "disabling"
    app.enabled = false
    self:_sync(true)
    set_instances(app, enabled)
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
                    instances = #app.addresses, enabled = app.enabled, transition = app.transition }
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
    if not app or app.app_id == "app-center" then return failure("此应用不能变更注册") end
    if self.closed then return failure("节点正在关闭") end
    if args.enabled and app.transition == "disable_failed" then return failure("请先完成服务下线") end
    local enabled = args.enabled == true
    local change = self.changing
    if change then
        if change.app ~= app or change.enabled ~= enabled then
            return failure("应用注册正在变更，请稍后重试")
        end
        while not change.response do skynet.sleep(1) end
        return change.response
    end
    change = { app = app, enabled = enabled }
    self.changing = change
    local ok, err = pcall(self._set, self, app, enabled)
    if not ok then
        if app.transition then
            app.transition = args.enabled and "enable_failed" or "disable_failed"
            self:_sync()
        end
        log.failure("app_center", "set app=" .. app.app_id, err)
        change.response = failure("注册变更未完成，请刷新并重试")
    else
        change.response = { ret = codes.succ }
    end
    self.changing = nil
    return change.response
end

function Center:disconnect(context, identity, id)
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
    self.closed = true
    while self.changing do skynet.sleep(1) end
    return true
end

return Center
