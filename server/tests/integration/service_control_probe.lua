local gateway = require("integration.gateway_socket")
local support = require("integration.support")
local filesystem = require("agent_filesystem")

local M = {}

function M.run(config)
    local clients = {}
    local function connect()
        local client = gateway.AgentSocket:new(config.gateway_url)
        clients[#clients + 1] = client
        return client:connect()
    end
    local function login(username)
        local client, snapshot = gateway.login(config.gateway_url, username)
        clients[#clients + 1] = client
        support.equal(#snapshot.chat_sessions, 0)
        return client
    end
    local function agents(status)
        local addresses = {}
        for index, address in status:gmatch("%.agent_(%d+) (:%x+) ready") do
            addresses[tonumber(index)] = address
        end
        return addresses
    end
    local ok, failure = xpcall(function()
        local output = support.control(config, "status", 500)
        for _, name in ipairs({
            "client_1", "client_2", "logind_1", "logind_2", "websocket_1", "websocket_2", "gateway",
        }) do
            assert(output:match("%." .. name .. " :[%da-f]+ ready"), output)
        end
        support.contains(output, "<CMD OK>")
        assert(output:match("%.database :[%da-f]+ ready"), output)
        local app_status = support.console(18003, 'call .main "status"')
        assert(app_status:match("%.database :[%da-f]+ ready"), app_status)
        local center_status = support.console(18004, 'call .main "status"')
        assert(center_status:match("%.database :[%da-f]+ ready"), center_status)
        -- 使用与驱动字段同名的集合，验证节点隔离、条件更新和连接复用。
        local function database(port, args)
            return support.console(port, 'call .database ' .. args)
        end
        local insert = '"insert", "name", { _id = "shared", version = 1 }'
        support.contains(database(18004, insert), "2\t1")
        local app_read = database(18003, '"find_one", "name", { _id = "shared" }')
        support.contains(app_read, "1\t1")
        support.excludes(app_read, "version:")
        support.contains(database(18003, insert), "2\t1")
        local replace = '"replace_one", "name", { _id = "shared", version = 1 }, { _id = "shared", version = 2 }'
        support.contains(database(18003, replace), "2\t1")
        support.contains(database(18003, replace), "2\t0")
        support.contains(database(18004, '"find_one", "name", { _id = "shared" }'), "version:1")
        local initial = agents(app_status)
        support.equal(#initial, 2)
        local idle = connect()
        support.equal(idle:request("LoginReq", { username = "control-stream" }).ret, 1)
        local streaming = login("control-stream")
        support.equal(idle:request("AgentSnapshotReq").ret, 1)
        local saved = streaming:send_message(nil, "[e2e:history-set]")
        support.equal(saved.messages[#saved.messages].content, "E2E 历史已保存")
        local script = assert(filesystem.realpath("tests/fixtures/hotfix/client_runtime.lua"))
        support.contains(support.console(config.control_port, "inject .main " .. script), "CLIENT_HOTFIX_OK")
        support.contains(support.console(18003, "inject .main " .. script), "CLIENT_HOTFIX_OK")
        local selected = streaming:request("AgentSessionHistoryReq", { session_id = saved.id })
        support.equal(selected.ret, 1)
        support.equal(#selected.chat_session.session.messages, 2)
        support.equal(selected.chat_session.session.messages[2].content, "E2E 历史已保存")
        local history = streaming:send_message(saved.id, "[e2e:history-check]")
        support.equal(history.messages[#history.messages].content, "E2E 历史通过")
        streaming:request("AgentChatReq", { session_id = saved.id, text = "[e2e:stall]" })
        streaming:wait_for(function(event)
            return event.name == "AgentMessageDeltaNtf" and event.payload.delta ~= ""
        end)
        local header_waiting = login("control-peer")
        assert(header_waiting:request("AgentChatReq", { session_id = saved.id, text = "跨用户" }).ret ~= 1)
        header_waiting:request("AgentChatReq", { text = "[e2e:header-stall]" })
        support.same(agents(support.console(18003, 'call .main "status"')), initial)
        support.until_true(function() return support.health(config.model_url).active_requests == 2 end,
            "关服前必须已有流读取和响应头等待中的模型 HTTP 请求")
        support.control(config, "stop")
        for _, client in ipairs({ idle, streaming, header_waiting }) do
            support.equal(client:wait_for_close(), 1001)
        end
        support.until_true(function() return support.health(config.model_url).active_requests == 0 end,
            "退出前必须释放上游模型连接")
        support.equal(support.health(config.model_url).cancelled_requests, 2, "两个未完成请求都应关闭连接")
        print("服务控制、存量历史热修、关闭码与上游连接回收测试通过")
    end, debug.traceback)
    for _, client in ipairs(clients) do client:close() end
    assert(ok, failure)
end

return M
