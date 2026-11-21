local class = require("class")
local skynet = require("skynet")
local cluster = require("skynet.cluster")
local crypt = require("skynet.crypt")
local nodes = require("network.nodes")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local Pool = require("helper.service_pool")
---@class gateway.AppRoutes
---@field clients table<integer, boolean>
---@field center integer?
---@field key string?
---@field boot string?
---@field epoch string?
---@field version integer
---@field snapshot table
---@field closed boolean
---@field applying boolean
---@field refresh boolean
local Routes = class()

Routes.commands = { subscribe = "subscribe", request = "request", disconnect = "disconnect",
    update = "update", publish = "publish" }

function Routes:ctor()
    self.clients = {}
    self.center, self.key, self.boot = nil, nil, nil
    self.epoch, self.version, self.snapshot = nil, 0, { revision = 0, apps = {} }
    self.closed = false
    self.applying = false
    self.refresh = false
end

function Routes:_install(snapshot)
    if self.epoch == snapshot.epoch and (self.version > snapshot.revision
        or self.version == snapshot.revision and not self.refresh) then return true end
    local apps, refresh = {}, false
    for _, app in ipairs(snapshot.apps) do
        if app.app_id == "app-center" then
            app.address = skynet.self()
        elseif app.endpoint then
            local ok, address = pcall(nodes.application, app.app_id, app.endpoint)
            if ok then
                app.address = address
            else
                app.enabled, app.notification, refresh = false, app.offline_notification, true
            end
        end
        apps[#apps + 1] = app
    end
    self.snapshot = { revision = self.snapshot.revision + 1, apps = apps }
    for client in pairs(self.clients) do
        assert(rpc.call(client, "sync_routes", self.snapshot) == codes.succ, "网关路由同步失败")
    end
    self.epoch, self.version, self.refresh = snapshot.epoch, snapshot.revision, refresh
    return true
end

function Routes:_apply(snapshot)
    while self.applying do skynet.sleep(1) end
    self.applying = true
    local ok, result = pcall(self._install, self, snapshot)
    self.applying = false
    assert(ok, result)
    return result
end

function Routes:init()
    self.key, self.boot = nodes.key(), crypt.hexencode(crypt.randomkey())
    cluster.register("gateway")
    local deadline = skynet.now() + 1500
    local snapshot
    repeat
        local ok, address = pcall(cluster.proxy, "center", "@center")
        if ok then
            self.center = address
            local code, directory = rpc.call(self.center, "directory", self.key, self.boot)
            if code == codes.succ then snapshot = directory end
        end
        if not snapshot then skynet.sleep(20) end
    until snapshot or skynet.now() >= deadline
    assert(snapshot, "应用目录未就绪")
    self:_apply(snapshot)
    skynet.fork(function()
        while not self.closed do
            skynet.sleep(100)
            local epoch = self.epoch
            local revision = self.refresh and 0 or self.version
            local result, next_snapshot = rpc.call(self.center, "directory", self.key, self.boot, epoch, revision)
            if result == codes.succ and next_snapshot and epoch == self.epoch then self:_apply(next_snapshot) end
        end
    end)
end

function Routes:update(_, key, boot, snapshot)
    assert(key == self.key and boot == self.boot)
    if self.epoch ~= snapshot.epoch then return false end
    return self:_apply(snapshot)
end

function Routes:subscribe(context)
    for index = 1, config.agent_gateway.instance.client do
        if context.source == skynet.localname(".client_" .. index) then
            self.clients[context.source] = true
            return self.snapshot
        end
    end
    error("无效的网关订阅来源")
end

function Routes:request(context, generation, identity, id, body)
    assert(self.clients[context.source])
    local code, result = rpc.call_no_timeout(self.center, "request", self.key, self.boot,
        generation, identity, id, body)
    assert(code == codes.succ)
    return result
end

function Routes:disconnect(context, generation, identity, id)
    assert(self.clients[context.source])
    rpc.send(self.center, "disconnect", self.key, self.boot, generation, identity, id)
end

function Routes:publish(_, key, boot, app, generation, username, body, connection, cursor)
    assert(key == self.key and boot == self.boot)
    local slot = Pool.slot(username, config.agent_gateway.instance.client)
    local target = skynet.localname(".client_" .. slot)
    if not target or not self.clients[target] then return false end
    local code, delivered = rpc.call(target, "publish", app, generation, username, body, connection, cursor)
    return code == codes.succ and delivered
end

function Routes:close()
    self.closed = true
    return true
end

return Routes
