local class = require("class")
local skynet = require("skynet")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local cluster = require("skynet.cluster")
local crypt = require("skynet.crypt")
local nodes = require("network.nodes")
local log = require("log")
local Protocol = require("network.protocol")
local Frame = require("network.frame")
local Deployment = require("app_center.deployment")
local Catalog = require("app_center.catalog")
---@class app_center.Service
---@field apps table<string, table>
---@field key string?
---@field epoch string?
---@field gateway integer?
---@field boot string?
---@field gateway_seen integer
---@field acknowledged integer
---@field connections table<string, table>
---@field documents table<string, table>
---@field store integer?
---@field locks table
---@field reconciling table
---@field uncertain table
---@field retired table
---@field revision integer
---@field closed boolean
---@field freezing boolean
---@field codec network.Protocol
local Center = class()

Center.commands = {
    directory = "directory", register = "register", submit = "submit", request = "request",
    disconnect = "disconnect", freeze = "freeze",
}

function Center:ctor()
    self.apps = {}
    self.key, self.epoch, self.gateway, self.boot = nil, nil, nil, nil
    self.gateway_seen, self.acknowledged = 0, 0
    self.connections = {}
    self.documents, self.locks, self.reconciling, self.uncertain, self.retired = {}, {}, {}, {}, {}
    self.store = nil
    self.revision = 0
    self.closed = false
    self.freezing = false
    self.codec = Protocol:new()
end

function Center:_reconcile(id)
    if self.freezing then return end
    Catalog.refresh(self, id)
    local doc = self.documents[id]
    if not doc or not doc.approved then return end
    if doc.removed and self.retired[id] then return end
    local app = self.apps[id]
    if not app then
        app = { app_id = id, image = doc.approved.image_id, count = 0, enabled = false }
        self.apps[id] = app
        Deployment.watch(self, app)
    end
    if skynet.now() < (app.retry_at or 0) then return end
    if doc.removed then
        local stopped = self:_change(app, false)
        if stopped.ret ~= codes.succ then return stopped end
        Deployment.manage(app, "remove")
        self.retired[id], self.apps[id] = true, nil
        self:_sync()
        return
    end
    self.retired[id] = nil
    if app.image ~= doc.approved.image_id or app.outdated then
        local stopped = self:_change(app, false)
        if stopped.ret ~= codes.succ then return stopped end
        app.image, app.outdated = doc.approved.image_id, false
    end
    if app.enabled ~= doc.desired or not app.checked or app.transition then
        return self:_change(app, doc.desired)
    end
end

function Center:_reconcile_all()
    local ids = table.copy(self.uncertain)
    for id in pairs(self.documents) do ids[id] = true end
    for id in pairs(ids) do
        if not self.reconciling[id] then
            self.reconciling[id] = true
            skynet.fork(function()
                local ok, err = pcall(Catalog.lock(self, id), self._reconcile, self, id)
                self.reconciling[id] = nil
                if not ok then log.failure("app_center", "reconcile " .. id, err) end
            end)
        end
    end
end

function Center:init()
    self.key, self.epoch = nodes.key(), crypt.hexencode(crypt.randomkey())
    cluster.register("center")
    self.codec:init("app-center")
    Catalog.open(self)
    self.apps["app-center"] = { app_id = "app-center", generation = self.epoch, enabled = true }
    self:_sync()
    skynet.fork(function()
        while not self.closed do
            local ok, err = pcall(self._reconcile_all, self)
            if not ok then log.failure("app_center", "reconcile", err) end
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
    local doc = self.documents[app.app_id]
    return doc and doc.approved and not doc.removed and doc.desired
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

function Center:_set(app, enabled)
    if enabled and app.enabled and not app.transition then return end
    app.transition = enabled and "enabling" or "disabling"
    app.enabled = false
    self:_sync(true)
    if enabled then Deployment.start(self, app) else Deployment.stop(self, app) end
    app.transition, app.checked = nil, true
    self:_sync(true)
end

local function failure(message, retryable)
    log.info("app_center", "request", "%s", message)
    return { ret = codes.fail, error = { message = message, retryable = retryable } }
end

function Center:_manage(id, operation, ...)
    if not Frame.valid_app(id) or id == "login" or id == "app-center" then return failure("应用 ID 无效") end
    local ok, result = pcall(Catalog.lock(self, id), function(...)
        assert(not self.freezing and not self.closed, "节点正在关闭")
        Catalog.refresh(self, id)
        return operation(self, id, ...)
    end, ...)
    if not ok then
        log.failure("app_center", "manage " .. id, result)
        local message = tostring(result):match("([^\n]+)") or "应用管理失败"
        return failure(message:gsub("^.-:%d+: ", ""), self.uncertain[id] == true)
    end
    return type(result) == "table" and result or { ret = codes.succ, request_id = result }
end

function Center:submit(_, key, args)
    assert(key == self.key, "无效的部署凭据")
    return self:_manage(args.app_id, Catalog.submit, args)
end

function Center:handle_request(context, identity, id, name, args)
    local connection = self.connections[id]
    if not connection then
        connection = { username = identity.username, admin = false }
        self.connections[id] = connection
    end
    assert(connection.username == identity.username, "连接身份无效")
    if name == "AppCenterListReq" then
        local names, services = { "应用中心" }, {}
        if connection.admin then
            services[1] = { app_id = "app-center", name = names[1],
                instances = 1, enabled = true, can_set_enabled = false }
        end
        for app_id, doc in pairs(self.documents) do
            local app = self.apps[app_id]
            local approved = not doc.removed and doc.approved or nil
            if approved and app and app.enabled then names[#names + 1] = approved.name end
            if connection.admin and (not doc.removed or doc.pending or app) then
                local version = approved or doc.pending or doc.approved or doc.last
                services[#services + 1] = { app_id = app_id, name = version.name,
                    approved = approved, pending = doc.pending, last = doc.last,
                    instances = app and app.count or 0, enabled = app and app.enabled or false,
                    can_set_enabled = Catalog.can_set_enabled(doc),
                    desired = doc.desired, transition = app and app.transition }
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
    if not connection.admin then return failure("需要管理员权限") end
    if name == "AppCenterReviewReq" then
        return self:_manage(args.app_id, Catalog.review, args, identity.username)
    elseif name == "AppCenterRemoveReq" then
        return self:_manage(args.app_id, function(center, id)
            Catalog.remove(center, id)
            if center.apps[id] then center.apps[id].retry_at = nil end
            return center:_reconcile(id)
        end)
    elseif name == "AppCenterSetReq" then
        return self:_manage(args.app_id, function(center, id)
            local app = center.apps[id]
            assert(not (args.enabled and app and app.transition == "disable_failed"), "请先完成服务下线")
            Catalog.set(center, id, args.enabled == true)
            if app then app.retry_at = nil end
            return center:_reconcile(id)
        end)
    end
    return failure("未知管理请求")
end

function Center:_change(app, enabled)
    app.changing = true
    local ok, err = pcall(self._set, self, app, enabled)
    local response
    if not ok then
        if app.transition then
            app.transition = enabled and "enable_failed" or "disable_failed"
            self:_sync()
        end
        log.failure("app_center", "set app=" .. app.app_id, err)
        response = failure("应用启停未完成，请刷新并重试", true)
        app.retry_delay = math.min(3000, (app.retry_delay or 50) * 2)
        app.retry_at = skynet.now() + app.retry_delay
    else
        app.retry_at, app.retry_delay = nil, nil
        response = { ret = codes.succ }
    end
    app.changing = nil
    return response
end

function Center:request(context, key, boot, generation, identity, id, body)
    assert(key == self.key and boot == self.boot and generation == self.epoch, "无效的目录请求")
    local name, args = self.codec:decode_body(body, "Req")
    local response = self:handle_request(context, identity, id, name, args)
    return self.codec:encode_body(name:gsub("Req$", "Res"), response)
end

function Center:disconnect(_, key, boot, generation, identity, id)
    assert(key == self.key and boot == self.boot)
    if generation ~= self.epoch then return end
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
            local result = Catalog.lock(self, id)(self._change, self, app, false)
            if result.ret ~= codes.succ then succeeded = false end
        end
    end
    self.closed = true
    return succeeded
end

return Center
