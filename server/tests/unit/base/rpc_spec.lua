local Scope = require("tests.support.modules")
local codes = require("enum.error_code")

describe("rpc", function()
    local scope, rpc, response, request, ticks, send_error, send_result
    before_each(function()
        response, send_error = table.pack(codes.succ, nil, false, "tail", nil), false
        send_result = 0
        scope = Scope.new({
            ["rpc"] = false, ["log"] = false,
            skynet = {
                error = function() end,
                request = function(value)
                    request = value
                    return { select = function(_, timeout)
                        ticks = timeout
                        local once = false
                        return function()
                            if not once then once = true; return request, response end
                        end
                    end }
                end,
                send = function(...)
                    if send_error then error("dead service") end
                    request = table.pack(...)
                    return send_result
                end,
            },
        })
        rpc = require("rpc")
    end)
    after_each(function() scope:restore() end)
    it("固定 lua 协议，完整保留 nil、false 和尾部 nil", function()
        assert.same(response, table.pack(rpc.call(10, "open", nil, "arg", nil)))
        assert.same(table.pack(10, "lua", "open", nil, "arg", nil), request)
        assert.are.equal(300, ticks)
    end)
    it("无超时调用保留协议和全部参数、返回值", function()
        assert.same(response, table.pack(rpc.call_no_timeout(10, "open", nil, "arg", nil)))
        assert.same(table.pack(10, "lua", "open", nil, "arg", nil), request)
        assert.is_nil(ticks)
    end)
    it("远端失败与调用异常返回失败码", function()
        response = false
        assert.are.equal(codes.call_fail, rpc.call(10, "open"))
        assert.are.equal(codes.call_fail, rpc.call_no_timeout(10, "open"))
        package.loaded.skynet.request = function() error("dead") end
        assert.are.equal(codes.call_fail, rpc.call(10, "open"))
        assert.are.equal(codes.call_fail, rpc.call_no_timeout(10, "open"))
        send_error = true
        assert.are.equal(codes.call_fail, rpc.send(10, "close"))
    end)
    it("超时只结束等待，不重发命令", function()
        local count = 0
        package.loaded.skynet.request = function()
            count = count + 1
            return { select = function() return function() end end }
        end
        assert.are.equal(codes.timeout, rpc.call(10, "open"))
        assert.are.equal(1, count)
    end)
    it("无超时调用等待远端返回，不重复发送", function()
        local count = 0
        package.loaded.skynet.request = function()
            count = count + 1
            return { select = function(_, timeout)
                assert.is_nil(timeout)
                local once = false
                return function()
                    if once then return end
                    once = true
                    coroutine.yield()
                    return {}, response
                end
            end }
        end
        local result
        local waiting = coroutine.create(function() result = table.pack(rpc.call_no_timeout(10, "open")) end)
        assert.is_true(coroutine.resume(waiting))
        assert.is_nil(result)
        assert.is_true(coroutine.resume(waiting))
        assert.same(response, result)
        assert.are.equal(1, count)
    end)
    it("异步发送检查 Skynet 接收结果，拒绝 nil 和 false", function()
        assert.are.equal(codes.succ, rpc.send(10, "close"))
        assert.same(table.pack(10, "lua", "close"), request)
        send_result = nil
        assert.are.equal(codes.call_fail, rpc.send(10, "close"))
        send_result = false
        assert.are.equal(codes.call_fail, rpc.send(10, "close"))
    end)
end)
