local gateway = require("integration.gateway_socket")
local support = require("integration.support")
local filesystem = require("agent_filesystem")

local M = {}

local function replace(source, needle, value)
    local first, last = source:find(needle, 1, true)
    assert(first, "找不到测试修改入口: " .. needle)
    return source:sub(1, first - 1) .. value .. source:sub(last + 1)
end

local function marked(source, signature, marker, handler)
    return replace(source, signature, signature .. "\n    " ..
        (handler and 'local skynet = require("skynet")\n    ' or "") ..
        'skynet.error("' .. marker .. '", skynet.address(skynet.self()))')
end

local function marker_count(log, marker)
    local addresses, count = {}, 0
    for address in log:gmatch(marker .. "%s+(:[%da-f]+)") do
        if not addresses[address] then addresses[address], count = true, count + 1 end
    end
    return count
end

local function updated_files(summary)
    local files = {}
    for path in assert(summary:match("files=([^ ]*)"), summary):gmatch("[^,]+") do
        files[#files + 1] = path
    end
    return files
end

function M.run(config)
    assert(config.server_log, "自动热修测试缺少隔离日志")
    assert(filesystem.realpath(config.server_root) ~= filesystem.realpath("."),
        "自动热修测试只能修改独立源码副本")
    local connections = {}
    local logfile = config.server_log
    local function log(offset) return support.read(logfile):sub((offset or 0) + 1) end
    local function offset() return #log() end
    local function source(path) return support.read(config.server_root .. "/" .. path) end
    local function save_batch(files, expected)
        local start = offset()
        for _, file in ipairs(files) do support.write(config.server_root .. "/" .. file[1], file[2]) end
        support.until_true(function() return log(start):find("[hotfix_watch] reload ", 1, true) end,
            "保存源码后未自动完成热修批次")
        local batch, summaries = log(start), {}
        for line in batch:gmatch("[^\n]+") do
            if line:find("[hotfix_watch] reload ", 1, true) then summaries[#summaries + 1] = line end
        end
        support.equal(#summaries, 1, "每个批次只应输出一次节点结果")
        support.contains(summaries[1], expected or "已更新")
        support.excludes(batch, "[hotfix]")
        return summaries[1]
    end
    local function markers(start, expected, message)
        support.until_true(function()
            local current = log(start)
            for marker, count in pairs(expected) do
                if marker_count(current, marker) ~= count then return false end
            end
            return true
        end, message or "存量连接未调用预期热修方法")
    end
    local function snapshots()
        for _, connection in ipairs(connections) do
            support.equal(connection.client:request("AgentSnapshotReq").ret, 1)
        end
    end
    local ok, failure = xpcall(function()
        support.until_true(function() return log():find("监听源码", 1, true) end,
            "develop 节点未建立监听基线")
        -- 固定用户名覆盖两个 client 哈希桶；四条连接同时覆盖两个 WebSocket 实例。
        for index = 1, 4 do
            local client, snapshot = gateway.login(config.gateway_url, "hotfix-" .. index)
            local connection = { client = client, user_id = snapshot.user_id, session_id = nil }
            connections[#connections + 1] = connection
            support.equal(#snapshot.chat_sessions, 0)
        end
        for _, connection in ipairs(connections) do
            local session = connection.client:send_message(nil, "[e2e:history-set]")
            support.equal(session.messages[#session.messages].content, "E2E 历史已保存")
            connection.session_id = session.id
        end

        local ws_path, client_path = "src/service/websocket/websocket.lua", "src/service/client/client.lua"
        local ws_source, client_source = source(ws_path), source(client_path)
        local ws_signature = "function Websocket:_handle_message(connection, message, message_type)"
        local client_signature = "function ClientService:handle_request(context, id, message_id, app_id, body)"
        local ws_v2 = marked(ws_source, ws_signature, "AUTO_WS_V2")
        local client_v2 = marked(client_source, client_signature, "AUTO_CLIENT_V2", true)
        support.same(updated_files(save_batch({ { ws_path, ws_v2 }, { client_path, client_v2 } })),
            { client_path, ws_path })
        for _, connection in ipairs(connections) do
            local selected = connection.client:request("AgentSnapshotReq", { session_id = connection.session_id })
            support.equal(selected.ret, 1)
            support.equal(#selected.snapshot.chat_sessions[1].session.messages, 2)
            support.equal(selected.snapshot.chat_sessions[1].session.messages[2].content, "E2E 历史已保存")
            local session = connection.client:send_message(connection.session_id, "[e2e:history-check]")
            support.equal(session.messages[#session.messages].content, "E2E 历史通过")
        end
        markers(0, { AUTO_WS_V2 = 2, AUTO_CLIENT_V2 = 2 })

        local protocol_path = "src/lualib/network/frame.lua"
        local protocol_v2 = 'local skynet = require("skynet")\n' ..
            marked(source(protocol_path), "function Frame.unpack(data)", "AUTO_PROTOCOL_V2")
        local client_v3 = marked(client_source, client_signature, "AUTO_CLIENT_V3", true)
        local failed = save_batch({
            { ws_path, ws_v2 .. "\nsyntax error\n" },
            { client_path, client_v3 }, { protocol_path, protocol_v2 },
        }, "预检查失败")
        support.contains(failed, ws_path)
        local start = offset()
        snapshots()
        markers(start, { AUTO_WS_V2 = 2, AUTO_CLIENT_V2 = 2 }, "语法失败批次未保留旧实现")
        support.excludes(log(start), "AUTO_PROTOCOL_V2")
        support.excludes(log(start), "AUTO_CLIENT_V3")
        local recovered = save_batch({ { ws_path, marked(ws_source, ws_signature, "AUTO_WS_V3") } })
        support.same(updated_files(recovered), { protocol_path, client_path, ws_path })
        start = offset()
        for _, connection in ipairs(connections) do
            local snapshot = connection.client:request("AgentSnapshotReq").snapshot
            support.equal(#snapshot.chat_sessions[1].session.messages, 4)
        end
        markers(start, { AUTO_WS_V3 = 2, AUTO_PROTOCOL_V2 = 2, AUTO_CLIENT_V3 = 2 },
            "修正语法后未重试完整批次")

        local ws_v4 = marked(ws_source, ws_signature, "AUTO_WS_V4")
        local protocol_v3 = replace(protocol_v2, "AUTO_PROTOCOL_V2", "AUTO_PROTOCOL_V3")
        local execution_failure = save_batch({
            { ws_path, replace(ws_v4, "return Websocket", 'error("AUTO_WS_CANDIDATE_ERROR")\nreturn Websocket') },
            { protocol_path, protocol_v3 },
        }, "部分更新")
        for _, name in ipairs({ "websocket_1", "websocket_2" }) do
            assert(execution_failure:match("%." .. name .. ":.*AUTO_WS_CANDIDATE_ERROR"), execution_failure)
        end
        start = offset()
        snapshots()
        markers(start, { AUTO_WS_V3 = 2 }, "模块执行失败后未保留旧方法")
        support.excludes(log(start), "AUTO_WS_V4")
        support.excludes(log(start), "AUTO_PROTOCOL_V3")
        support.same(updated_files(save_batch({ { ws_path, ws_v4 } })), { protocol_path, ws_path })
        start = offset()
        snapshots()
        markers(start, { AUTO_WS_V4 = 2, AUTO_PROTOCOL_V3 = 2 }, "模块执行错误修正后未恢复整个批次")

        local node_path, rpc_path = "src/lualib/base/node.lua", "src/lualib/base/rpc.lua"
        local node_source, rpc_source = source(node_path), source(rpc_path)
        local rpc_signature = "function Rpc.send(address, command, ...)"
        local rpc_v2 = marked(rpc_source, rpc_signature, "AUTO_RPC_V2")
        local client_v4 = marked(client_source, client_signature, "AUTO_CLIENT_V4", true)
        local incompatible = save_batch({
            { rpc_path, rpc_v2 },
            { client_path, replace(client_v4, "return ClientService",
                'ClientService.commands.extra = "extra"\nreturn ClientService') },
        }, "部分更新")
        support.same(updated_files(incompatible), { rpc_path })
        for _, name in ipairs({ "client_1", "client_2" }) do
            assert(incompatible:match("%." .. name .. ":.*不能新增字段"), incompatible)
        end
        start = offset()
        snapshots()
        markers(start, { AUTO_CLIENT_V3 = 2, AUTO_RPC_V2 = 2 })
        support.excludes(log(start), "AUTO_CLIENT_V4")
        support.same(updated_files(save_batch({ { client_path, client_v4 } })), { rpc_path, client_path })
        start = offset()
        snapshots()
        markers(start, { AUTO_CLIENT_V4 = 2, AUTO_RPC_V2 = 4 }, "兼容性错误修正后未重试完整批次")

        local shared = save_batch({
            { node_path, marked(node_source, "function Node:status()", "AUTO_NODE_V2") },
            { rpc_path, marked(rpc_source, rpc_signature, "AUTO_RPC_V3") },
        })
        support.same(updated_files(shared), { node_path, rpc_path })
        start = offset()
        assert(support.console(config.control_port, 'call .main "status"'):match("%.gateway .*ready"))
        snapshots()
        markers(start, { AUTO_NODE_V2 = 1, AUTO_RPC_V3 = 4 }, "主节点和共享基础模块未自动更新")

        local before = {}
        for _, connection in ipairs(connections) do
            local snapshot = connection.client:request("AgentSnapshotReq").snapshot
            support.equal(snapshot.user_id, connection.user_id)
            support.equal(snapshot.chat_sessions[1].session.id, connection.session_id)
            before[connection] = snapshot
        end
        local chat_path = "src/service/app/agent/handler.lua"
        local chat_source = source(chat_path)
        local handlers = {
            { "AgentSnapshotReq", "AUTO_AGENT_SNAPSHOT_V2", "" },
            { "AgentChatReq", "AUTO_CHAT_REQUEST_V2", "args, connection" },
            { "AgentMessageCancelReq", "AUTO_CHAT_CANCEL_V2", "args" },
            { "AgentSessionModelSetReq", "AUTO_CHAT_MODEL_V2", "args" },
        }
        for _, handler in ipairs(handlers) do
            chat_source = marked(chat_source, "function REQUEST:" .. handler[1] .. "(" .. handler[3] .. ")",
                handler[2], true)
        end
        local agent_path = "src/service/app/agent/init.lua"
        local agent_source = marked(source(agent_path),
            "function AgentService:handle_request(context, identity, id, name, args, draining)",
            "AUTO_AGENT_SERVICE_V2")
        local user_path = "src/service/client/user.lua"
        local user_source = marked(source(user_path), "function User:ctor(identity)", "AUTO_CLIENT_USER_V2", true)
        support.same(updated_files(save_batch({ { user_path, user_source } })), { user_path })
        start = offset()
        for index = 1, 2 do
            local new_client = gateway.login(config.gateway_url, "hotfix-new-" .. index)
            new_client:close()
        end
        markers(start, { AUTO_CLIENT_USER_V2 = 2 }, "两个 client 实例未使用热修后的用户构造函数")
        logfile = assert(config.app_log)
        local handler_batch = save_batch({ { chat_path, chat_source }, { agent_path, agent_source } })
        support.same(updated_files(handler_batch), { chat_path, agent_path })
        start = offset()
        for _, connection in ipairs(connections) do
            local client = connection.client
            local response = client:request("AgentSnapshotReq")
            support.equal(response.ret, 1)
            support.equal(response.snapshot.user_id, connection.user_id)
            support.same(response.snapshot, before[connection])
            local session = client:send_message(connection.session_id, "[e2e:history-check]")
            local previous = before[connection].chat_sessions[1].session
            support.equal(session.id, connection.session_id)
            support.equal(#session.messages, #previous.messages + 2)
            for index, message in ipairs(previous.messages) do support.same(session.messages[index], message) end
            support.equal(session.messages[#session.messages].content, "E2E 历史通过")
            local switched = client:request("AgentSessionModelSetReq", {
                session_id = session.id, model_id = response.snapshot.default_model_id,
            })
            support.equal(switched.ret, 1)
            support.equal(switched.chat_session.session.id, session.id)
            support.equal(client:request("AgentMessageCancelReq", {
                session_id = session.id, run_id = session.messages[#session.messages].run_id,
            }).ret, 1)
        end
        markers(start, {
            AUTO_AGENT_SERVICE_V2 = 2, AUTO_AGENT_SNAPSHOT_V2 = 2, AUTO_CHAT_REQUEST_V2 = 2,
            AUTO_CHAT_CANCEL_V2 = 2, AUTO_CHAT_MODEL_V2 = 2,
        }, "四个用户应在两个常驻 Agent 实例中调用热修后的服务与 REQUEST 方法")
        support.control(config, "stop")
        for _, connection in ipairs(connections) do support.equal(connection.client:wait_for_close(), 1001) end
        print("自动热修测试通过：预检查、单次日志、多实例、存量历史、" ..
            "REQUEST 方法、失败恢复与关服")
    end, debug.traceback)
    for _, connection in ipairs(connections) do connection.client:close() end
    assert(ok, failure)
end

return M
