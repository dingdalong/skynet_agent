local gateway = require("integration.gateway_socket")
local support = require("integration.support")
local status = require("enum.message_status")
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
    local retry = restored:request("ChatReq", { session_id = session_id, retry_run_id = last(failed).run_id })
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
    local ack = a:request("ChatReq", { text = "[e2e:slow]" })
    local session_id, run_id = ack.chat_session.session.id, ack.chat_session.session.run_id
    local started = b:wait_for(function(event)
        return event.name == "SessionUpdatedNtf" and event.payload.chat_session.session.run_id == run_id
    end)
    support.equal(started.payload.chat_session.session.id, session_id)
    support.equal(b:request("ChatReq", { session_id = session_id, text = "竞争" }).ret, 4)
    support.equal(other:request("MessageCancelReq", { session_id = session_id, run_id = run_id }).ret, 2)
    support.equal(last(b:send_message(nil, "[e2e:success]")).status, status.completed)
    support.equal(b:request("MessageCancelReq", { session_id = session_id, run_id = run_id }).ret, 1)
    support.equal(last(a:wait_run(run_id)).status, status.cancelled)
    support.equal(last(b:wait_run(run_id)).status, status.cancelled)
    local offline = a:request("ChatReq", { session_id = session_id, text = "[e2e:slow]" })
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
    support.equal(#other:request("UserSnapshotReq").snapshot.chat_sessions, 0)
    other:close()
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
    rejected("\1" .. compressed:sub(2), 1007)
    rejected(string.rep("\0", 256 * 1024 + 1), 1006)
    local empty = connect()
    support.equal(empty:request("LoginReq", { username = "" }).ret, 12)
    support.equal(empty:wait_for_close(), 1008)
    local prelogin = connect()
    prelogin:send_request(1, "ChatReq")
    support.equal(prelogin:wait_for(function(event) return event.name == "LoginRes" end).payload.ret, 12)
    support.equal(prelogin:wait_for_close(), 1008)
    local ordered = connect()
    ordered:send_request(1, "LoginReq", { username = "ordered-" .. crypt.hexencode(crypt.randomkey()) })
    ordered:send_request(2, "ChatReq", { text = "[e2e:success]" })
    support.equal(ordered:wait_for(function(event) return event.message_id == 1 end).payload.ret, 1)
    support.equal(ordered:wait_for(function(event) return event.message_id == 2 end).payload.ret, 1)
    ordered:send_request(3, "LoginReq", { username = "second" })
    support.equal(ordered:wait_for_close(), 1008)
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
        if config.mode == "ready" then login():close(); return end
        if config.mode == "live" then
            local client = login()
            local result = last(client:send_message(nil, config.live_prompt, 12000))
            support.equal(result.status, status.completed, "真实模型未成功完成")
            support.equal(result.ret, 0, "成功消息不应携带错误码")
            assert(result.content ~= "", "真实模型未返回内容")
            print(result.content)
            return
        end
        protocol_flow(connect)
        chat_flow(login)
        multi_user_flow(login)
        print("网关测试通过：用户路由、离线恢复、多端同步、并发、" ..
            "上下文、取消、重试与协议边界")
    end, debug.traceback)
    for _, client in ipairs(clients) do client:close() end
    assert(ok, failure)
end

return M
