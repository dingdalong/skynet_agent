local skynet = require("skynet")
local json = require("cjson")
local config = require("etc.cfg")
local Frame = require("network.frame")
local rpc = require("rpc")
local error_code = require("error_code")
local log = require("log")
local Deployment = {}

local function container_process(app, action, mode)
    assert(Frame.valid_app(app.app_id), "应用 ID 无效")
    assert(type(app.image) == "string" and #app.image <= 255 and app.image:match("^[%w][%w./_:@%-]*$"),
        "镜像名称无效")
    local command = string.format("./deploy/container.lua %s '%s' '%s'", action, app.app_id, app.image)
    return assert(io.popen(command, mode))
end

function Deployment.manage(app, action)
    local process = container_process(app, action, "r")
    local output = process:read("a")
    assert(process:close(), "容器操作失败 " .. app.app_id .. "/" .. action)
    return json.decode(output)
end

function Deployment.collect(center, app)
    local generation = app.generation
    local code, first, events = rpc.call(app.address, "events", generation, app.cursor, app.key)
    if app.generation ~= generation then return false end
    assert(code == error_code.succ and type(events) == "table", "应用节点已断开")
    for index, event in ipairs(events) do
        local cursor = first + index - 1
        if cursor > app.cursor then
            if center.boot and skynet.now() - center.gateway_seen < 500 then
                local delivered, accepted = rpc.call(center.gateway, "publish", center.key, center.boot, app.app_id,
                    generation, event.username, event.body, event.connection, cursor)
                if delivered ~= error_code.succ or not accepted or app.generation ~= generation then return false end
            elseif app.transition ~= "disabling" then
                return false
            end
            app.cursor = cursor
        end
    end
    return #events > 0
end

function Deployment.start(center, app)
    local database = center.documents[app.app_id].database
    assert(database and database.state == "ready", "应用专属数据库未就绪")
    -- 密码只经过管道；容器注册密钥单独从受信任的 inspect 响应读取。
    local process = container_process(app, "start", "w")
    process:write(json.encode({
        host = config.database.host,
        port = config.database.port,
        name = database.name,
        username = database.username,
        password = database.password,
        authdb = config.app_center.user_authdb
    }))
    local ok, reason, status = process:close()
    app.outdated = reason == "exit" and status == 3
    assert(ok or app.outdated, "启动应用容器失败")
    app.key = assert(Deployment.manage(app, "inspect").key)
    local deadline = skynet.now() + 1500
    while not app.address do
        assert(not center.freezing and skynet.now() < deadline, "等待应用注册超时")
        skynet.sleep(10)
    end
    app.enabled = not app.outdated
end

function Deployment.stop(center, app)
    if app.address and not app.awaiting_exit then
        local code, last = rpc.call_no_timeout(app.address, "drain", app.generation, app.key)
        if code ~= error_code.succ then
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
            assert(result == error_code.succ and accepted, "应用节点未接受关闭")
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
