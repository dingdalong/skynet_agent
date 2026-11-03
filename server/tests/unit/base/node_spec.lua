local Scope = require("tests.support.modules")
local codes = require("enum.error_code")

describe("node", function()
    local scope, instance, runtime, start, dispatch, environment, result, start_services
    local launched, calls, named, failure, now, forks, exits, logs, debug_installed, watcher
    before_each(function()
        instance, runtime, start, dispatch, result = nil, nil, nil, nil, nil
        launched, calls, named, forks, exits, logs = {}, {}, {}, {}, {}, {}
        failure, now, debug_installed = nil, 0, false
        watcher = { started = false, closed = false,
            start = function(self) self.started = true end,
            close = function(self)
                assert.are.equal(5, #calls)
                self.closed = true
            end,
        }
        local skynet = {
            error = function(message) logs[#logs + 1] = message end,
            self = function() return 1 end, address = tostring,
            register = function(name) named[name] = 1 end,
            start = function(callback) start = callback end,
            dispatch = function(protocol, callback)
                assert.are.equal("lua", protocol)
                dispatch = callback
            end,
            retpack = function(...) result = table.pack(...) end,
            fork = function(callback) forks[#forks + 1] = callback end,
            sleep = function() if coroutine.isyieldable() then coroutine.yield() end end,
            now = function() return now end,
            newservice = function(name, ...)
                assert.is_true(debug_installed)
                assert.is_function(dispatch)
                assert.are.equal("initializing", runtime.state)
                local address = 10 + #launched
                launched[#launched + 1] = { name, ... }
                return address
            end,
            name = function(name, address) named[name] = address end,
        }
        scope = Scope.new({
            ["node"] = false, ["service"] = false, ["log"] = false,
            ["hotfix"] = { install_debug_command = function() debug_installed = true end },
            ["helper.hotfix_watch"] = { new = function(_, node_instance)
                assert.are.equal(instance, node_instance)
                assert.are.equal(5, #calls)
                return watcher
            end },
            ["skynet.manager"] = skynet, skynet = skynet,
            ["rpc"] = { call_no_timeout = function(address, command, params)
                calls[#calls + 1] = { address, command, params }
                if command == "init" and address == failure then return codes.call_fail end
                return codes.succ, true
            end },
            ["etc.cfg"] = {
                channel = "test",
                runtime = { control_port = 18001 },
            },
        })
        -- 节点与服务运行时使用同一 loader 上下文，避免修改测试全局环境。
        environment = setmetatable({ SERVICE_NAME = "main",
            os = { exit = function(code) exits[#exits + 1] = code end },
        }, { __index = _ENV })
        local path = assert(package.searchpath("service", package.path))
        local Service = assert(loadfile(path, "t", environment))()
        package.loaded["service"] = Service
        local construct = Service.new
        Service.new = function(class_table, node_instance)
            instance = node_instance
            runtime = construct(class_table, node_instance)
            return runtime
        end
        local node_path = assert(package.searchpath("node", package.path))
        package.loaded["node"] = assert(loadfile(node_path, "t", environment))()
        start_services = function(node_instance)
            local workers = node_instance:launch("worker", 2)
            local coordinators = node_instance:launch("coordinator", 1, { workers = workers })
            local transports = node_instance:launch("transport", 1)
            node_instance:launch("entry", 1, { coordinators = coordinators, transports = transports }, ".entry")
        end
        require("node").init(function(node_instance) start_services(node_instance) end)
    end)
    after_each(function() scope:restore() end)

    it("公共初始化先于业务回调，业务服务完成后节点就绪", function()
        start()
        assert.same({ { "debug_console", "127.0.0.1", 18001 }, { "worker" }, { "worker" },
            { "coordinator" }, { "transport" }, { "entry" } }, launched)
        assert.same({ workers = { 11, 12 } }, calls[3][3])
        assert.same({ coordinators = { 13 }, transports = { 14 } }, calls[5][3])
        assert.are.equal(1, named[".main"])
        assert.are.equal(11, named[".worker_1"])
        assert.are.equal(15, named[".entry"])
        assert.are.equal("ready", runtime.state)
        assert.are.equal(1, runtime.owner)
        assert.are.equal(0, runtime.active_commands)
        assert.are.equal(require("node").Node, getmetatable(instance))
        assert.are.equal("[main] init 服务就绪", logs[#logs])
        assert.is_true(instance:close())
        assert.is_true(instance:close())
        local closed = {}
        for _, call in ipairs(calls) do
            if call[2] == "close" then closed[#closed + 1] = call[1] end
        end
        assert.same({ 15, 14, 13, 12, 11 }, closed)
        for _, service in ipairs(instance.services) do
            if service.name ~= "debug_console" then assert.is_true(service.closed) end
        end
        assert.same({}, exits)
        assert.is_false(watcher.started)
    end)
    it("开发渠道在全部服务就绪后监听，关闭前先停止监听", function()
        package.loaded["etc.cfg"].channel = "develop"
        start()
        assert.is_true(watcher.started)
        for index = 2, #instance.services do assert.is_true(instance.services[index].ready) end
        assert.is_true(instance:close())
        assert.is_true(watcher.closed)
    end)
    it("不同节点回调复用相同公共初始化且只执行一次", function()
        local previous
        for _, name in ipairs({ "search", "storage" }) do
            launched, calls, named = {}, {}, {}
            local runs = 0
            local callback = function(node_instance)
                runs = runs + 1
                assert.are.equal("initializing", runtime.state)
                assert.same({ { "debug_console", "127.0.0.1", 18001 } }, launched)
                node_instance:launch(name, 1)
            end
            require("node").init(callback)
            start()
            assert.are.equal("ready", runtime.state)
            assert.are.equal(1, named[".main"])
            assert.are.equal(11, named["." .. name .. "_1"])
            assert.are.equal(1, runs)
            assert.are.equal(codes.invalid_command, runtime:invoke({ source = 1 }, "init", callback))
            assert.are.equal(1, runs)
            assert.is_true(instance ~= previous)
            previous = instance
        end
    end)
    it("启动回调异常仍回收其已创建服务并退出失败码", function()
        start_services = function(node_instance)
            node_instance:launch("worker", 1)
            error("startup callback failed", 0)
        end
        start()
        assert.matches("^%[main%] init 失败 error=.*startup callback failed", logs[1])
        assert.is_true(instance.services[2].closed)
        assert.same({ 1 }, exits)
    end)
    it("批量服务使用编号，单实例可指定注册名并允许空服务池", function()
        start_services = function(node_instance)
            assert.same({}, node_instance:launch("unused", 0))
            local ok, err = pcall(function()
                node_instance:launch("worker", 2, {}, ".worker")
            end)
            assert.is_false(ok)
            assert.matches("显式服务名仅支持单实例", err)
            node_instance:launch("worker", 1)
            node_instance:launch("another_worker", 1, { enabled = true }, ".worker")
        end
        start()
        assert.are.equal(11, named[".worker_1"])
        assert.are.equal(12, named[".worker"])
        assert.same({ 12, "init", { enabled = true } }, calls[2])
        assert.are.equal("ready", runtime.state)
    end)
    it("节点业务启动回调必须可调用", function()
        local ok, err = pcall(function() require("node").init({}) end)
        assert.is_false(ok)
        assert.matches("节点启动回调必须是 function", err)
    end)
    it("部分初始化失败记录错误并回收已创建服务后退出", function()
        package.loaded["etc.cfg"].channel = "develop"
        failure = 13
        start()
        assert.is_false(watcher.started)
        assert.matches("^%[main%] init 失败 error=.*初始化服务失败: %.coordinator_1", logs[1])
        assert.is_true(instance.services[4].closed)
        assert.are.equal(4, #launched)
        local closed = {}
        for _, call in ipairs(calls) do
            if call[2] == "close" then closed[#closed + 1] = call[1] end
        end
        assert.same({ 13, 12, 11 }, closed)
        assert.same({ 1 }, exits)
    end)
    it("启动清理失败继续回收其余服务并退出失败码", function()
        failure = 13
        local original_call = package.loaded["rpc"].call_no_timeout
        package.loaded["rpc"].call_no_timeout = function(address, command, ...)
            if command == "close" and address == 13 then return codes.call_fail end
            return original_call(address, command, ...)
        end
        start()
        assert.is_false(instance.close_succeeded)
        assert.is_true(instance.services[2].closed)
        assert.is_false(instance.services[4].closed)
        assert.same({ 1 }, exits)
    end)
    it("慢初始化和慢清理都等待实际完成", function()
        local original_call = package.loaded["rpc"].call_no_timeout
        package.loaded["rpc"].call_no_timeout = function(...)
            now = now + 4000
            return original_call(...)
        end
        start()
        assert.is_true(instance:close())
        assert.are.equal(40000, now)
        assert.are.equal(10, #calls)
        assert.same({}, exits)
    end)
    it("状态查询汇总业务服务，区分失败和无响应", function()
        start()
        local requests = {}
        package.loaded["skynet"].request = function()
            return {
                add = function(_, request) requests[#requests + 1] = request end,
                select = function(_, timeout)
                    assert.are.equal(300, timeout)
                    local index = 0
                    local responses = { { codes.succ, "ready" }, { codes.call_fail }, false }
                    return function()
                        index = index + 1
                        if index <= 3 then return requests[index], responses[index] end
                    end
                end,
            }
        end
        dispatch(1, 9, "status")
        assert.same({ { 11, "lua", "status", n = 3 }, { 12, "lua", "status", n = 3 },
            { 13, "lua", "status", n = 3 }, { 14, "lua", "status", n = 3 },
            { 15, "lua", "status", n = 3 } }, requests)
        assert.same(table.pack(codes.succ, table.concat({
            ".worker_1 11 ready", ".worker_2 12 failed", ".coordinator_1 13 failed",
            ".transport_1 14 unavailable", ".entry 15 unavailable",
        }, "\n")), result)
    end)
    it("关闭异常继续清理其余服务并报告失败", function()
        start()
        local original_call = package.loaded["rpc"].call_no_timeout
        package.loaded["rpc"].call_no_timeout = function(address, command, ...)
            if address == 15 then return codes.call_fail end
            return original_call(address, command, ...)
        end
        assert.is_false(instance:close())
        assert.is_false(instance.services[6].closed)
        assert.is_true(instance.services[2].closed)
    end)
    it("关服在 fork 前防重入并按清理结果退出", function()
        start()
        dispatch(1, 9, "shutdown")
        assert.same(table.pack(codes.succ, true), result)
        dispatch(1, 9, "shutdown")
        assert.is_true(instance.closing)
        assert.are.equal(1, #forks)
        forks[1]()
        assert.same({ 0 }, exits)
    end)
    it("强制关闭在 fork 前防重入并跳过清理", function()
        start()
        dispatch(1, 9, "force_shutdown")
        assert.same(table.pack(codes.succ, true), result)
        dispatch(1, 9, "force_shutdown")
        dispatch(1, 9, "shutdown")
        assert.is_true(instance.closing)
        assert.is_false(instance.close_started)
        assert.are.equal(1, #forks)
        forks[1]()
        assert.same({ 1 }, exits)
        assert.are.equal(5, #calls)
    end)
    it("启动等待期间报告初始化状态且仅允许显式强制退出", function()
        package.loaded["etc.cfg"].channel = "develop"
        package.loaded["rpc"].call_no_timeout = function() coroutine.yield() end
        local starting = coroutine.create(start)
        assert.is_true(coroutine.resume(starting))
        assert.is_false(watcher.started)
        assert.are.equal("debug_console", launched[1][1])
        dispatch(1, 9, "status")
        assert.same(table.pack(codes.succ, "initializing"), result)
        dispatch(1, 9, "shutdown")
        assert.same(table.pack(codes.invalid_command), result)
        dispatch(1, 9, "force_shutdown")
        assert.same(table.pack(codes.succ, true), result)
        forks[1]()
        assert.same({ 1 }, exits)
    end)
    it("关服等待期间显式强制退出", function()
        start()
        package.loaded["rpc"].call_no_timeout = function() coroutine.yield() end
        instance:shutdown({})
        local closing = coroutine.create(forks[1])
        assert.is_true(coroutine.resume(closing))
        assert.is_true(instance.close_started)
        assert.is_false(instance.close_done)
        dispatch(1, 9, "force_shutdown")
        dispatch(1, 9, "force_shutdown")
        assert.are.equal(2, #forks)
        forks[2]()
        assert.same({ 1 }, exits)
    end)
    it("清理完成后的退出让出期间接受强制关闭也退出失败码", function()
        start()
        instance:shutdown({})
        local closing = coroutine.create(forks[1])
        assert.is_true(coroutine.resume(closing))
        assert.is_true(instance.close_done)
        instance:force_shutdown({})
        assert.is_true(coroutine.resume(closing))
        assert.same({ 1 }, exits)
    end)
    it("并发 close 等待同一次关闭结果", function()
        start()
        local original_call = package.loaded["rpc"].call_no_timeout
        package.loaded["rpc"].call_no_timeout = function(...)
            if not instance.services[6].closed then coroutine.yield() end
            return original_call(...)
        end
        local first, second
        local a = coroutine.create(function() first = instance:close() end)
        local b = coroutine.create(function() second = instance:close() end)
        assert.is_true(coroutine.resume(a))
        assert.is_true(coroutine.resume(b))
        assert.is_nil(first)
        assert.is_nil(second)
        assert.is_true(coroutine.resume(a))
        assert.is_true(coroutine.resume(b))
        assert.is_true(first)
        assert.is_true(second)
    end)
end)
