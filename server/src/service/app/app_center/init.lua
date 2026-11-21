local class = require("class")
local skynet = require("skynet")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local cluster = require("skynet.cluster")
local crypt = require("skynet.crypt")
local nodes = require("network.nodes")
local json = require("cjson")
local log = require("log")
local Protocol = require("network.protocol")
local Frame = require("network.frame")
local Deployment = require("app_center.deployment")
---@class app_center.Service
---@field apps table<string, table>
---@field key string?
---@field epoch string?
---@field gateway integer?
---@field boot string?
---@field gateway_seen integer
---@field acknowledged integer
---@field connections table<string, table>
---@field enabled table<string, boolean>
---@field revision integer
---@field closed boolean
---@field freezing boolean
---@field codec network.Protocol
local Center = class()

Center.commands = {
    directory = "directory", register = "register", request = "request", disconnect = "disconnect", freeze = "freeze",
}

function Center:ctor()
    self.apps = {}
    self.key, self.epoch, self.gateway, self.boot = nil, nil, nil, nil
    self.gateway_seen, self.acknowledged = 0, 0
    self.connections = {}
    self.enabled = {}
    self.revision = 0
    self.closed = false
    self.freezing = false
    self.codec = Protocol:new()
end

function Center:_discover()
    local records, invalid = Deployment.discover()
    if self.freezing then return end
    local seen = invalid
    for _, record in ipairs(records) do
        local id = record.app_id
        assert(Frame.valid_app(id) and id ~= "login" and id ~= "app-center" and not seen[id], "无效应用清单")
        seen[id] = true
        local app = self.apps[id]
        if not app then
            app = { app_id = id, name = record.name, service = id, image = record.image, count = 0, enabled = false }
            self.apps[id] = app
            Deployment.watch(self, app)
            self:_sync()
        end
        app.name = record.name
        app.default = record.default_enabled
        local desired = self:_desired(app)
        if not app.changing and skynet.now() >= (app.retry_at or 0) then
            if app.image ~= record.image or app.outdated then
                if self:_change(app, false, false).ret == codes.succ then
                    app.image, app.outdated = record.image, false
                end
            elseif desired ~= app.enabled or app.transition or not app.checked then
                skynet.fork(function()
                    if not self.freezing and self:_desired(app) == desired then self:_change(app, desired, false) end
                end)
            end
        end
    end
    for id, app in pairs(self.apps) do
        if id ~= "app-center" and not seen[id] and not app.changing then
            if self:_change(app, false, false).ret == codes.succ then
                Deployment.manage(app, "remove")
                self.apps[id] = nil
                self:_sync()
            end
        end
    end
end

function Center:init()
    self.key, self.epoch = nodes.key(), crypt.hexencode(crypt.randomkey())
    cluster.register("center")
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
    for _, record in ipairs(Deployment.managed()) do
        local id = record.app_id
        local app = { app_id = id, service = id, name = id, image = record.image, enabled = false, count = 0 }
        self.apps[id] = app
        Deployment.watch(self, app)
    end
    self.apps["app-center"] = { app_id = "app-center", name = "应用中心", service = "app_center",
        generation = self.epoch, count = 1, enabled = true }
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
        apps[#apps + 1] = { app_id = app.app_id, endpoint = app.endpoint, generation = app.generation, key = app.key,
            enabled = app.enabled, transition = app.transition, notification = self.codec:encode_body(
                "AppCenterChangedNtf", { app_id = app.app_id, enabled = app.enabled }),
            offline_notification = self.codec:encode_body("AppCenterChangedNtf", { app_id = app.app_id }) }
    end
    return { apps = apps, revision = self.revision, epoch = self.epoch }
end

function Center:_desired(app)
    if self.enabled[app.app_id] ~= nil then return self.enabled[app.app_id] end
    return app.default
end

function Center:directory(_, key, boot, epoch, revision)
    assert(key == self.key and type(boot) == "string")
    if not self.gateway then self.gateway = cluster.proxy("gateway", "@gateway") end
    if self.boot ~= boot then
        self.boot, self.connections, self.acknowledged = boot, {}, 0
    end
    self.gateway_seen = skynet.now()
    if epoch == self.epoch then self.acknowledged = math.max(self.acknowledged, revision) end
    if epoch ~= self.epoch or revision ~= self.revision then return self:_snapshot() end
end

function Center:_sync(wait)
    self.revision = self.revision + 1
    local revision = self.revision
    local boot = self.boot
    if boot and skynet.now() - self.gateway_seen < 500 then
        local code, applied = rpc.call(self.gateway, "update", self.key, boot, self:_snapshot())
        if code == codes.succ and applied and boot == self.boot then
            self.acknowledged = math.max(self.acknowledged, revision)
        end
        while wait and boot == self.boot and self.acknowledged < revision and skynet.now() - self.gateway_seen < 500 do
            skynet.sleep(5)
        end
    end
end

function Center:register(_, id, key, port, generation)
    local app = self.apps[id]
    if not app or not app.key or app.key ~= key or not self:_desired(app)
        or self.freezing or app.transition == "disabling" then return false end
    assert(math.type(port) == "integer" and port > 0 and port <= 65535 and type(generation) == "string")
    local endpoint = "127.0.0.1:" .. port
    if app.address and app.generation == generation and app.endpoint == endpoint then return true end
    local address = nodes.application(id, endpoint)
    local code, actual, instance, count, cursor = rpc.call(address, "hello", key)
    if code ~= codes.succ or actual ~= id or instance ~= generation or count < 1 or app.key ~= key
        or self.freezing or not self:_desired(app) or app.transition == "disabling" then return false end
    if app.generation ~= generation then app.cursor = cursor end
    app.address, app.endpoint, app.generation, app.count = address, endpoint, generation, count
    if app.enabled then self:_sync() end
    return true
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
    app.transition, app.checked = nil, true
    self:_sync(true)
end

local function failure(message)
    log.info("app_center", "request", "%s", message)
    return { ret = codes.fail, error = { message = message } }
end

function Center:handle_request(context, identity, id, name, args)
    local connection = self.connections[id]
    if not connection then
        connection = { username = identity.username, admin = false }
        self.connections[id] = connection
    end
    assert(connection.username == identity.username, "连接身份无效")
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
    local change = app.changing
    if change then
        if change.app ~= app or change.enabled ~= enabled then
            return failure("应用正在启停，请稍后重试")
        end
        if persist and self.enabled[app.app_id] ~= enabled then self:_save(app, enabled) end
        while not change.response do skynet.sleep(1) end
        return change.response
    end
    change = { app = app, enabled = enabled }
    app.changing = change
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
    app.changing = nil
    return change.response
end

function Center:request(context, key, boot, generation, identity, id, body)
    assert(key == self.key and boot == self.boot and generation == self.epoch, "无效的目录请求")
    local name, args = self.codec:decode_body(body, "Req")
    local response = self:handle_request(context, identity, id, name, args)
    return self.codec:encode_body(name:gsub("Req$", "Res"), response)
end

function Center:disconnect(_, key, boot, _, identity, id)
    assert(key == self.key and boot == self.boot)
    local connection = self.connections[id]
    if connection and connection.username == identity.username then
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
    local succeeded = true
    for id, app in pairs(self.apps) do
        if id ~= "app-center" then
            while app.changing do skynet.sleep(1) end
            if self:_change(app, false, false).ret ~= codes.succ then succeeded = false end
        end
    end
    self.closed = true
    return succeeded
end

return Center
