local Scope = require("tests.support.modules")
local lfs = require("lfs")

local function write(path, content)
    local handle = assert(io.open(path, "wb"))
    assert(handle:write(content))
    assert(handle:close())
end

local function remove_tree(path)
    for entry in lfs.dir(path) do
        if entry ~= "." and entry ~= ".." then
            local child = path .. "/" .. entry
            if lfs.symlinkattributes(child, "mode") == "directory" then remove_tree(child)
            else assert(os.remove(child)) end
        end
    end
    assert(lfs.rmdir(path))
end

describe("hotfix_watch", function()
    local scope, root, watch, node, now, calls, logs, fork, respond

    local function poll_change()
        watch:poll()
        now = now + 20
        watch:poll()
    end

    before_each(function()
        root = os.tmpname()
        os.remove(root)
        assert(lfs.mkdir(root))
        for _, directory in ipairs({ "lualib", "lualib/base", "lualib/helper", "lualib/luaext",
            "lualib/example", "service", "service/websocket" }) do
            assert(lfs.mkdir(root .. "/" .. directory))
        end
        for _, path in ipairs({ "lualib/user.lua", "lualib/base/rpc.lua",
            "service/websocket/websocket.lua",
            "main.lua", "service/init.lua", "lualib/base/hotfix.lua", "lualib/base/preload.lua",
            "lualib/luaext/table.lua", "lualib/helper/hotfix_watch.lua", "lualib/example/init.lua" }) do
            write(root .. "/" .. path, "return {}")
        end
        now, calls, logs, fork = 0, {}, {}, nil
        respond = function(request)
            local names = {}
            for index = 4, request.n do names[#names + 1] = request[index] end
            return table.pack(true, nil, { updated = names, skipped = {} })
        end
        scope = Scope.new({
            ["helper.hotfix_watch"] = false, log = false,
            skynet = {
                error = function(message) logs[#logs + 1] = message end,
                self = function() return 1 end, now = function() return now end,
                fork = function(callback) fork = callback end,
                wakeup = function() end,
                sleep = function(ticks) coroutine.yield(ticks) end,
                request = function()
                    local batch = {}
                    return {
                        add = function(_, request) batch[#batch + 1] = request; calls[#calls + 1] = request end,
                        select = function(_, timeout)
                            assert.are.equal(300, timeout)
                            local index = 0
                            return function()
                                index = index + 1
                                if batch[index] then return batch[index], respond(batch[index]) end
                            end
                        end,
                    }
                end,
            },
        })
        node = { services = {
            { name = "debug_console", address = 10 },
            { name = ".websocket_1", address = 11, ready = true },
            { name = ".websocket_2", address = 12, ready = true },
            { name = ".starting", address = 13 },
            { name = ".closed", address = 14, ready = true, closed = true },
        } }
        watch = require("helper.hotfix_watch"):new(node, root)
        watch.snapshot = watch:_snapshot()
    end)
    after_each(function()
        scope:restore()
        remove_tree(root)
    end)

    it("语法错误阻止整批分发，修正单文件后重试全部修改", function()
        local rpc_path = "lualib/base/rpc.lua"
        local websocket_path = "service/websocket/websocket.lua"
        write(root .. "/" .. rpc_path, "return { version = 2 }")
        write(root .. "/" .. websocket_path, "syntax error")
        poll_change()
        assert.same({}, calls)
        assert.are.equal(1, #logs)
        assert.matches("预检查失败", logs[1])
        assert.is_truthy(logs[1]:find(root .. "/" .. websocket_path, 1, true))
        for _, address in ipairs({ 1, 11, 12 }) do
            assert.same({ rpc = rpc_path, websocket = websocket_path }, watch.pending[address])
        end
        now = 100
        watch:poll()
        assert.same({}, calls)
        assert.are.equal(1, #logs)
        write(root .. "/" .. websocket_path, "return { version = 2 }")
        poll_change()
        assert.are.equal(3, #calls)
        assert.same(table.pack(1, "debug", "HOTFIX", "rpc", "websocket"), calls[1])
        assert.same({}, watch.pending)
        assert.are.equal(2, #logs)
    end)

    it("内容比较检测同秒同长度修改，稳定后覆盖主节点和全部就绪实例", function()
        local path = root .. "/lualib/user.lua"
        assert(lfs.touch(path, 1, 1))
        write(path, "return{ }")
        assert(lfs.touch(path, 1, 1))
        watch:poll()
        assert.same({}, calls)
        now = 19
        watch:poll()
        assert.same({}, calls)
        now = 20
        watch:poll()
        for index, address in ipairs({ 1, 11, 12 }) do
            assert.same(table.pack(address, "debug", "HOTFIX", "user"), calls[index])
        end
        assert.same({ "[hotfix_watch] reload 已更新 files=" .. path }, logs)
    end)

    it("连续保存重新计时，并映射库、基础短名和服务主体", function()
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        watch:poll()
        now = 10
        for _, path in ipairs({ "service/websocket/websocket.lua", "lualib/example/init.lua", "main.lua",
            "service/init.lua", "lualib/base/hotfix.lua", "lualib/base/preload.lua", "lualib/luaext/table.lua",
            "lualib/helper/hotfix_watch.lua" }) do write(root .. "/" .. path, "return { version = 2 }") end
        watch:poll()
        now = 20
        watch:poll()
        assert.same({}, calls)
        now = 30
        watch:poll()
        assert.same(table.pack(1, "debug", "HOTFIX", "example", "rpc", "websocket"), calls[1])
    end)

    it("保存后还原原内容时不触发更新，下一次真实修改仍可更新", function()
        local path = root .. "/lualib/base/rpc.lua"
        write(path, "return { version = 2 }")
        watch:poll()
        write(path, "return {}")
        now = 20
        watch:poll()
        assert.same({}, calls)
        write(path, "return { version = 3 }")
        poll_change()
        assert.are.equal("rpc", calls[1][4])
    end)

    it("失败实例保留整个批次，修正后重试且其它实例只收到新变更", function()
        respond = function(request)
            if request[1] == 11 then return table.pack(false, "模块执行失败") end
            return table.pack(true, nil, { updated = {}, skipped = { "rpc", "websocket" } })
        end
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        write(root .. "/service/websocket/websocket.lua", "return { version = 2 }")
        poll_change()
        assert.same({ rpc = "lualib/base/rpc.lua", websocket = "service/websocket/websocket.lua" }, watch.pending[11])
        assert.are.equal(1, #logs)
        assert.matches("热修失败 files= errors=%.websocket_1: 模块执行失败", logs[1])
        now = 100
        watch:poll()
        assert.are.equal(3, #calls)
        respond = function() return table.pack(true, nil, { updated = { "websocket" }, skipped = {} }) end
        write(root .. "/service/websocket/websocket.lua", "return { version = 3 }")
        poll_change()
        assert.same(table.pack(11, "debug", "HOTFIX", "rpc", "websocket"), calls[5])
        assert.same(table.pack(12, "debug", "HOTFIX", "websocket"), calls[6])
        assert.same({}, watch.pending)
    end)

    it("只编译源码，不执行模块顶层", function()
        write(root .. "/lualib/base/rpc.lua", 'error("不应执行候选顶层")\nreturn {}')
        poll_change()
        assert.are.equal(3, #calls)
        assert.matches("已更新 files=", logs[1])
    end)

    it("部分成功只输出一次结果，文件去重并排除跳过模块", function()
        respond = function(request)
            if request[1] == 11 then return table.pack(false, "模块执行失败\nstack traceback:\ntrace") end
            return table.pack(true, nil, { updated = { "rpc" }, skipped = { "websocket" } })
        end
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        write(root .. "/service/websocket/websocket.lua", "return { version = 2 }")
        poll_change()
        assert.same({ "[hotfix_watch] reload 失败 error=部分更新 files=" .. root .. "/lualib/base/rpc.lua"
            .. " errors=.websocket_1: 模块执行失败" }, logs)
    end)

    it("全部目标均跳过时不输出成功日志", function()
        respond = function() return table.pack(true, nil, { updated = {}, skipped = { "rpc" } }) end
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        poll_change()
        assert.are.equal(3, #calls)
        assert.same({}, logs)
        assert.same({}, watch.pending)
    end)

    it("预检查包含失败实例积压的模块，错误阻止所有目标分发", function()
        respond = function(request)
            if request[1] == 11 then return table.pack(false, "模块执行失败") end
            return table.pack(true, nil, { updated = { "rpc" }, skipped = {} })
        end
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        poll_change()
        local calls_before = #calls
        -- 模拟积压文件被删除后，另一个文件发生修改。
        assert(os.remove(root .. "/lualib/base/rpc.lua"))
        write(root .. "/service/websocket/websocket.lua", "return { version = 2 }")
        poll_change()
        assert.are.equal(calls_before, #calls)
        assert.matches("预检查失败 errors=源码不存在 file=", logs[#logs])
        assert.same({ rpc = "lualib/base/rpc.lua", websocket = "service/websocket/websocket.lua" }, watch.pending[11])
    end)

    it("编译错误一次汇总多个文件，不重复输出日志", function()
        write(root .. "/lualib/base/rpc.lua", "return [")
        write(root .. "/service/websocket/websocket.lua", "return [")
        poll_change()
        assert.same({}, calls)
        assert.are.equal(1, #logs)
        assert.is_truthy(logs[1]:find(root .. "/lualib/base/rpc.lua", 1, true))
        assert.is_truthy(logs[1]:find(root .. "/service/websocket/websocket.lua", 1, true))
        poll_change()
        assert.are.equal(1, #logs)
    end)

    it("服务失联保留待更新模块，后续创建的就绪实例加入更新", function()
        respond = function() return nil end
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        poll_change()
        assert.matches("热修响应失败或超时", logs[1])
        node.services[#node.services + 1] = { name = ".new", address = 15, ready = true }
        respond = function() return table.pack(true, nil, { updated = { "rpc" }, skipped = {} }) end
        write(root .. "/lualib/base/rpc.lua", "return { version = 3 }")
        poll_change()
        assert.same(table.pack(15, "debug", "HOTFIX", "rpc"), calls[7])
    end)

    it("更新期间再次保存归入后续批次", function()
        local path = root .. "/lualib/base/rpc.lua"
        local saved = false
        respond = function()
            if not saved then write(path, "return { version = 3 }"); saved = true end
            return table.pack(true, nil, { updated = { "rpc" }, skipped = {} })
        end
        write(path, "return { version = 2 }")
        poll_change()
        poll_change()
        assert.are.equal(6, #calls)
        assert.are.equal("return { version = 3 }", watch.snapshot["lualib/base/rpc.lua"])
    end)

    it("新增和删除文件报告需要重启，同时处理其它兼容修改", function()
        write(root .. "/lualib/new.lua", "return {}")
        assert(os.remove(root .. "/lualib/base/rpc.lua"))
        write(root .. "/service/websocket/websocket.lua", "return { version = 2 }")
        poll_change()
        assert.matches("新增文件需重启", logs[1])
        assert.matches("删除文件需重启", logs[2])
        assert.same(table.pack(1, "debug", "HOTFIX", "websocket"), calls[1])
    end)

    it("启动只建立基线，关闭唤醒监听协程并等待退出", function()
        watch:start()
        assert.is_true(watch.running)
        assert.same({}, calls)
        local loop = coroutine.create(fork)
        assert.same({ true, 50 }, { coroutine.resume(loop) })
        local closed = false
        local closing = coroutine.create(function() watch:close(); closed = true end)
        assert.same({ true, 1 }, { coroutine.resume(closing) })
        assert.is_false(closed)
        assert.is_true(coroutine.resume(loop))
        assert.is_true(coroutine.resume(closing))
        assert.is_true(closed)
        assert.is_false(watch.running)
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        poll_change()
        assert.same({}, calls)
        watch:close()
    end)

    it("扫描异常只记录一次，目录恢复后继续监听", function()
        watch:start()
        local loop = coroutine.create(fork)
        assert.is_true(coroutine.resume(loop))
        assert(os.rename(root, root .. ".saved"))
        assert.is_true(coroutine.resume(loop))
        assert.is_true(coroutine.resume(loop))
        assert.are.equal(2, #logs)
        assert.matches("失败 error=", logs[2])
        assert(os.rename(root .. ".saved", root))
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        assert.is_true(coroutine.resume(loop))
        now = 20
        assert.is_true(coroutine.resume(loop))
        assert.are.equal(3, #calls)
        assert.is_nil(watch.last_error)
        watch.closing = true
        assert.is_true(coroutine.resume(loop))
        assert.is_false(watch.running)
    end)

    it("关闭等待在途批次收齐响应后结束，不再处理后续保存", function()
        watch:start()
        local loop = coroutine.create(fork)
        assert.is_true(coroutine.resume(loop))
        write(root .. "/lualib/base/rpc.lua", "return { version = 2 }")
        assert.is_true(coroutine.resume(loop))
        now = 20
        respond = function()
            coroutine.yield("hotfix response")
            return table.pack(true, nil, { updated = { "rpc" }, skipped = {} })
        end
        assert.same({ true, "hotfix response" }, { coroutine.resume(loop) })
        local closed = false
        local closing = coroutine.create(function() watch:close(); closed = true end)
        assert.same({ true, 1 }, { coroutine.resume(closing) })
        write(root .. "/lualib/base/rpc.lua", "return { version = 3 }")
        for _ = 1, 3 do assert.is_true(coroutine.resume(loop)) end
        assert.is_true(coroutine.resume(closing))
        assert.is_true(closed)
        assert.is_false(watch.running)
        assert.are.equal(3, #calls)
        assert.same({}, watch.pending)
        assert.are.equal("return { version = 2 }", watch.snapshot["lualib/base/rpc.lua"])
    end)
end)
