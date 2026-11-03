local Scope = require("tests.support.modules")
local codes = require("enum.error_code")

describe("service", function()
    local scope, runtime, instance, result, logs, environment
    before_each(function()
        result, logs = nil, {}
        scope = Scope.new({
            ["service"] = false, ["log"] = false,
            ["hotfix"] = { install_debug_command = function() end },
            skynet = { error = function(message) logs[#logs + 1] = message end,
                self = function() return 1 end, start = function(callback) callback() end,
                address = tostring, sleep = function() coroutine.yield() end,
                retpack = function(...) result = table.pack(...) end },
        })
        instance = {
            commands = { echo = "echo", failure = "failure" },
            echo = function(_, context, ...) return context.source, ... end,
            failure = function() error("boom") end,
            close = function(self) self.closes = (self.closes or 0) + 1 end,
        }
        -- 单测不经过 Skynet loader，在独立环境提供服务名称。
        environment = setmetatable({ SERVICE_NAME = "test" }, { __index = _ENV })
        local path = assert(package.searchpath("service", package.path))
        package.loaded["service"] = assert(loadfile(path, "t", environment))()
        runtime = require("service"):new(instance)
    end)
    after_each(function() scope:restore() end)
    it("初始化前拒绝业务，初始化仅一次，按白名单提供上下文", function()
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 9 }, "echo"))
        assert.matches("^%[test%] dispatch 拒绝命令 command=echo state=created$", logs[1])
        assert.are.equal(codes.succ, runtime:invoke({ source = 9 }, "init", {}))
        assert.are.equal("[test] init 服务就绪", logs[2])
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 9 }, "init", {}))
        assert.same(table.pack(codes.succ, 8, nil, false),
            table.pack(runtime:invoke({ source = 8 }, "echo", nil, false)))
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 8 }, "ctor"))
    end)
    it("分发捕获异常，异步消息不发送响应", function()
        runtime:invoke({ source = 9 }, "init", {})
        runtime:dispatch(1, 9, "failure")
        assert.same(table.pack(codes.call_fail), result)
        assert.matches("^%[test%] failure 失败 error=.*boom", logs[2])
        result = nil
        runtime:dispatch(0, 9, "echo", 1)
        assert.is_nil(result)
    end)
    it("初始化期间仅放行显式登记的命令", function()
        instance.commands.force_shutdown = "force_shutdown"
        instance.initializing_commands = { force_shutdown = true }
        instance.force_shutdown = function(_, context) return context.source end
        instance.init = function() coroutine.yield() end
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 8 }, "force_shutdown"))
        local starting = coroutine.create(function() runtime:invoke({ source = 9 }, "init", {}) end)
        assert.is_true(coroutine.resume(starting))
        assert.are.equal("initializing", select(2, runtime:invoke({}, "status")))
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 8 }, "echo"))
        assert.same(table.pack(codes.succ, 8),
            table.pack(runtime:invoke({ source = 8 }, "force_shutdown")))
        assert.is_true(coroutine.resume(starting))
        runtime:invoke({ source = 9 }, "close")
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 8 }, "force_shutdown"))
    end)
    it("关闭由所有者发起，重复调用仅释放一次", function()
        runtime:invoke({ source = 9 }, "init", {})
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 8 }, "close"))
        runtime:invoke({ source = 9 }, "close")
        runtime:invoke({ source = 9 }, "close")
        assert.are.equal(1, instance.closes)
        assert.are.equal("closed", select(2, runtime:invoke({ source = 9 }, "status")))
    end)
    it("初始化异常使服务失败，仍可回收", function()
        instance.init = function() error("init failed") end
        runtime:dispatch(1, 9, "init", {})
        assert.are.equal("failed", runtime.state)
        assert.matches("^%[test%] init 失败 error=.*init failed", logs[1])
        runtime:invoke({ source = 9 }, "close")
        assert.are.equal(1, instance.closes)
    end)
    it("并发关闭等在途命令退出，异常仍释放命令计数", function()
        instance.echo = function() coroutine.yield(); error("late failure") end
        runtime:invoke({ source = 9 }, "init", {})
        local handler = coroutine.create(function() runtime:dispatch(0, 8, "echo") end)
        assert.is_true(coroutine.resume(handler))
        assert.are.equal(1, runtime.active_commands)
        local first, second
        local a = coroutine.create(function() first = runtime:invoke({ source = 9 }, "close") end)
        local b = coroutine.create(function() second = runtime:invoke({ source = 9 }, "close") end)
        assert.is_true(coroutine.resume(a))
        assert.is_true(coroutine.resume(b))
        assert.is_nil(first)
        assert.is_nil(second)
        assert.are.equal(codes.invalid_command, runtime:invoke({ source = 8 }, "echo"))
        assert.are.equal("closing", select(2, runtime:invoke({}, "status")))
        assert.is_true(coroutine.resume(handler))
        assert.are.equal(0, runtime.active_commands)
        assert.is_true(coroutine.resume(a))
        assert.is_true(coroutine.resume(b))
        assert.are.equal(codes.succ, first)
        assert.are.equal(first, second)
        assert.are.equal(1, instance.closes)
    end)
    it("关闭失败被所有等待者观察，且不重复执行清理", function()
        instance.close = function(self)
            self.closes = (self.closes or 0) + 1
            coroutine.yield()
            error("close failed")
        end
        runtime:invoke({ source = 9 }, "init", {})
        local first, second
        local a = coroutine.create(function() first = runtime:invoke({ source = 9 }, "close") end)
        local b = coroutine.create(function() second = runtime:invoke({ source = 9 }, "close") end)
        assert.is_true(coroutine.resume(a))
        assert.is_true(coroutine.resume(b))
        assert.is_true(coroutine.resume(a))
        assert.is_true(coroutine.resume(b))
        assert.are.equal(codes.call_fail, first)
        assert.are.equal(first, second)
        assert.are.equal("failed", runtime.state)
        assert.are.equal(1, instance.closes)
        assert.matches("^%[test%] close 失败 error=.*close failed", logs[2])
    end)
    it("关闭中初始化完成也不能恢复 ready", function()
        instance.init = function() coroutine.yield() end
        local init = coroutine.create(function() runtime:dispatch(0, 9, "init", {}) end)
        assert.is_true(coroutine.resume(init))
        local closing = coroutine.create(function() runtime:invoke({ source = 9 }, "close") end)
        assert.is_true(coroutine.resume(closing))
        assert.is_true(coroutine.resume(init))
        assert.are.equal("closing", runtime.state)
        assert.is_true(coroutine.resume(closing))
        assert.are.equal("closed", runtime.state)
    end)
    it("关闭后只允许显式登记的资源收尾命令", function()
        local cleanups = 0
        instance.commands.cleanup = "cleanup"
        instance.closing_commands = { cleanup = true }
        instance.cleanup = function() cleanups = cleanups + 1 end
        runtime:invoke({ source = 9 }, "init", {})
        runtime:invoke({ source = 9 }, "close")
        assert.are.equal(codes.succ, runtime:invoke({}, "cleanup"))
        assert.are.equal(codes.invalid_command, runtime:invoke({}, "echo"))
        assert.are.equal(1, cleanups)
    end)
    it("启动入口按模块加载主体，日志使用 loader 提供的服务名", function()
        local dispatch
        package.loaded["test.service"] = { new = function() return instance end }
        package.loaded["skynet"].dispatch = function(protocol, callback)
            assert.are.equal("lua", protocol)
            dispatch = callback
        end
        require("service").start("test.service")
        dispatch(1, 9, "init", {})
        assert.same(table.pack(codes.succ, true), result)
        assert.are.equal("[test] init 服务就绪", logs[1])
        dispatch(1, 8, "echo", "value")
        assert.same(table.pack(codes.succ, 8, "value"), result)
    end)
    it("公共入口按 SERVICE_NAME 加载主体并完成初始化和命令分发", function()
        local dispatch
        environment.SERVICE_NAME = "test.worker"
        package.loaded["test.worker"] = { new = function() return instance end }
        package.loaded["skynet"].dispatch = function(protocol, callback)
            assert.are.equal("lua", protocol)
            dispatch = callback
        end
        assert(loadfile("src/service/init.lua", "t", environment))()
        dispatch(1, 9, "init", {})
        assert.same(table.pack(codes.succ, true), result)
        assert.are.equal("[test.worker] init 服务就绪", logs[1])
        dispatch(1, 8, "echo", "value")
        assert.same(table.pack(codes.succ, 8, "value"), result)
    end)
    it("公共入口找不到服务主体时报告加载错误", function()
        environment.SERVICE_NAME = "__missing_service_fixture__"
        local ok, err = pcall(assert(loadfile("src/service/init.lua", "t", environment)))
        assert.is_false(ok)
        assert.matches("module '__missing_service_fixture__' not found", err)
    end)
    it("真实 loader 按配置优先加载独立和内置入口，业务服务使用公共入口", function()
        for _, case in ipairs({
            { "etc/config.path", {
                main = "./src/main.lua",
                launcher = "./3rd/skynet/service/launcher.lua",
                debug_console = "./3rd/skynet/service/debug_console.lua",
                gateway = "./src/service/init.lua",
            } },
            { "tests/integration/service_runtime.config", {
                service_runtime = "./tests/integration/service_runtime.lua",
                runtime_worker = "./src/service/init.lua",
            } },
            { "tests/integration/shutdown_runtime.config", {
                shutdown_runtime = "./tests/integration/shutdown_runtime.lua",
                client = "./tests/fixtures/shutdown/startup/client.lua",
                gateway = "./tests/fixtures/shutdown/startup/gateway.lua",
                logind = "./src/service/init.lua",
                shutdown_worker = "./src/service/init.lua",
                debug_console = "./3rd/skynet/service/debug_console.lua",
            } },
        }) do
            local config = {}
            assert(loadfile(case[1], "t", config))()
            for name, expected in pairs(case[2]) do
                local selected
                -- 使用真实文件和 loader 解析顺序，仅截住入口执行以隔离 Skynet VM。
                local loader_environment = setmetatable({
                    LUA_SERVICE = config.luaservice, LUA_PATH = config.lua_path, LUA_CPATH = config.lua_cpath,
                    LUA_PRELOAD = false, package = {}, _G = {},
                    loadfile = function(path)
                        local chunk, err = loadfile(path)
                        if chunk then return function() selected = path end end
                        return nil, err
                    end,
                    require = function(module_name)
                        assert.are.equal("skynet.require", module_name)
                        return { require = function() end }
                    end,
                }, { __index = _ENV })
                assert(loadfile("3rd/skynet/lualib/loader.lua", "t", loader_environment))(name)
                assert.are.equal(expected, selected)
                assert.are.equal(name, loader_environment.SERVICE_NAME)
            end
        end
    end)
end)
