local Scope = require("tests.support.modules")
local error_code = require("error_code")
local hash = require("helper.hash")
local protobuf = require("helper.protobuf")
local Protocol = require("tests.support.wire_protocol")

protobuf.load("../common/proto")
local codec = Protocol:new()
codec:init()
local login = codec:encode_body("LoginRes", { ret = 1 })

describe("websocket", function()
    local scope, instance, handles, timers, sent, writes, closed, call, fail_write, wait_write, next_id, raw_closed
    local function accept(fd)
        local co = coroutine.create(function() instance:accept({}, fd, "local", 20) end)
        assert.same({ true, "accepting" }, { coroutine.resume(co) })
        handles[fd].handshake(fd, {}, "/agent")
        return instance.connections[instance.fds[fd]], co
    end
    local function message(fd, id, name)
        handles[fd].message(fd, codec:encode_msg(id, name or "LoginReq", {}), "binary")
    end
    before_each(function()
        handles, timers, sent, writes, closed = {}, {}, {}, {}, {}
        raw_closed = {}
        fail_write, wait_write, next_id = false, false, 0
        call = function() return error_code.succ, true end
        scope = Scope.new({
            ["skynet.crypt"] = { randomkey = function() return "salt" end, hexencode = tostring },
            ["websocket"] = false,
            ["log"] = false,
            ["etc.cfg"] = {
                agent_gateway = {
                    socket = { path = "/agent", max_message_bytes = 200000 }, login_timeout_ticks = 1000,
                }
            },
            skynet = {
                error = function() end,
                self = function() return 10 end,
                genid = function()
                    next_id = next_id + 1; return next_id
                end,
                timeout = function(_, callback) timers[#timers + 1] = callback end,
            },
            ["skynet.queue"] = function()
                return function(callback)
                    if wait_write then coroutine.yield("writing") end
                    return callback()
                end
            end,
            ["skynet.socket"] = {
                close_fd = function(fd) raw_closed[#raw_closed + 1] = fd end,
                close = function(fd) raw_closed[#raw_closed + 1] = fd end,
            },
            ["rpc"] = {
                call = function(...) return call(...) end,
                send = function(...)
                    sent[#sent + 1] = { ... }; return error_code.succ
                end,
            },
            ["http.websocket"] = {
                is_close = function() return false end,
                accept = function(fd, handle)
                    handles[fd] = handle; coroutine.yield("accepting"); return true
                end,
                close = function(fd, code) closed[#closed + 1] = { fd, code } end,
                write = function(fd, data)
                    if fail_write then error("write failed") end
                    writes[#writes + 1] = { fd, data }
                end,
            },
        })
        instance = require("websocket"):new()
        instance:init()
    end)
    after_each(function() scope:restore() end)

    it("未绑定同步路由，绑定后直接转发且忽略重复帧", function()
        local connection = accept(1)
        call = function(address, command, id, message_id)
            assert.same({ 20, "handle_request", connection.id, 1 }, { address, command, id, message_id })
            instance:bind_client({}, id, 30)
            return error_code.succ, true
        end
        message(1, 1)
        message(1, 2, "AgentChatReq")
        message(1, 2, "AgentChatReq")
        assert.same({ 30, "handle_request", connection.id, 2, "agent", codec:encode_body("AgentChatReq", {}) }, sent[1])
        assert.are.equal(1, #sent)
    end)
    it("分片收齐后只路由一次，断线和错序不会交付半包", function()
        local fragments = require("network.fragments")
        local frame = require("network.frame")
        local body = string.rep("z", 150000)
        local packet = frame.pack(frame.request, 1, "echo", body)
        local parts = {}
        fragments.write(packet, 200000, function(part) parts[#parts + 1] = part end)
        accept(1)
        handles[1].message(1, parts[1], "binary")
        assert.are.equal(1009, closed[1][2])
        local old = accept(2)
        instance:bind_client({}, old.id, 30)
        handles[2].message(2, parts[1], "binary")
        assert.same({}, sent)
        handles[2].close()
        assert.same({}, old.fragments)
        local other = accept(2)
        instance:bind_client({}, other.id, 30)
        handles[2].message(2, parts[2], "binary")
        assert.are.equal(1007, closed[2][2])
        local current = accept(2)
        instance:bind_client({}, current.id, 30)
        handles[2].message(2, string.pack(">BI4I4", 5, #packet, 0) .. packet:sub(1, 11), "binary")
        for offset = 11, #packet - 1, fragments.size do
            local part = string.pack(">BI4I4", 5, #packet, offset) .. packet:sub(offset + 1, offset + fragments.size)
            handles[2].message(2, part, "binary")
        end
        assert.same({ 30, "handle_request", current.id, 1, "echo", body }, sent[3])
        assert.are.equal(3, #sent)
    end)
    it("双向整包超限时返回明确错误，不交付截断数据", function()
        local frame = require("network.frame")
        local maximum = 4 * 1024 * 1024
        package.loaded["etc.cfg"].agent_gateway.socket.max_message_bytes = maximum
        local connection = accept(1)
        instance:bind_client({}, connection.id, 30)
        local body = string.rep("x", maximum - 6 - #"echo" + 1)
        assert.is_true(instance:send_response({ source = 30 }, connection.id, 7, "echo", frame.response, body))
        assert.are.equal(1, #writes)
        local kind, id, app, error_body = frame.unpack(writes[1][2])
        assert.same({ frame.routing_error, 7, "echo" }, { kind, id, app })
        assert.matches(tostring(maximum), error_body)
        handles[1].message(1, string.pack(">BI4I4", 5, maximum + 1, 0) .. "x", "binary")
        assert.are.equal(1009, closed[1][2])
        assert.same({ { 30, "disconnect", connection.id } }, sent)
    end)
    it("同步等待只阻塞当前连接，回调可绑定并写响应", function()
        local connection = accept(1)
        call = function()
            coroutine.yield("login")
            instance:bind_client({}, connection.id, 30)
            return error_code.succ, true
        end
        local reader = coroutine.create(function() message(1, 1) end)
        assert.same({ true, "login" }, { coroutine.resume(reader) })
        local other = accept(2)
        assert.is_not_nil(other)
        assert.is_true(instance:send_response({ source = 20 }, connection.id, 1, "login", 2, login))
        assert.is_true(coroutine.resume(reader))
        assert.are.equal(30, connection.client_address)
    end)
    it("绑定幂等且拒绝覆盖，关闭仅通知一次", function()
        local connection = accept(1)
        assert.is_true(instance:bind_client({}, connection.id, 30))
        assert.is_true(instance:bind_client({}, connection.id, 30))
        assert.is_false(instance:bind_client({}, connection.id, 31))
        instance:close_connection({}, connection.id, 1000, "close")
        handles[1].close()
        instance:close_connection({}, connection.id, 1000, "close")
        assert.same({ { 30, "disconnect", connection.id } }, sent)
        assert.are.equal(1, #closed)
        assert.are.equal(0, #raw_closed)
    end)
    it("WebSocket 尚未登记时直接关闭原始 socket", function()
        local connection = accept(1)
        package.loaded["http.websocket"].is_close = function() return true end
        assert.is_true(instance:close_connection({}, connection.id, 1000, "close"))
        assert.same({ 1 }, raw_closed)
        assert.are.equal(0, #closed)
    end)
    it("旧超时、关闭事件和响应不影响相同 fd 的新连接", function()
        local old = accept(1)
        local old_handle = handles[1]
        instance:close_connection({}, old.id, 1000, "close")
        local current = accept(1)
        timers[1]()
        old_handle.close()
        assert.is_false(instance:send_response({ source = 20 }, old.id, 1, "login", 2, login))
        assert.are.equal(current, instance.connections[current.id])
        assert.are.equal(1, #closed)
    end)
    it("排队写入期间关闭连接，恢复后不写旧响应", function()
        local connection = accept(1)
        wait_write = true
        local result
        local writer = coroutine.create(function()
            result = instance:send_response({ source = 20 }, connection.id, 1, "login", 2, login)
        end)
        assert.same({ true, "writing" }, { coroutine.resume(writer) })
        instance:close_connection({}, connection.id, 1000, "close")
        assert.is_true(coroutine.resume(writer))
        assert.is_false(result)
        assert.are.equal(0, #writes)
    end)
    it("写入和编码失败清理连接并通知 client 服务", function()
        local connection = accept(1)
        instance:bind_client({}, connection.id, 30)
        fail_write = true
        assert.is_false(instance:send_response({ source = 20 }, connection.id, 1, "login", 2, login))
        assert.same({ 30, "disconnect", connection.id }, sent[1])
        local other = accept(2)
        assert.is_false(instance:send_response({ source = 20 }, other.id, 1, "@invalid", 2, ""))
        assert.are.equal(2, #closed)
    end)
    for _, case in ipairs({
        { "文本", "text", "text", 1003 },
        { "短帧", "bad", "binary", 1007 },
        { "零 ID", string.pack(">BI4s1", 1, 0, "login"), "binary", 1007 },
        { "响应方向", codec:encode_msg(1, "LoginRes", {}), "binary", 1008 },
        { "通知方向", codec:encode_msg(0, "AgentMessageDeltaNtf", {}), "binary", 1008 },
        { "空应用 ID", string.pack(">BI4s1", 1, 1, ""), "binary", 1007 },
    }) do
        it("拒绝" .. case[1], function()
            local connection = accept(1)
            instance:bind_client({}, connection.id, 30)
            handles[1].message(1, case[2], case[3])
            assert.are.equal(case[4], closed[1][2])
            assert.same({ { 30, "disconnect", connection.id } }, sent)
        end)
    end
    it("接入即开始超时，成功绑定的连接不超时", function()
        local first = accept(1)
        accept(2)
        instance:bind_client({}, first.id, 30)
        timers[1]()
        timers[2]()
        assert.same({ { 2, 1008 } }, closed)
    end)
    it("路由失败关闭，迟到 accept 返回不移除新连接", function()
        local first, worker = accept(1)
        call = function() return error_code.timeout end
        message(1, 1)
        assert.is_nil(instance.connections[first.id])
        local current = accept(1)
        assert.is_true(coroutine.resume(worker))
        assert.are.equal(current, instance.connections[current.id])
    end)
    it("关闭后收到迟到 accept 立即释放未接管的 fd", function()
        instance:close()
        instance:accept({}, 91, "late", 20)
        assert.same({ 91 }, raw_closed)
        assert.same({}, instance.connections)
    end)
end)
