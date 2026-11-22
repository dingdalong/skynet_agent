local gateway = require("integration.gateway_socket")
local support = require("integration.support")
local status = require("agent.message_status")
local crypt = require("skynet.crypt")

local M = {}

local function last(session)
    return session.messages[#session.messages]
end

local function chat_flow(login)
    local client, snapshot, username = login()
    support.equal(#snapshot.chat_sessions, 0)
    local first = client:send_message(nil, "[e2e:success]")
    local session_id = first.id
    support.equal(last(first).content, "E2E 成功")
    support.equal(last(first).ret, 0, "成功消息不应携带错误码")
    client:send_message(session_id, "[e2e:history-set]")
    client:close()
    local restored, restored_snapshot = login(username)
    support.equal(restored_snapshot.user_id, snapshot.user_id)
    support.equal(#restored_snapshot.chat_sessions[1].session.messages, 4)
    support.equal(last(restored:send_message(session_id, "[e2e:history-check]")).content, "E2E 历史通过")
    local failed = restored:send_message(session_id, "[e2e:error]")
    support.equal(last(failed).status, status.failed)
    support.equal(last(failed).ret, 17)
    local retry = restored:request("AgentChatReq", { session_id = session_id, retry_run_id = last(failed).run_id })
    support.equal(#retry.chat_session.session.messages, #failed.messages)
    support.equal(last(retry.chat_session.session).id, last(failed).id)
    support.equal(last(restored:wait_run(retry.chat_session.session.run_id)).status, status.failed)
    support.equal(last(restored:send_message(session_id, "[e2e:stall]", 1000)).status, status.failed)
    support.equal(last(restored:send_message(session_id, "[e2e:success]")).content, "E2E 成功")
    restored:close()
end

local function multi_user_flow(login)
    local a, snapshot, username = login()
    local b, b_snapshot = login(username)
    local other = login()
    support.equal(#snapshot.chat_sessions, 0)
    support.equal(#b_snapshot.chat_sessions, 0)
    local ack = a:request("AgentChatReq", { text = "[e2e:slow]" })
    local session_id, run_id = ack.chat_session.session.id, ack.chat_session.session.run_id
    local started = b:wait_for(function(event)
        return event.name == "AgentSessionUpdatedNtf" and event.payload.chat_session.session.run_id == run_id
    end)
    support.equal(started.payload.chat_session.session.id, session_id)
    support.equal(b:request("AgentChatReq", { session_id = session_id, text = "竞争" }).ret, 4)
    support.equal(other:request("AgentMessageCancelReq", { session_id = session_id, run_id = run_id }).ret, 2)
    support.equal(last(b:send_message(nil, "[e2e:success]")).status, status.completed)
    support.equal(b:request("AgentMessageCancelReq", { session_id = session_id, run_id = run_id }).ret, 1)
    support.equal(last(a:wait_run(run_id)).status, status.cancelled)
    support.equal(last(b:wait_run(run_id)).status, status.cancelled)
    local offline = a:request("AgentChatReq", { session_id = session_id, text = "[e2e:slow]" })
    a:close()
    b:close()
    local restored, restored_snapshot = login(username)
    local state
    for _, item in ipairs(restored_snapshot.chat_sessions) do
        if item.session.id == session_id then state = item.session end
    end
    assert(state, "重连后会话丢失")
    local complete = state.run_id ~= "" and restored:wait_run(offline.chat_session.session.run_id) or state
    support.equal(last(complete).status, status.completed)
    support.equal(last(complete).content, "E2E 慢速完成")
    restored:close()
    support.equal(#other:request("AgentSnapshotReq").snapshot.chat_sessions, 0)
    other:close()
end

local function app_center_flow(login, config)
    local admin = login("app-center-owner")
    local reader = login("app-center-reader")
    local peer = login("app-center-owner")
    local observer = login("app-center-observer")
    local function agent_addresses()
        return support.console(18003, 'call .main "status"')
    end
    assert(agent_addresses():find(".agent_2", 1, true))
    local public = reader:request("AppCenterListReq")
    support.same(public.names, { "Agent", "应用中心" })
    support.equal(#(public.services or {}), 0)
    local change = { app_id = "agent", enabled = false }
    assert(reader:request("AppCenterSetReq", change).ret ~= 1)
    assert(admin:request("AppCenterUnlockReq", { token = "wrong" }).ret ~= 1)
    support.equal(admin:request("AppCenterUnlockReq", { token = "fixture-registry-token" }).ret, 1)
    support.equal(#admin:request("AppCenterListReq").services, 2)
    assert(peer:request("AppCenterSetReq", change).ret ~= 1)
    local active = reader:request("AgentChatReq", { text = "[e2e:header-stall]" }).chat_session.session
    support.equal(observer:request("AgentDesktopRegisterReq", {
        device_id = "desktop", name = "Desktop", authorization_id = "app-center-auth",
    }).ret, 1)
    local target = { device_id = "desktop", workspace_id = "workspace", directory = "/project", platform = "macos" }
    support.equal(observer:request("AgentChatReq", { execution_target = target, text = "[e2e:success]" }).ret, 1)
    local action = observer:wait_for(function(event) return event.name == "AgentExecutionActionNtf" end).payload
    local stopping = admin:allocate_message_id()
    admin:send_request(stopping, "AppCenterSetReq", change)
    observer:wait_for(function(event)
        return event.name == "AppCenterChangedNtf" and event.payload.app_id == "agent" and not event.payload.enabled
    end)
    local repeated = admin:allocate_message_id()
    admin:send_request(repeated, "AppCenterSetReq", change)
    assert(observer:request("AgentSnapshotReq").ret ~= 1)
    local receipt = { request_id = action.request_id, result = '{"ok":true,"project":{"workspace":"/project"}}' }
    support.equal(observer:request("AgentExecutionResultReq", receipt).ret, 1)
    for _, id in ipairs({ stopping, repeated }) do
        support.equal(admin:wait_for(function(event) return event.message_id == id end).payload.ret, 1)
    end
    assert(observer:request("AgentExecutionResultReq", receipt).ret ~= 1)
    support.equal(last(reader:wait_run(active.run_id)).status, status.cancelled)
    support.same(reader:request("AppCenterListReq").names, { "应用中心" })
    assert(peer:request("AgentSnapshotReq").ret ~= 1)
    assert(reader:request("AgentChatReq", { text = "已下线" }).ret ~= 1)
    support.equal(admin:request("AppCenterSetReq", change).ret, 1)
    assert(not pcall(agent_addresses))
    support.equal(admin:request("AppCenterListReq").services[1].instances, 0)
    change.enabled = true
    support.equal(admin:request("AppCenterSetReq", change).ret, 1)
    local current = agent_addresses()
    assert(current:find(".agent_2", 1, true))
    support.equal(admin:request("AppCenterSetReq", change).ret, 1)
    support.same(agent_addresses(), current)
    support.equal(#reader:request("AgentSnapshotReq").snapshot.chat_sessions, 0)
    support.equal(last(reader:send_message(nil, "[e2e:success]")).status, status.completed)
    change.enabled = false
    support.equal(admin:request("AppCenterSetReq", change).ret, 1)
    support.control(config, "stop")
end

local function protocol_flow(connect)
    local function rejected(payload, code, format)
        local client = connect()
        client:send_frame(payload, format)
        support.equal(client:wait_for_close(), code)
    end
    rejected("invalid", 1003, "text")
    rejected("\0\1", 1007)
    local temporary = connect()
    local compressed = temporary.protocol:encode_msg(1, "LoginReq", { username = "alice" })
    temporary:close()
    rejected("\255" .. compressed:sub(2), 1007)
    rejected(string.rep("\0", 256 * 1024 + 1), 1006)
    local empty = connect()
    support.equal(empty:request("LoginReq", { username = "" }).ret, 12)
    support.equal(empty:wait_for_close(), 1008)
    local prelogin = connect()
    prelogin:send_request(1, "AgentChatReq")
    support.equal(prelogin:wait_for(function(event) return event.name == "RoutingError" end).payload.ret, 12)
    support.equal(prelogin:wait_for_close(), 1008)
    local ordered = connect()
    ordered:send_request(1, "LoginReq", { username = "ordered-" .. crypt.hexencode(crypt.randomkey()) })
    ordered:send_request(2, "AgentChatReq", { text = "[e2e:success]" })
    support.equal(ordered:wait_for(function(event) return event.message_id == 1 end).payload.ret, 1)
    support.equal(ordered:wait_for(function(event) return event.message_id == 2 end).payload.ret, 1)
    ordered:send_request(3, "LoginReq", { username = "second" })
    support.equal(ordered:wait_for_close(), 1008)
end

local function desktop_flow(login)
    local desktop, _, username = login()
    local phone = login(username)
    support.equal(desktop:request("AgentDesktopRegisterReq", {
        device_id = "desktop", name = "Desktop", authorization_id = "desktop-auth",
    }).ret, 1)
    local target = { device_id = "desktop", workspace_id = "workspace", directory = "/project", platform = "macos" }
    local args = { execution_target = target, text = "[e2e:success]" }
    support.equal(phone:request("AgentChatReq", args).ret, 12)
    local accepted = desktop:request("AgentChatReq", args)
    support.equal(accepted.ret, 1)
    local action = desktop:wait_for(function(event) return event.name == "AgentExecutionActionNtf" end).payload
    support.equal(action.operation, "project")
    support.equal(action.authorization_id, "desktop-auth")
    local result = { request_id = action.request_id, result = '{"ok":true,"project":{"workspace":"/project"}}' }
    support.equal(phone:request("AgentExecutionResultReq", result).ret, 2)
    support.equal(desktop:request("AgentExecutionResultReq", result).ret, 1)
    local complete = phone:wait_run(accepted.chat_session.session.run_id)
    support.equal(last(complete).content, "E2E 成功")
    for _, event in ipairs(phone.events) do assert(event.name ~= "AgentExecutionActionNtf") end
    desktop:close()
    phone:wait_for(function(event)
        return event.name == "AgentDesktopUpdatedNtf" and not event.payload.device.online
    end)
    phone:close()
end

function M.run(config)
    local clients = {}
    local function connect()
        local client = gateway.AgentSocket:new(config.gateway_url)
        clients[#clients + 1] = client
        return client:connect()
    end
    local function login(username)
        local client, snapshot, name = gateway.login(config.gateway_url, username)
        clients[#clients + 1] = client
        return client, snapshot, name
    end
    local ok, failure = xpcall(function()
        if config.mode == "approve_agent" then
            local admin = connect()
            support.equal(admin:request("LoginReq", { username = "fixture-reviewer" }).ret, 1)
            local token = assert(os.getenv("APP_CENTER_ADMIN_TOKEN"))
            support.equal(admin:request("AppCenterUnlockReq", { token = token }).ret, 1)
            local request_id = assert(os.getenv("AGENT_TEST_REQUEST_ID"))
            support.equal(admin:request("AppCenterReviewReq", {
                app_id = "agent", request_id = request_id, approve = true,
            }).ret, 1)
            support.equal(admin:request("AgentSnapshotReq").ret, 1)
            return
        end
        if config.mode == "ready" or config.mode == "directory_ready" then
            local ready = connect()
            support.equal(ready:request("LoginReq", { username = "readiness" }).ret, 1)
            if config.mode == "ready" then
                support.equal(ready:request("AgentSnapshotReq").ret, 1)
            else
                support.equal(ready:request("AppCenterUnlockReq", { token = "fixture-registry-token" }).ret, 1)
                support.equal(#ready:request("AppCenterListReq").services, 2)
            end
            return
        end
        if config.mode == "offline_restart" then
            local admin = connect()
            support.equal(admin:request("LoginReq", { username = "app-center-owner" }).ret, 1)
            support.same(admin:request("AppCenterListReq").names, { "应用中心" })
            assert(admin:request("AgentSnapshotReq").ret ~= 1)
            local file <close> = assert(io.open(config.server_log))
            assert(not file:read("a"):find("LAUNCH snlua agent", 1, true), "已下线的 Agent 在重启时被创建")
            support.equal(admin:request("AppCenterUnlockReq", { token = "fixture-registry-token" }).ret, 1)
            support.equal(admin:request("AppCenterListReq").services[1].instances, 0)
            support.equal(admin:request("AppCenterSetReq", { app_id = "agent", enabled = true }).ret, 1)
            support.equal(admin:request("AppCenterListReq").services[1].instances, 2)
            support.equal(#admin:request("AgentSnapshotReq").snapshot.chat_sessions, 0)
            print("真实节点重启后保持零实例，重新上线按配置注册成功")
            return
        end
        if config.mode == "live" then
            local client, snapshot, username = login()
            local session = client:send_message(nil, config.live_prompt, 12000)
            local result = last(session)
            support.equal(result.status, status.completed, "真实模型未成功完成")
            support.equal(result.ret, 0, "成功消息不应携带错误码")
            assert(result.content ~= "", "真实模型未返回内容")
            client:close()
            local _, restored = login(username)
            support.equal(restored.user_id, snapshot.user_id)
            support.equal(restored.chat_sessions[1].session.id, session.id)
            support.equal(last(restored.chat_sessions[1].session).content, result.content)
            local other, independent = login()
            support.equal(#independent.chat_sessions, 0)
            support.equal(other:request("AgentMessageCancelReq", {
                session_id = session.id, run_id = result.run_id,
            }).ret, 2)
            print(result.content)
            return
        end
        protocol_flow(connect)
        chat_flow(login)
        multi_user_flow(login)
        desktop_flow(login)
        app_center_flow(login, config)
        print("网关测试通过：用户路由、离线恢复、多端同步、并发、" ..
            "上下文、取消、重试与协议边界")
    end, debug.traceback)
    for _, client in ipairs(clients) do client:close() end
    assert(ok, failure)
end

return M
