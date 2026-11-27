local Scope = require("tests.support.modules")
local cjson = require("cjson")

describe("桌面执行设备与路由", function()
    local scope, user, desktops, events, now, send_code
    before_each(function()
        events, now, send_code = {}, 0, 1
        local sequence = 0
        scope = Scope.new({
            ["agent.app"] = false,
            ["agent.handler"] = false,
            ["agent.tools.runtime.client"] = false,
            ["agent.persistence"] = { settings = function() end },
            ["agent.chat"] = { new = function() return { sessions = {} } end },
            ["etc.cfg"] = { agent = {} },
            ["rpc"] = {
                send = function(_, _, _, name, args, id)
                    events[#events + 1] = { name = name, args = args, id = id }
                    return send_code
                end
            },
            skynet = {
                now = function() return now end,
                sleep = coroutine.yield,
                genid = function()
                    sequence = sequence + 1; return sequence
                end,
            },
            ["skynet.crypt"] = { hexencode = tostring, randomkey = function() return "test" end },
            log = { info = function() end, failure = function() end },
        })
        user = require("agent.app"):new({ username = "alice" })
        desktops = user.desktop_connections
    end)
    after_each(function() scope:restore() end)

    it("设备默认不开放远程，同用户设备开启后可控制", function()
        local connection = { id = "native" }
        user:register_desktop({ device_id = "desktop", name = "Mac", authorization_id = "auth-1" }, connection)
        local target = { device_id = "desktop" }
        assert.are.equal(connection, desktops:available(target, "desktop"))
        assert.has_error(function() desktops:available(target, "") end)
        user:register_desktop({
            device_id = "desktop",
            name = "Mac",
            authorization_id = "auth-1",
            remote_enabled = true
        }, connection)
        assert.are.equal(connection, desktops:available(target, "phone"))
        assert.is_true(desktops:snapshot()[1].remote_enabled)
    end)

    it("关闭远程停止对应桌面任务，旧连接不能覆盖新连接", function()
        local stopped = 0
        user.chat.sessions.s1 = {
            execution_target = { device_id = "desktop" },
            stop_other_device_runs = function() stopped = stopped + 1 end
        }
        local first, second = { id = "first" }, { id = "second" }
        user:register_desktop({
            device_id = "desktop",
            name = "Mac",
            authorization_id = "auth-1",
            remote_enabled = true
        }, first)
        user:register_desktop({
            device_id = "desktop",
            name = "Mac",
            authorization_id = "auth-1",
            remote_enabled = true
        }, second)
        user:disconnect_desktop(first)
        assert.are.equal(second, desktops:available({ device_id = "desktop" }, "desktop"))
        user:register_desktop({
            device_id = "desktop",
            name = "Mac",
            authorization_id = "auth-1",
            remote_enabled = false
        }, second)
        assert.are.equal(1, stopped)
        user:disconnect_desktop(second)
        assert.has_error(function() desktops:available({ device_id = "desktop" }, "desktop") end)
    end)

    local function register(id, device)
        local response = user:handle_request(id, "AgentDesktopRegisterReq", {
            device_id = device, name = device, authorization_id = "auth", remote_enabled = true,
        })
        assert.are.equal(1, response.ret)
    end

    local function start_project(session, device)
        local runtime = require("agent.tools.runtime").new({
            tools = {},
            execution_target = { device_id = device, workspace_id = "workspace" },
            owner = { owner = { app = user } },
        })
        local task = coroutine.create(function()
            return runtime:project({ session_id = session, id = session .. "-run", source_device = device }, 100)
        end)
        local started, err = coroutine.resume(task)
        assert.is_true(started, err)
        local event = events[#events]
        assert.are.equal("AgentExecutionActionNtf", event.name)
        assert.are.equal(session, event.args.session_id)
        assert.are.equal("auth", event.args.authorization_id)
        return task, event.args.request_id
    end

    local function receipt(id, request, project)
        return user:handle_request(id, "AgentExecutionResultReq", {
            request_id = request, result = cjson.encode({ ok = true, project = project })
        }).ret
    end

    it("同一桌面的两个会话乱序回执按请求交付，忽略重复回执并还原空值", function()
        register("native", "desktop")
        local first, a = start_project("first", "desktop")
        local second, b = start_project("second", "desktop")
        assert.are.equal("native", events[#events].id)
        assert.are_not.equal(1, receipt("web", b, {}))
        assert.are.equal(1, receipt("native", b, { name = "second", nested = { error = cjson.null } }))
        assert.are.equal(1, receipt("native", b, {}))
        assert.are.equal(1, receipt("native", a, { name = "first" }))
        assert.are.same({ true, { name = "first" } }, { coroutine.resume(first) })
        assert.are.same({ true, { name = "second", nested = {} } }, { coroutine.resume(second) })
        assert.is_nil(next(user.pending_client_requests))
    end)

    it("设备重连只结束旧连接的请求，迟到回执不会恢复任务", function()
        register("old", "desktop")
        register("other", "laptop")
        local first, a = start_project("first", "desktop")
        local second, b = start_project("second", "laptop")
        register("new", "desktop")
        assert.are.equal(1, receipt("old", a, {}))
        user:disconnect("old")
        local ok, err = coroutine.resume(first)
        assert.is_false(ok)
        assert.matches("目标桌面离线", err)
        assert.are.equal(1, receipt("other", b, { name = "second" }))
        assert.are.same({ true, { name = "second" } }, { coroutine.resume(second) })
        assert.is_nil(next(user.pending_client_requests))
    end)

    it("超时和发送失败都释放请求", function()
        register("native", "desktop")
        local task = start_project("slow", "desktop")
        now = 5000
        local ok, err = coroutine.resume(task)
        assert.is_false(ok)
        assert.matches("执行结果未确认", err)
        assert.is_nil(next(user.pending_client_requests))
        send_code = 2
        local runtime = require("agent.tools.runtime").new({
            tools = {}, execution_target = { device_id = "desktop" }, owner = { owner = { app = user } },
        })
        assert.has_error(function() runtime:project({ source_device = "desktop" }, 100) end, "桌面执行请求发送失败")
        assert.is_nil(next(user.pending_client_requests))
    end)

    it("远程端不能指定桌面上未经选择的工作目录", function()
        local connection = { id = "target" }
        user:register_desktop({ device_id = "desktop", name = "Mac", authorization_id = "auth-1" }, connection)
        local target = { device_id = "desktop", workspace_id = "project", directory = "/project", platform = "macos" }
        assert.has_error(function() desktops:validate_target(target, { id = "web" }) end)
        assert.are.same(target, desktops:validate_target(target, connection))
    end)
end)

describe("桌面终端续写状态", function()
    local scope
    after_each(function() if scope then scope:restore() end end)

    it("同一工作目录按每次调用的来源授权，撤销跨设备访问只取消对应进程", function()
        local requests = {}
        scope = Scope.new({
            ["agent.tools.runtime.client"] = false,
            ["skynet.crypt"] = {},
            skynet = { fork = function() end },
        })
        local function invoke(_, operation, args, run, call_id)
            requests[#requests + 1] = { operation, run.id, call_id, run.source_device }
            if operation == "project" then return { ok = true, project = { workspace = "/project" } } end
            if operation == "prepare" then return { ok = true, action = { cwd = "/project" } } end
            if operation == "execute" then
                assert.are.same({ cmd = "pwd" }, args.args)
                return { session_id = run.id .. "-process" }
            end
            return { ok = true }
        end
        local runtime = require("agent.tools.runtime").new({
            tools = {}, execution_target = { device_id = "mac" }, owner = { owner = { app = {} } },
        })
        runtime.invoke = invoke
        local command = { spec = { name = "exec_command" } }
        local function launch(id, source)
            local run = { id = id, source_device = source, executions = {} }
            local record = { id = id .. "-call" }
            runtime:project(run, 1024)
            local action = runtime:prepare(command, { args = { cmd = "pwd" } }, run, record)
            runtime:execute(command, action, run, record)
        end
        launch("local", "mac")
        launch("other", nil)
        runtime:stop_other_device_runs()
        assert.are.same({
            { "project", "local", nil,          "mac" }, { "prepare", "local", "local-call", "mac" },
            { "execute", "local", "local-call", "mac" }, { "project", "other" },
            { "prepare", "other", "other-call" }, { "execute", "other", "other-call" },
            { "cancel",  "other", "other-call" },
        }, requests)
    end)

    it("续写复用原进程跟踪并更新两条工具记录", function()
        local watchers, updates = {}, {}
        scope = Scope.new({
            ["agent.tools.runtime.client"] = false,
            ["skynet.crypt"] = {},
            skynet = {
                fork = function(callback) watchers[#watchers + 1] = callback end,
                sleep = function() end,
            }
        })
        local function invoke(_, operation)
            if operation == "execute" then return { session_id = "process", output = "partial" } end
            return { done = true, output = "final", exit_code = 0 }
        end
        local runtime = require("agent.tools.runtime").new({
            tools = {},
            execution_target = {},
            owner = {
                owner = { app = {} },
                _on_tool_update = function(_, _, record) updates[#updates + 1] = record end,
            }
        })
        runtime.invoke = invoke
        local run = { id = "run", executions = {}, message_id = "message", source_device = "desktop" }
        local original, continuation = { id = "first" }, { id = "second" }
        runtime:execute({ spec = { name = "exec_command" } }, { args = {} }, run, original)
        runtime:execute({ spec = { name = "write_stdin" } }, { args = {} }, run, continuation)
        assert.are.equal(1, #watchers)
        watchers[1]()
        assert.are.equal("completed", original.status)
        assert.are.equal("completed", continuation.status)
        assert.are.equal("final", original.output)
        assert.are.equal(2, #updates)
    end)
end)
