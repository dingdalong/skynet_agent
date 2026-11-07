local skynet = require("skynet.manager")
local rpc = require("rpc")
local codes = require("enum.error_code")

local mode = os.getenv("SHUTDOWN_TEST_MODE") or "normal"
local port = tonumber(os.getenv("SHUTDOWN_TEST_CONTROL_PORT")) or 18002
package.loaded["etc.cfg"] = {
    channel = "test",
    runtime = { control_port = port },
    protocol = { agent_gateway_schema_dir = "unused" },
    agent_gateway = { instance = { client = 1, logind = 0, websocket = 0 } },
}
local node = require("node")
skynet.init(function()
    -- 仅供测试防挂死，不参与生产生命周期。
    skynet.timeout(1500, function() os.exit(99) end)
end)

if mode == "startup_slow" or mode == "startup_wait" then
    package.loaded["helper.protobuf"] = { load = function() end }
    dofile("src/main.lua")
else
    local login_started, login_completed = false, false
    local dispatch = skynet.dispatch
    skynet.dispatch = function(protocol, callback)
        skynet.dispatch = dispatch
        dispatch(protocol, function(session, source, command, ...)
            if command == "login_started" then
                login_started = true
                return
            end
            if mode == "login" and (command == "bind_client" or command == "send_response"
                or command == "close_connection") then
                skynet.retpack(codes.succ, true)
                return
            end
            callback(session, source, command, ...)
        end)
    end
    node.init(function(instance)
        local modes = mode == "login" and { "login" } or { "normal", mode }
        for index, value in ipairs(modes) do
            instance:launch("shutdown_worker", 1, { mode = value, observer = skynet.self() },
                string.format(".shutdown_worker_%d", index))
        end
        if mode == "login" then
            local logind = instance:launch("logind", 1, { client_services = { instance.services[2].address } })[1]
            skynet.fork(function()
                local code, handled = rpc.call(
                    logind, "handle_request", "login", 1, "LoginReq", { username = "shutdown" }
                )
                assert(code == codes.succ and handled)
                login_completed = true
            end)
            while not login_started do
                skynet.sleep(1)
            end
        end
        skynet.fork(function()
            if mode == "force_ready" or mode == "closing_wait" then
                io.stderr:write("SHUTDOWN_FIXTURE_READY\n")
                io.stderr:flush()
                return
            end
            assert(instance:close() == (mode ~= "failure"))
            assert(instance.services[2].closed)
            if mode == "login" then
                assert(login_completed, "关闭必须等待在途登录完成")
            end
            io.stderr:write("SHUTDOWN_FIXTURE_FINISHED " .. mode .. "\n")
            io.stderr:flush()
            instance:shutdown({})
            instance:shutdown({})
        end)
    end)
end
