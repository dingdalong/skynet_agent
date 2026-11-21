local skynet = require("skynet")
local json = require("cjson")
local lfs = require("lfs")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local Frame = require("network.frame")
local log = require("log")
local Deployment = {}

local function manifest(directory, filename)
    local file = assert(io.open(directory .. "/" .. filename, "r"))
    local bytes = file:read(16385)
    file:close()
    assert(bytes and #bytes <= 16384)
    local record = json.decode(bytes)
    local id = record.app_id
    assert(Frame.valid_app(id) and filename == id .. ".json" and id ~= "login" and id ~= "app-center")
    assert(type(record.image) == "string" and #record.image <= 255 and record.image:match("^[%w][%w./_:@%-]*$"))
    assert(record.name == nil or type(record.name) == "string")
    assert(record.enabled == nil or type(record.enabled) == "boolean")
    for field in pairs(record) do
        assert(field == "app_id" or field == "image" or field == "name" or field == "enabled",
            "未知应用配置字段")
    end
    return { app_id = id, name = record.name or id, image = record.image, default_enabled = record.enabled ~= false }
end

function Deployment.discover(directory)
    local records, invalid = {}, {}
    directory = directory or config.app_center.catalog
    for filename in lfs.dir(directory) do
        local id = filename:match("^(.*)%.json$")
        if id then
            local ok, record = pcall(manifest, directory, filename)
            if ok then records[#records + 1] = record else
                invalid[id] = true
                log.failure("app_center", "manifest " .. filename, record)
            end
        end
    end
    return records, invalid
end

function Deployment.managed()
    local parent = config.app_center.state_path:match("^(.*)/") or "."
    local directory = parent .. "/managed"
    if lfs.attributes(directory, "mode") == "directory" then return Deployment.discover(directory) end
    return {}
end

function Deployment.manage(app, action)
    local command = string.format("python3 deploy/container.py %s '%s' '%s'", action, app.app_id, app.image)
    local process = assert(io.popen(command, "r"))
    local output = process:read("a")
    assert(process:close(), "容器操作失败 " .. app.app_id .. "/" .. action)
    return json.decode(output)
end

function Deployment.collect(center, app)
    local generation = app.generation
    local code, first, events = rpc.call(app.address, "events", generation, app.cursor, app.key)
    if app.generation ~= generation then return false end
    assert(code == codes.succ and type(events) == "table", "应用节点已断开")
    for index, event in ipairs(events) do
        local cursor = first + index - 1
        if cursor > app.cursor then
            if center.boot and skynet.now() - center.gateway_seen < 500 then
                local delivered, accepted = rpc.call(center.gateway, "publish", center.key, center.boot, app.app_id,
                    generation, event.username, event.body, event.connection, cursor)
                if delivered ~= codes.succ or not accepted or app.generation ~= generation then return false end
            elseif app.transition ~= "disabling" then
                return false
            end
            app.cursor = cursor
        end
    end
    return #events > 0
end

function Deployment.start(center, app)
    local started = Deployment.manage(app, "start")
    app.key, app.outdated = assert(started.key), started.outdated
    local deadline = skynet.now() + 1500
    while not app.address do
        assert(not center.freezing and skynet.now() < deadline, "等待应用注册超时")
        skynet.sleep(10)
    end
    app.enabled = true
end

function Deployment.stop(center, app)
    if app.address and not app.awaiting_exit then
        local code, last = rpc.call_no_timeout(app.address, "drain", app.generation, app.key)
        if code ~= codes.succ then
            assert(not Deployment.manage(app, "inspect").running, "运行中的应用未完成清理")
        else
            while app.cursor < last do
                if app.collecting then
                    skynet.sleep(1)
                else
                    app.collecting = true
                    local ok, busy = pcall(Deployment.collect, center, app)
                    app.collecting = false
                    assert(ok, busy)
                    if not busy then skynet.sleep(10) end
                end
            end
            local result, accepted = rpc.call(app.address, "finish", app.generation, app.key)
            assert(result == codes.succ and accepted, "应用节点未接受关闭")
            app.awaiting_exit = true
        end
    end
    Deployment.manage(app, app.awaiting_exit and "wait" or "stop")
    app.key, app.address, app.endpoint, app.generation = nil, nil, nil, nil
    app.count, app.enabled, app.awaiting_exit = 0, false, false
end

function Deployment.watch(center, app)
    skynet.fork(function()
        while not center.closed and center.apps[app.app_id] == app do
            if app.address and not app.collecting and not app.awaiting_exit then
                local generation = app.generation
                app.collecting = true
                local ok, busy = pcall(Deployment.collect, center, app)
                app.collecting = false
                if not ok and not app.changing and app.generation == generation then
                    log.failure("app_center", "events app=" .. app.app_id, busy)
                    app.address, app.endpoint, app.count, app.enabled = nil, nil, 0, false
                    app.transition = "unavailable"
                    center:_sync()
                end
                skynet.sleep(ok and busy and 1 or 10)
            else
                skynet.sleep(10)
            end
        end
    end)
end

return Deployment
