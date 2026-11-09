local Scope = require("tests.support.modules")
local codes = require("enum.error_code")
local status = require("enum.message_status")

describe("用户与客户端服务", function()
    local scope, service, tasks, events, model, next_id, random_id, templates, template_loads, workspaces
    local scans, original_searchpath
    before_each(function()
        tasks, events, next_id, random_id, workspaces = {}, {}, 0, 0, {}
        scans, original_searchpath = {}, package.searchpath
        templates, template_loads = { base = "测试基础提示", permission_judge = "测试权限提示" }, 0
        model = { text = "回答" }
        local file = require("file")
        local Agent = require("class")()
        function Agent:ctor(_, prompt_templates, options)
            self.messages = {}
            self.llm_config = nil
            self.permission_config = nil
            self.templates = prompt_templates
            self.options = options
            self.closed = false
            if model.create_fail then error("构造失败") end
        end
        function Agent:set_llm(main, permission)
            self.llm_config, self.permission_config = main, permission
        end
        function Agent:close() self.closed = true end
        function Agent:chat(text, on_delta, request)
            if model.yield then coroutine.yield("generating") end
            if request.cancelled then return nil, "cancelled" end
            on_delta("回")
            if model.fail then return nil, "upstream failed" end
            on_delta("答")
            self.messages[#self.messages + 1] = text
            return model.text
        end
        scope = Scope.new({
            user = false, client = false, agent_session = false,
            ["user.handler"] = false, ["user.mods.chat.chat"] = false, ["user.mods.chat.handler"] = false,
            ["agent.workspace"] = { create = function(_, username, id)
                workspaces[#workspaces + 1] = { username = username, id = id }
                return "/test"
            end },
            ["skynet.crypt"] = {
                randomkey = function() random_id = random_id + 1; return tostring(random_id) end,
                hexencode = function(value) return value end,
            },
            ["agent.agent"] = Agent,
            ["agent.prompts"] = { load_templates = function()
                template_loads = template_loads + 1
                return templates
            end },
            ["etc.cfg"] = { agent = { llm = { api_key = "test" }, project_instructions_max_bytes = 32768,
                tools = { workspace_root = "/test" }, permission = {},
                default_model_id = "test", models = {
                    { id = "test", name = "测试", model = "test" },
                    { id = "pro", name = "Pro", model = "pro" },
                },
                max_message_length = 100, session_title_length = 24 } },
            skynet = { genid = function() next_id = next_id + 1; return next_id end,
                fork = function(callback) tasks[#tasks + 1] = coroutine.create(callback) end,
                error = function() end, sleep = function() coroutine.yield("sleep") end },
            ["skynet.debug"] = {}, ["skynet.codecache"] = { clear = function() end },
            file = setmetatable({ list_directories = function(directory)
                scans[#scans + 1] = directory
                return file.list_directories(directory)
            end }, { __index = file }),
            log = { info = function() end, failure = function() end },
            rpc = { send = function(address, command, ...)
                events[#events + 1] = { address = address, command = command, args = table.pack(...) }
                return codes.succ
            end },
        })
        service = require("client"):new()
        service:init()
    end)
    after_each(function()
        package.searchpath = original_searchpath
        scope:restore()
    end)

    local function request(id, name, args, connection, source)
        service:handle_request({ source = source or 100 }, connection or "a", id, name, args)
        return events[#events].args[4]
    end

    local function send(session_id, text, connection, extra)
        local args = extra or {}
        args.session_id, args.text = session_id, text
        return request(2, "ChatReq", args, connection)
    end

    local function first(text, extra)
        return send(nil, text or "问题", nil, extra).chat_session.session
    end

    it("登录与重复快照只创建用户，首条有效消息才创建会话及工作区", function()
        local snapshot = service:open(nil, "a", 100, "alice")
        assert.same({}, snapshot.chat_sessions)
        assert.are.equal("test", snapshot.default_model_id)
        assert.are.equal("", snapshot.permission_model_id)
        assert.are.equal(2, #snapshot.models)
        assert.same(snapshot, require("user.handler").REQUEST.UserSnapshotReq(service.users.alice).snapshot)
        assert.are.equal(0, #workspaces)
        assert.are.equal(0, #tasks)
        assert.are.equal(0, #events)
        local created = first("第一条消息", { model_id = "pro" })
        local session = service.users.alice.chat.sessions[created.id]
        assert.are.equal(require("user"), getmetatable(service.users.alice))
        assert.are.equal(require("user.mods.chat.chat"), getmetatable(service.users.alice.chat))
        assert.are.equal(require("agent_session"), getmetatable(session))
        assert.are.equal(1, #workspaces)
        assert.are.equal(1, #tasks)
        assert.are.equal("pro", session.model_id)
        assert.are.equal(session, session.agent.options.owner)
        assert.are.equal(session, session.run.owner)
        assert.are.equal(2, #created.messages)
        assert.are.equal("第一条消息", created.title)
        assert.are.equal(1, created.revision)
        assert.are.equal("ChatRes", events[#events].args[3])
        assert.are.equal(created.id, events[1].args[4].chat_session.session.id)
        assert.are.equal(2, #events[1].args[4].chat_session.session.messages)
    end)

    it("服务初始化加载一次模板，各会话共享启动快照与项目规则上限", function()
        service:open(nil, "a", 100, "alice")
        first("一")
        first("二")
        assert.are.equal(1, template_loads)
        for _, session in pairs(service.users.alice.chat.sessions) do
            assert.are.equal(templates, session.agent.templates)
            assert.are.equal(32768, session.agent.options.project_instructions_max_bytes)
        end
        assert.has_error(function() service:init() end, "Agent 提示词模板已经加载")
    end)

    it("加载服务模块不扫描或加载 handler，初始化扫描一次且请求不再扫描", function()
        local scan_count = #scans
        package.loaded.client = nil
        package.loaded["user.handler"] = nil
        package.loaded["user.mods.chat.handler"] = nil
        local ClientService = require("client")
        assert.are.equal(scan_count, #scans)
        assert.is_nil(package.loaded["user.handler"])
        assert.is_nil(package.loaded["user.mods.chat.handler"])
        service = ClientService:new()
        assert.same({}, service.request_handlers)
        service:init()
        assert.are.equal(scan_count + 1, #scans)
        service:open(nil, "a", 100, "alice")
        request(1, "UserSnapshotReq", {})
        local created = first("扫描后发送")
        request(3, "SessionModelSetReq", { session_id = created.id, model_id = "pro" })
        request(4, "MessageCancelReq", { session_id = created.id, run_id = created.run_id })
        assert.is_true(coroutine.resume(tasks[1]))
        assert.has_error(function() service:init() end, "Agent 提示词模板已经加载")
        assert.are.equal(scan_count + 1, #scans)
    end)

    it("按实际 User 路径扫描第一层模块并依序接入任意 handler，跳过无 handler 目录", function()
        local root = "/relocated/lualib/user/mods"
        local file, checked = require("file"), {}
        package.searchpath = function(name, path)
            if name == "user.handler" then return "/relocated/lualib/user/handler.lua" end
            return original_searchpath(name, path)
        end
        file.list_directories = function(directory)
            scans[#scans + 1] = directory
            assert.are.equal(root, directory)
            return { "calendar", "chat", "empty", "reports" }
        end
        file.list_files = function(directory)
            checked[#checked + 1] = directory
            if directory == root .. "/empty" then return { "README.md", "handler.lua.bak" } end
            return { "handler.lua", "module.lua" }
        end
        local calendar = { CalendarReq = function(user, args)
            return { ret = codes.succ, username = user.username, value = args.value }
        end }
        local reports = { ReportReq = function(user) return { ret = codes.succ, user_id = user.id } end }
        package.loaded["user.mods.calendar.handler"] = { REQUEST = calendar }
        package.loaded["user.mods.reports.handler"] = { REQUEST = reports }
        package.loaded["user.mods.empty.handler"] = { REQUEST = { SkippedReq = function() error("无 handler") end } }
        package.loaded["user.mods.empty.nested.handler"] = {
            REQUEST = { NestedReq = function() error("不能递归接入") end },
        }
        local scan_count = #scans
        service = require("client"):new()
        service:init()
        assert.same({ root .. "/calendar", root .. "/chat", root .. "/empty", root .. "/reports" }, checked)
        assert.are.equal(scan_count + 1, #scans)
        assert.are.equal(4, #service.request_handlers)
        assert.are.equal(require("user.handler").REQUEST, service.request_handlers[1])
        assert.are.equal(calendar, service.request_handlers[2])
        assert.are.equal(require("user.mods.chat.handler").REQUEST, service.request_handlers[3])
        assert.are.equal(reports, service.request_handlers[4])
        service:open(nil, "a", 100, "alice")
        assert.same({ ret = codes.succ, username = "alice", value = "日期" },
            request(11, "CalendarReq", { value = "日期" }))
        assert.are.equal("CalendarRes", events[#events].args[3])
        assert.same({ ret = codes.succ, user_id = service.users.alice.id }, request(12, "ReportReq", {}))
        assert.are.equal(scan_count + 1, #scans)
    end)

    it("目录扫描失败不保留部分注册，修复后可重新初始化", function()
        local file = require("file")
        local list_directories = file.list_directories
        file.list_directories = function() return nil, "目录不可读" end
        local uninitialized = require("client"):new()
        local requests = uninitialized.request_handlers
        local ok, err = pcall(function() uninitialized:init() end)
        assert.is_false(ok)
        assert.matches("目录不可读", err, 1, true)
        assert.are.equal(requests, uninitialized.request_handlers)
        assert.same({}, uninitialized.request_handlers)
        assert.is_nil(uninitialized.prompt_templates)
        assert.are.equal(1, template_loads)
        file.list_directories = list_directories
        uninitialized:init()
        assert.are.equal(3, #uninitialized.request_handlers)
        assert.are.equal(templates, uninitialized.prompt_templates)
    end)

    it("后续模块加载失败不暴露已加载请求，修复后可完整注册", function()
        local file, directories = require("file"), { "chat", "unloadable" }
        file.list_directories = function() return directories end
        file.list_files = function() return { "handler.lua" } end
        local uninitialized = require("client"):new()
        local ok, err = pcall(function() uninitialized:init() end)
        assert.is_false(ok)
        assert.matches("user.mods.unloadable.handler", err, 1, true)
        assert.same({}, uninitialized.request_handlers)
        assert.is_nil(uninitialized.prompt_templates)
        assert.are.equal(1, template_loads)
        directories = { "chat" }
        uninitialized:init()
        assert.are.equal(2, #uninitialized.request_handlers)
        assert.are.equal(templates, uninitialized.prompt_templates)
    end)

    it("模块目录不可读不能作为无 handler 跳过，失败后不保留部分注册", function()
        local file, readable = require("file"), false
        local list_files = file.list_files
        file.list_directories = function() return { "chat", "unreadable" } end
        file.list_files = function(directory)
            if directory:match("/unreadable$") then
                if readable then return {} end
                return nil, "模块目录不可读"
            end
            return list_files(directory)
        end
        local uninitialized = require("client"):new()
        local ok, err = pcall(function() uninitialized:init() end)
        assert.is_false(ok)
        assert.matches("模块目录不可读", err, 1, true)
        assert.same({}, uninitialized.request_handlers)
        assert.is_nil(uninitialized.prompt_templates)
        assert.are.equal(1, template_loads)
        readable = true
        uninitialized:init()
        assert.are.equal(2, #uninitialized.request_handlers)
        assert.are.equal(templates, uninitialized.prompt_templates)
    end)

    it("根与扫描到的 handler 必须导出 REQUEST 表，失败不保留部分注册", function()
        for _, name in ipairs({ "user.handler", "user.mods.chat.handler" }) do
            local handler = require(name)
            for _, invalid in ipairs({ true, {}, { REQUEST = false }, { REQUEST = function() end } }) do
                package.loaded[name] = invalid
                local uninitialized = require("client"):new()
                assert.has_error(function() uninitialized:init() end,
                    "客户端请求 handler 必须导出 REQUEST 表: " .. name)
                assert.same({}, uninitialized.request_handlers)
                assert.is_nil(uninitialized.prompt_templates)
                assert.are.equal(1, template_loads)
            end
            package.loaded[name] = handler
        end
    end)

    it("User 入口无法定位时初始化失败且不扫描、不保留部分注册", function()
        package.searchpath = function(name, path)
            if name == "user.handler" then return nil, "入口不存在" end
            return original_searchpath(name, path)
        end
        local scan_count = #scans
        local uninitialized = require("client"):new()
        assert.has_error(function() uninitialized:init() end, "入口不存在")
        assert.same({}, uninitialized.request_handlers)
        assert.is_nil(uninitialized.prompt_templates)
        assert.are.equal(scan_count, #scans)
        assert.are.equal(1, template_loads)
    end)

    it("模板读取失败使初始化失败，服务不保留半份模板", function()
        local uninitialized = require("client"):new()
        require("agent.prompts").load_templates = function() error("模板文件无法读取", 0) end
        assert.has_error(function() uninitialized:init() end, "模板文件无法读取")
        assert.same({}, uninitialized.request_handlers)
        assert.is_nil(uninitialized.prompt_templates)
    end)

    it("请求表出现重复键时初始化失败，非函数成员也不能绕过检测", function()
        for _, value in ipairs({ function() end, {} }) do
            require("user.mods.chat.handler").REQUEST.UserSnapshotReq = value
            local uninitialized = require("client"):new()
            assert.has_error(function() uninitialized:init() end, "客户端请求重复注册: UserSnapshotReq")
            assert.same({}, uninitialized.request_handlers)
            assert.is_nil(uninitialized.prompt_templates)
        end
        assert.are.equal(1, template_loads)
    end)

    it("首发拒绝无效文本、模型与重试组合，不生成会话工作区或任务", function()
        service:open(nil, "a", 100, "alice")
        for _, args in ipairs({ {}, { text = "" }, { text = string.rep("x", 101) }, { text = "\255" },
            { text = "问题", model_id = "unknown" }, { text = "问题", retry_run_id = "old" } }) do
            local response = request(2, "ChatReq", args)
            assert.are.equal(codes.invalid_param, response.ret)
        end
        assert.same({}, service.users.alice:snapshot().chat_sessions)
        assert.are.equal(0, #workspaces)
        assert.are.equal(0, #tasks)
        assert.is_nil(next(service.pending_runs))
        assert.are.equal(codes.fail, send("unknown", "有效文本").ret)
    end)

    it("模型配置与 Agent 构造失败不登记会话，修复后首发可成功", function()
        service:open(nil, "a", 100, "alice")
        local config = require("etc.cfg").agent
        config.llm.api_key = nil
        assert.are.equal(codes.call_fail, send(nil, "问题").ret)
        assert.are.equal(0, #workspaces)
        config.llm.api_key = "test"
        model.create_fail = true
        assert.are.equal(codes.call_fail, send(nil, "问题").ret)
        assert.same({}, service.users.alice:snapshot().chat_sessions)
        assert.are.equal(0, #tasks)
        assert.is_nil(next(service.pending_runs))
        model.create_fail = false
        assert.are.equal(codes.succ, send("", "问题").ret)
        assert.are.equal(1, #service.users.alice:snapshot().chat_sessions)
    end)

    it("首发模型、权限策略和运行中模型切换返回一致包装", function()
        service:open(nil, "a", 100, "alice")
        model.yield = true
        local created = first("任务", { model_id = "pro" })
        local user = service.users.alice
        local session = user.chat.sessions[created.id]
        assert.are.equal("pro", session.agent.options.permission_llm.model)
        assert.is_true(coroutine.resume(tasks[1]))
        local run = session.run
        local switched = request(3, "SessionModelSetReq", { session_id = session.id, model_id = "test" })
        assert.are.equal(codes.succ, switched.ret)
        assert.are.equal("test", switched.chat_session.model_id)
        assert.are.equal("test", switched.chat_session.permission_model_id)
        assert.are.equal(run, session.run)
        assert.are.equal("test", session.agent.llm_config.model)
        require("etc.cfg").agent.permission.model_id = "pro"
        request(4, "SessionModelSetReq", { session_id = session.id, model_id = "test" })
        assert.are.equal("pro", session.agent.permission_config.model)
        assert.are.equal("pro", user:snapshot().permission_model_id)
        local denied = request(5, "SessionModelSetReq", { session_id = session.id, model_id = "unknown" })
        assert.are.equal(codes.invalid_param, denied.ret)
        assert.are.equal("test", session.model_id)
        assert.are.equal(codes.fail, request(6, "SessionModelSetReq", {
            session_id = "unknown", model_id = "pro" }).ret)
        assert.is_true(coroutine.resume(tasks[1]))
    end)

    it("按协议原名分发业务请求并关联响应", function()
        local snapshot = service:open(nil, "a", 100, "alice")
        assert.same(snapshot, request(41, "UserSnapshotReq", {}).snapshot)
        local response = send(nil, "新会话的问题")
        local created = response.chat_session.session
        assert.are.equal("新会话的问题", created.messages[1].content)
        assert.are.equal(status.streaming, created.messages[2].status)
        request(44, "MessageCancelReq", { session_id = created.id, run_id = created.run_id })
        local event = events[#events]
        assert.are.equal(100, event.address)
        assert.are.equal("send_response", event.command)
        assert.are.equal("a", event.args[1])
        assert.are.equal(44, event.args[2])
        assert.are.equal("MessageCancelRes", event.args[3])
        assert.is_true(service.users.alice.chat.sessions[created.id].run.cancelled)
        assert.is_true(coroutine.resume(tasks[1]))
    end)

    it("handler 连续两次原位热修后，新旧用户均通过稳定请求表调用最新实现", function()
        local module_names = { "user.handler", "user.mods.chat.handler" }
        local handlers, requests, originals, candidates = {}, {}, {}, {}
        for _, name in ipairs(module_names) do
            handlers[name] = require(name)
            requests[name] = handlers[name].REQUEST
            originals[name] = {}
            for request_name, method in pairs(requests[name]) do originals[name][request_name] = method end
        end
        local environment = setmetatable({
            loadfile = function()
                return function(name) return assert(candidates[name]) end
            end,
        }, { __index = _G })
        -- 仅替换候选源码的读取，兼容检查和原位更新均执行真实 hotfix.reload。
        local hotfix = assert(loadfile(assert(package.searchpath("hotfix", package.path)), "t", environment))()
        local function reload(version)
            local previous = {}
            for _, name in ipairs(module_names) do
                previous[name], candidates[name] = {}, { REQUEST = {} }
                for request_name, method in pairs(originals[name]) do
                    previous[name][request_name] = requests[name][request_name]
                    candidates[name].REQUEST[request_name] = function(user, args)
                        local response = method(user, args)
                        response.handler_version = version
                        return response
                    end
                end
            end
            local ok, err, report = hotfix.reload(module_names)
            assert.is_true(ok, err)
            assert.same({ updated = module_names, skipped = {} }, report)
            for _, name in ipairs(module_names) do
                assert.are.equal(handlers[name], require(name))
                assert.are.equal(requests[name], require(name).REQUEST)
                for request_name, method in pairs(previous[name]) do
                    assert.are_not.equal(method, requests[name][request_name])
                end
            end
        end
        local function check_handlers(version, connections)
            for _, connection in ipairs(connections) do
                local id, source = connection[1], connection[2]
                local snapshot = request(101, "UserSnapshotReq", {}, id, source)
                assert.are.equal(version, snapshot.handler_version)
                assert.are.equal(service.connections[id].user.id, snapshot.snapshot.user_id)
                local response = request(102, "ChatReq", { text = "热修验证", model_id = "pro" }, id, source)
                assert.are.equal(codes.succ, response.ret)
                assert.are.equal(version, response.handler_version)
                local session = response.chat_session.session
                local switched = request(103, "SessionModelSetReq", {
                    session_id = session.id, model_id = "test" }, id, source)
                assert.are.equal(codes.succ, switched.ret)
                assert.are.equal(version, switched.handler_version)
                assert.are.equal("test", switched.chat_session.model_id)
                local cancelled = request(104, "MessageCancelReq", {
                    session_id = session.id, run_id = session.run_id }, id, source)
                assert.are.equal(codes.succ, cancelled.ret)
                assert.are.equal(version, cancelled.handler_version)
                assert.is_true(coroutine.resume(tasks[#tasks]))
            end
        end
        service:open(nil, "a", 100, "alice")
        local user = service.users.alice
        check_handlers(nil, { { "a", 100 } })
        reload(2)
        service:open(nil, "b", 200, "bob")
        check_handlers(2, { { "a", 100 }, { "b", 200 } })
        reload(3)
        service:open(nil, "c", 300, "carol")
        check_handlers(3, { { "a", 100 }, { "b", 200 }, { "c", 300 } })
        assert.are.equal(user, service.users.alice)
        assert.are.equal(require("user"), getmetatable(user))
        assert.are.equal(3, #user:snapshot().chat_sessions)
        assert.is_nil(next(service.pending_runs))
    end)

    for _, name in ipairs({ "UnknownReq", "LoginReq" }) do
        it("拒绝用户不支持的请求 " .. name, function()
            service:open(nil, "a", 100, "alice")
            events = {}
            service:handle_request({ source = 100 }, "a", 2, name, {})
            assert.same({ { address = 100, command = "close_connection",
                args = table.pack("a", codes.websocket_policy_violation, "未知请求") } }, events)
        end)
    end

    it("同名成员不是函数时按未知请求拒绝", function()
        service:open(nil, "a", 100, "alice")
        for _, value in ipairs({ {}, false }) do
            require("user.handler").REQUEST.UserSnapshotReq = value
            events = {}
            service:handle_request({ source = 100 }, "a", 2, "UserSnapshotReq", {})
            assert.same({ { address = 100, command = "close_connection",
                args = table.pack("a", codes.websocket_policy_violation, "未知请求") } }, events)
        end
    end)

    it("User 同名方法不会成为未注册请求的处理入口", function()
        service:open(nil, "a", 100, "alice")
        local called = false
        require("user").UnknownReq = function() called = true end
        service:handle_request({ source = 100 }, "a", 2, "UnknownReq", {})
        assert.is_false(called)
        assert.same({ { address = 100, command = "close_connection",
            args = table.pack("a", codes.websocket_policy_violation, "未知请求") } }, events)
    end)

    it("处理方法异常时关闭连接且不发送业务响应", function()
        service:open(nil, "a", 100, "alice")
        require("user.handler").REQUEST.UserSnapshotReq = function() error("请求处理异常") end
        events = {}
        service:handle_request({ source = 100 }, "a", 2, "UserSnapshotReq", {})
        assert.same({ { address = 100, command = "close_connection",
            args = table.pack("a", codes.websocket_internal_error, "请求处理失败") } }, events)
    end)

    it("同名共享用户，异名隔离，断线只移除订阅", function()
        local a = service:open(nil, "a", 100, "alice")
        local b = service:open(nil, "b", 200, "alice")
        local c = service:open(nil, "c", 100, "bob")
        assert.are.equal(a.user_id, b.user_id)
        assert.are_not.equal(a.user_id, c.user_id)
        first("共享")
        local running = service.users.alice:snapshot()
        service:disconnect(nil, "a")
        service:disconnect(nil, "b")
        assert.same(running, service:open(nil, "d", 300, "alice"))
        assert.same({}, c.chat_sessions)
    end)

    it("服务计数重新开始时，新用户 ID 也不能复用旧 ID", function()
        local previous = service:open(nil, "a", 100, "alice")
        next_id = 0
        local restarted_service = require("client"):new()
        restarted_service:init()
        local restarted = restarted_service:open(nil, "a", 100, "alice")
        assert.are_not.equal(previous.user_id, restarted.user_id)
    end)

    it("离线任务继续完成，快照与模型上下文均恢复", function()
        service:open(nil, "a", 100, "alice")
        local created = first()
        local running = service.users.alice:snapshot()
        service:disconnect(nil, "a")
        assert.is_true(coroutine.resume(tasks[1]))
        local restored = service:open(nil, "b", 200, "alice")
        assert.are.equal(status.streaming, running.chat_sessions[1].session.messages[2].status)
        assert.are.equal(status.completed, restored.chat_sessions[1].session.messages[2].status)
        assert.same({ "问题" }, service.users.alice.chat.sessions[created.id].agent.messages)
        assert.are.equal("回答", restored.chat_sessions[1].session.messages[2].content)
    end)

    it("只向同用户广播，拒绝伪造来源与跨用户操作", function()
        service:open(nil, "a", 100, "alice")
        service:open(nil, "b", 200, "alice")
        service:open(nil, "c", 300, "bob")
        local created = first()
        assert.are.equal(3, #events)
        assert.are.equal(0, events[1].args[2])
        assert.are.equal("SessionUpdatedNtf", events[1].args[3])
        assert.are.equal(codes.fail, request(2, "ChatReq", { session_id = created.id, text = "越权" }, "c", 300).ret)
        local count = #events
        service:handle_request({ source = 999 }, "a", 3, "ChatReq", { text = "伪造" })
        service:handle_request({ source = 100 }, "missing", 4, "ChatReq", { text = "无效连接" })
        assert.are.equal(count, #events)
        assert.are.equal(1, #service.users.alice:snapshot().chat_sessions)
        assert.same({}, service.users.bob:snapshot().chat_sessions)
    end)

    it("同会话串行，不同会话并行，任一端可取消且退出前不释放占用", function()
        service:open(nil, "a", 100, "alice")
        service:open(nil, "b", 200, "alice")
        local first_id = first("一").id
        assert.are.equal(codes.server_busy, send(first_id, "重复").ret)
        local second_id = first("二").id
        assert.are.equal(2, #tasks)
        local user = service.users.alice
        local run = user.chat.sessions[first_id].run
        request(4, "MessageCancelReq", { session_id = first_id, run_id = run.id }, "b", 200)
        assert.is_true(run.cancelled)
        assert.are.equal(run, user.chat.sessions[first_id].run)
        assert.is_true(coroutine.resume(tasks[1]))
        assert.is_nil(user.chat.sessions[first_id].run)
        assert.are.equal(status.cancelled, user.chat.sessions[first_id].messages[2].status)
        assert.same({}, user.chat.sessions[first_id].agent.messages)
        assert.is_true(coroutine.resume(tasks[2]))
        assert.are.equal(status.completed, user.chat.sessions[second_id].messages[2].status)
        send(first_id, "三")
        assert.are.equal(3, #tasks)
    end)

    it("失败历史与错误状态保留，重试原位替换且不污染上下文", function()
        service:open(nil, "a", 100, "alice")
        model.fail = true
        local created = first()
        local session = service.users.alice.chat.sessions[created.id]
        assert.is_true(coroutine.resume(tasks[1]))
        local failed_id, message_id = session.messages[2].run_id, session.messages[2].id
        assert.are.equal(status.failed, session.messages[2].status)
        assert.same({}, session.agent.messages)
        model.fail = false
        send(session.id, "", "a", { retry_run_id = failed_id })
        assert.are.equal(2, #session.messages)
        assert.are.equal(message_id, session.messages[2].id)
        assert.are_not.equal(failed_id, session.messages[2].run_id)
        assert.is_true(coroutine.resume(tasks[2]))
        assert.same({ "问题" }, session.agent.messages)
        assert.are.equal(codes.invalid_param, send(session.id, "", "a", { retry_run_id = failed_id }).ret)
    end)

    it("原轮次完成后的工具更新仍定位原消息并复制通知快照", function()
        service:open(nil, "a", 100, "alice")
        local created = first()
        local session = service.users.alice.chat.sessions[created.id]
        local run = session.run
        local record = { id = "tool", name = "exec_command", status = "running", output = "初始", run_id = run.id }
        run.assistant.tool_calls = { record }
        assert.is_true(coroutine.resume(tasks[1]))
        send(session.id, "下一轮")
        local current = session.run
        local revision = session.revision
        session:_on_tool_update(run.message_id, record)
        local update = events[#events].args[4]
        assert.are.equal("ToolUpdatedNtf", events[#events].args[3])
        assert.are.equal(run.message_id, update.message_id)
        assert.are.equal(revision + 1, update.revision)
        assert.are.equal(current, session.run)
        record.output = "终态"
        assert.are.equal("初始", update.tool.output)
        run:on_reasoning({ id = "thinking", text = "全部", status = "completed" }, "新增", "tool")
        assert.are.equal("ReasoningDeltaNtf", events[#events].args[3])
        assert.are.equal("新增", events[#events].args[4].block.text)
    end)

    it("取消已结束任务幂等，空ID无效，不存在会话失败", function()
        service:open(nil, "a", 100, "alice")
        local created = first()
        assert.is_true(coroutine.resume(tasks[1]))
        assert.are.equal(codes.succ, request(3, "MessageCancelReq", {
            session_id = created.id, run_id = created.run_id }).ret)
        assert.are.equal(codes.invalid_param, request(4, "MessageCancelReq", {
            session_id = created.id, run_id = "" }).ret)
        assert.are.equal(codes.fail, request(5, "MessageCancelReq", {
            session_id = "unknown", run_id = created.run_id }).ret)
    end)

    it("关闭时取消并等待所有请求，再关闭会话资源", function()
        assert.is_nil(service:open(nil, "bad", 100, ""))
        service:open(nil, "a", 100, "alice")
        local created = first()
        local session = service.users.alice.chat.sessions[created.id]
        local closing = coroutine.create(function() return service:close() end)
        assert.same({ true, "sleep" }, { coroutine.resume(closing) })
        assert.is_true(session.run.cancelled)
        assert.is_false(session.agent.closed)
        assert.is_true(coroutine.resume(tasks[1]))
        assert.same({ true, true }, { coroutine.resume(closing) })
        assert.is_true(session.agent.closed)
        assert.is_nil(next(service.pending_runs))
    end)
end)
