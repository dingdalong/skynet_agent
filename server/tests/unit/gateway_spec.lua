local Scope = require("tests.support.modules")
local codes = require("enum.error_code")

describe("gateway", function()
    local scope, gateway, listener, sent, closed, failure
    before_each(function()
        sent, closed = {}, {}
        failure = false
        scope = Scope.new({
            ["gateway"] = false, ["log"] = false,
            skynet = { error = function() end },
            ["etc.cfg"] = { agent_gateway = { socket = { host = "127.0.0.1", port = 18787 } } },
            ["rpc"] = { send = function(address, command, ...)
                sent[#sent + 1] = { address, command, ... }
                return failure and codes.call_fail or codes.succ
            end },
            ["skynet.socket"] = {
                listen = function() return 90 end,
                start = function(_, callback) listener = callback end,
                close = function(fd) closed[#closed + 1] = fd end,
                close_fd = function(fd) closed[#closed + 1] = fd end,
            },
        })
        gateway = require("gateway"):new()
        gateway:init({ websockets = { 10, 20 }, loginds = { 30, 40 } })
    end)
    after_each(function() scope:restore() end)

    it("独立轮询连接服务和登录服务", function()
        listener(1, "a")
        listener(2, "b")
        listener(3, "c")
        assert.same({ 10, "accept", 1, "a", 30 }, sent[1])
        assert.same({ 20, "accept", 2, "b", 40 }, sent[2])
        assert.same({ 10, "accept", 3, "c", 30 }, sent[3])
    end)
    it("分发失败关闭尚未移交的 fd，停止监听幂等", function()
        failure = true
        listener(1, "a")
        gateway:close()
        gateway:close()
        assert.same({ 1, 90 }, closed)
    end)
end)
