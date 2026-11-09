local Scope = require("tests.support.modules")
local cjson = require("cjson")

describe("桌面执行设备与路由", function()
    local scope, user, execution, events
    before_each(function()
        events = {}
        scope = Scope.new({ ["user.mods.execution.execution"] = false,
            skynet = {}, ["skynet.crypt"] = {},
            log = { info = function() end, failure = function() end } })
        user = { chat = { sessions = {} }, owner = { publish = function(_, _, name, args)
            events[#events + 1] = { name = name, args = args }
        end } }
        execution = require("user.mods.execution.execution"):new(user)
    end)
    after_each(function() scope:restore() end)

    it("设备默认不开放远程，同用户设备开启后可控制", function()
        local connection = { id = "native" }
        execution:register({ device_id = "desktop", name = "Mac", authorization_id = "auth-1" }, connection)
        local target = { device_id = "desktop" }
        assert.are.equal(connection, execution:available(target, "desktop"))
        assert.has_error(function() execution:available(target, "") end)
        execution:register({ device_id = "desktop", name = "Mac", authorization_id = "auth-1",
            remote_enabled = true }, connection)
        assert.are.equal(connection, execution:available(target, "phone"))
        assert.is_true(execution:snapshot()[1].remote_enabled)
    end)

    it("关闭远程停止对应桌面任务，旧连接不能覆盖新连接", function()
        local stopped = 0
        user.chat.sessions.s1 = { execution_target = { device_id = "desktop" },
            stop_remote = function() stopped = stopped + 1 end }
        local first, second = { id = "first" }, { id = "second" }
        execution:register({ device_id = "desktop", name = "Mac", authorization_id = "auth-1",
            remote_enabled = true }, first)
        execution:register({ device_id = "desktop", name = "Mac", authorization_id = "auth-1",
            remote_enabled = true }, second)
        execution:disconnect(first)
        assert.are.equal(second, execution:available({ device_id = "desktop" }, "desktop"))
        execution:register({ device_id = "desktop", name = "Mac", authorization_id = "auth-1",
            remote_enabled = false }, second)
        assert.are.equal(1, stopped)
        execution:disconnect(second)
        assert.has_error(function() execution:available({ device_id = "desktop" }, "desktop") end)
    end)

    it("只接受目标连接的执行结果，JSON 空值恢复为缺省字段", function()
        local connection = { id = "target" }
        execution.pending.call = { connection = connection }
        assert.are_not.equal(1, execution:result({ request_id = "call", result = "{}" }, {}).ret)
        assert.are.equal(1, execution:result({ request_id = "call",
            result = cjson.encode({ ok = true, session_id = cjson.null, error = cjson.null }) }, connection).ret)
        assert.is_nil(execution.pending.call.result.session_id)
        assert.is_nil(execution.pending.call.result.error)
    end)

    it("远程端不能指定桌面上未经选择的工作目录", function()
        local connection = { id = "target" }
        execution:register({ device_id = "desktop", name = "Mac", authorization_id = "auth-1" }, connection)
        local target = { device_id = "desktop", workspace_id = "project", directory = "/project", platform = "macos" }
        assert.has_error(function() execution:validate_target(target, { id = "web" }) end)
        assert.are.same(target, execution:validate_target(target, connection))
    end)
end)

describe("桌面终端续写状态", function()
    local scope
    after_each(function() if scope then scope:restore() end end)

    it("续写复用原进程跟踪并更新两条工具记录", function()
        local watchers, updates = {}, {}
        scope = Scope.new({ ["agent.remote"] = false, skynet = {
            fork = function(callback) watchers[#watchers + 1] = callback end,
            sleep = function() end,
        } })
        local controller = { invoke = function(_, _, operation)
            if operation == "execute" then return { session_id = "process", output = "partial" } end
            return { done = true, output = "final", exit_code = 0 }
        end }
        local remote = require("agent.remote"):new({ tools = {}, execution_target = {}, owner = {
            owner = { user = { execution = controller } },
            _on_tool_update = function(_, _, record) updates[#updates + 1] = record end,
        } })
        local run = { id = "run", processes = {}, message_id = "message", source_device = "desktop" }
        local original, continuation = { id = "first" }, { id = "second" }
        remote:execute("exec_command", {}, {}, run, original)
        remote:execute("write_stdin", {}, {}, run, continuation)
        assert.are.equal(1, #watchers)
        assert.is_true(remote:has_active())
        watchers[1]()
        assert.is_false(remote:has_active())
        assert.are.equal("completed", original.status)
        assert.are.equal("completed", continuation.status)
        assert.are.equal("final", original.output)
        assert.are.equal(2, #updates)
    end)
end)
