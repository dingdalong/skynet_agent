local skynet = require("skynet")
local socket = require("skynet.socket")
local websocket = require("http.websocket")
local Protocol = require("network.protocol")
local gateway = require("integration.gateway_socket")
local support = require("integration.support")

local M = {}

function M.run()
    local protocol = Protocol:new()
    protocol:init()
    local listener = assert(socket.listen("127.0.0.1", 18793))
    local clients, peers = {}, {}
    socket.start(listener, function(id)
        peers[id] = true
        skynet.fork(function()
            local ok, failure = websocket.accept(id, {
                message = function(peer, data)
                    local message_id, _, payload = protocol:decode_msg(data)
                    if payload.username == "close" then
                        websocket.close(peer, 1008, "expected")
                    elseif payload.username == "corrupt" then
                        websocket.write(peer, "\0\1", "binary")
                    elseif payload.username == "reply" then
                        websocket.write(peer, protocol:encode_msg(message_id, "LoginRes", { ret = 1 }), "binary")
                    end
                end,
                close = function(peer) peers[peer] = nil end,
                error = function(peer) peers[peer] = nil end,
            })
            peers[id] = nil
            assert(ok, failure)
        end)
    end)
    local function connect()
        local client = gateway.AgentSocket:new("ws://127.0.0.1:18793/agent")
        clients[#clients + 1] = client
        return client:connect()
    end
    local ok, failure = xpcall(function()
        local client = connect()
        client:send_request(client:allocate_message_id(), "LoginReq", { username = "reply" })
        support.until_true(function() return #client.events == 1 end, "响应未进入待消费队列")
        support.equal(client:wait_for(function(event) return event.message_id == 1 end).payload.ret, 1)
        local waited, error_message = pcall(client.wait_for, client, function() return false end, 2)
        support.equal(waited, false)
        support.contains(error_message, "超时")
        support.equal(client:request("LoginReq", { username = "reply" }).ret, 1,
            "超时后同一连接仍应能继续请求")
        client.next_message_id = 0xffffffff
        support.equal(client:allocate_message_id(), 0xffffffff)
        support.equal(pcall(client.allocate_message_id, client), false)
        client:close()
        client:close()
        local remote = connect()
        remote:send_request(1, "LoginReq", { username = "close" })
        local received = pcall(remote.wait_for, remote, function() return false end)
        support.equal(received, false, "远端关闭必须结束等待")
        support.equal(remote:wait_for_close(), 1008)
        local corrupt = connect()
        corrupt:send_request(1, "LoginReq", { username = "corrupt" })
        received = pcall(corrupt.wait_for, corrupt, function() return false end)
        support.equal(received, false, "响应解码失败必须结束等待")
        assert(corrupt.failure, "响应解码失败必须保留错误")
        support.until_true(function() return next(peers) == nil end, "探针连接未释放")
        print("Lua 探针支持测试通过：提前响应、超时恢复、编号边界、远端关闭与损坏响应")
    end, debug.traceback)
    for _, client in ipairs(clients) do client:close() end
    for id in pairs(peers) do websocket.close(id) end
    socket.close(listener)
    assert(ok, failure)
end

return M
