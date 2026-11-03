local Scope = require("tests.support.modules")
local codes = require("enum.error_code")

describe("logind", function()
    local scope, instance, calls, fail, open_callback, write_callback
    before_each(function()
        calls, fail = {}, {}
        open_callback, write_callback = nil, nil
        scope = Scope.new({
            ["logind"] = false, ["log"] = false,
            skynet = { error = function() end },
            ["rpc"] = {
                call = function(address, command, ...)
                    local args = table.pack(...)
                    calls[#calls + 1] = { address, command, ... }
                    if command == "open" and open_callback then open_callback(args[1]) end
                    if command == "send_response" and write_callback then write_callback() end
                    if fail[command] then return table.unpack(fail[command]) end
                    return codes.succ, command == "open" and { active_session_id = "session" } or true
                end,
                send = function(address, command, ...) calls[#calls + 1] = { address, command, ... } end,
            },
        })
        instance = require("logind"):new()
        instance:init({ client_services = { 11, 12 } })
    end)
    after_each(function() scope:restore() end)

    it("按 open、绑定、响应编排登录并轮询 client 服务", function()
        assert.is_true(instance:handle_request({ source = 20 }, "c1", 1, "LoginReq", {}))
        assert.same({ 11, "open", "c1", 20 }, calls[1])
        assert.same({ 20, "bind_client", "c1", 11 }, calls[2])
        assert.are.equal("send_response", calls[3][2])
        assert.are.equal(codes.succ, calls[3][6].ret)
        instance:handle_request({ source = 20 }, "c2", 1, "LoginReq", {})
        assert.are.equal(12, calls[4][1])
    end)
    it("初始化失败清理客户端上下文后写入失败响应并关闭", function()
        fail.open = { codes.call_fail }
        instance:handle_request({ source = 20 }, "c", 1, "LoginReq", {})
        assert.are.equal("disconnect", calls[2][2])
        assert.are.equal("send_response", calls[3][2])
        assert.are.equal("close_connection", calls[4][2])
    end)
    it("绑定失败回收新连接，绑定后写入失败不重复回收", function()
        fail.bind_client = { codes.succ, false }
        instance:handle_request({ source = 20 }, "c", 1, "LoginReq", {})
        assert.are.equal("disconnect", calls[3][2])
        calls, fail = {}, { send_response = { codes.call_fail } }
        assert.is_false(instance:handle_request({ source = 20 }, "d", 1, "LoginReq", {}))
        assert.are.equal(3, #calls)
    end)
    it("等待失败响应真正写入后才关闭", function()
        write_callback = function() coroutine.yield("writing") end
        local co = coroutine.create(function()
            instance:handle_request({ source = 20 }, "c", 1, "SessionCreateReq", {})
        end)
        assert.same({ true, "writing" }, { coroutine.resume(co) })
        assert.are.equal(1, #calls)
        assert.is_true(coroutine.resume(co))
        assert.are.equal("close_connection", calls[2][2])
    end)
    it("一个连接等待 open 时另一个连接独立完成", function()
        open_callback = function(id) if id == "a" then coroutine.yield("opening") end end
        local co = coroutine.create(function()
            instance:handle_request({ source = 20 }, "a", 1, "LoginReq", {})
        end)
        assert.same({ true, "opening" }, { coroutine.resume(co) })
        assert.is_true(instance:handle_request({ source = 21 }, "b", 1, "LoginReq", {}))
        assert.is_true(coroutine.resume(co))
    end)
end)
