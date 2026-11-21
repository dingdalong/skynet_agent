local cluster = require("skynet.cluster")
local skynet = require("skynet")
local http = require("http.httpc")
local json = require("cjson")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local Pool = require("helper.service_pool")
local log = require("log")
local Deployment = {}

local function manage(method, path)
    local status, body = http.request(method, config.app_center.deployer, path, {}, {}, method == "POST" and "" or nil)
    assert(status == 200, "部署服务调用失败 " .. path .. " HTTP " .. tostring(status))
    return json.decode(body)
end

function Deployment.discover()
    http.timeout = 2500
    return manage("GET", "/apps")
end

function Deployment.collect(center, app)
    local generation = app.generation
    local code, first, events = rpc.call(app.address, "events", generation, app.cursor)
    if app.generation ~= generation then return false end
    assert(code == codes.succ and type(events) == "table", "应用节点已断开")
    for index, event in ipairs(events) do
        local cursor = first + index - 1
        if cursor > app.cursor then
            local slot = Pool.slot(event.username, config.agent_gateway.instance.client)
            local target = skynet.localname(".client_" .. slot)
            if target and center.clients[target] then
                assert(rpc.call(target, "publish", app.app_id, generation, event.username,
                    event.body, event.connection, cursor) == codes.succ, "应用通知投递失败")
            end
            if app.generation ~= generation then return false end
            app.cursor = cursor
        end
    end
    return #events > 0
end

local function attach(center, app)
    cluster.reload({ [app.service] = app.service .. ":18082" })
    local deadline = skynet.now() + 1500
    repeat
        local ok, address = pcall(cluster.proxy, app.service, "@application")
        if ok then
            local code, id, generation, count, cursor = rpc.call(address, "hello")
            if code == codes.succ then
                assert(id == app.app_id and type(generation) == "string" and count > 0, "应用握手无效")
                if generation ~= app.generation then app.cursor = cursor end
                app.address, app.generation, app.count = address, generation, count
                return
            end
        end
        skynet.sleep(20)
    until center.closed or skynet.now() >= deadline
    error("应用启动等待就绪超时")
end

function Deployment.start(center, app)
    manage("POST", "/apps/" .. app.app_id .. "/start")
    attach(center, app)
    app.enabled = true
end

function Deployment.stop(center, app)
    if not app.address and not app.awaiting_exit then
        for _, record in ipairs(Deployment.discover()) do
            if record.app_id == app.app_id and record.running then
                attach(center, app)
                center:_sync(true)
                break
            end
        end
    end
    if app.address and not app.awaiting_exit then
        local code, last = rpc.call_no_timeout(app.address, "drain", app.generation)
        if code ~= codes.succ then
            for _, record in ipairs(Deployment.discover()) do
                assert(record.app_id ~= app.app_id or not record.running, "运行中的应用未完成清理")
            end
        else
            while app.cursor < last do
                if app.collecting then
                    skynet.sleep(1)
                else
                    app.collecting = true
                    local ok, err = pcall(Deployment.collect, center, app)
                    app.collecting = false
                    assert(ok, err)
                end
            end
            local finished, accepted = rpc.call(app.address, "finish", app.generation)
            assert(finished == codes.succ and accepted, "应用节点未接受关闭")
            app.awaiting_exit = true
        end
    end
    local action = app.awaiting_exit and "/wait" or "/stop"
    local result = manage("POST", "/apps/" .. app.app_id .. action)
    app.awaiting_exit = false
    app.address, app.generation, app.count, app.enabled = nil, nil, 0, false
    assert(action ~= "/wait" or result.exit_code == 0, "应用节点清理失败")
end

function Deployment.watch(center, app)
    skynet.fork(function()
        while not center.closed and center.apps[app.app_id] == app do
            if app.address and not app.collecting and not app.awaiting_exit then
                app.collecting = true
                local ok, busy = pcall(Deployment.collect, center, app)
                app.collecting = false
                if not ok and not center.changing then
                    log.failure("app_center", "events app=" .. app.app_id, busy)
                    app.address, app.count, app.enabled = nil, 0, false
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
