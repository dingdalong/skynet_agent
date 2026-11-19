local Scope = require("tests.support.modules")
local codes = require("enum.error_code")
local status = require("agent.message_status")

describe("用户与客户端服务", function()
    local scope, service, tasks, events, model, next_id, random_id, templates, template_loads, workspaces
    local apps, instances, agent_addresses
    before_each(function()
        tasks, events, next_id, random_id, workspaces = {}, {}, 0, 0, {}
        instances, agent_addresses = {}, { 1 }
        templates, template_loads = { base = "测试基础提示", permission_judge = "测试权限提示" }, 0
        model = { text = "回答" }
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
            client = false, ["client.user"] = false, ["agent.session"] = false,
            agent = false, ["agent.app"] = false, ["agent.chat"] = false, ["agent.handler"] = false,
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
            ["etc.cfg"] = { agent_gateway = { instance = { client = 1, logind = 1, websocket = 3 } },
                agent = { llm = { api_key = "test" }, project_instructions_max_bytes = 32768,
                tools = { workspace_root = "/test" }, permission = {},
                default_model_id = "test", models = {
                    { id = "test", name = "测试", model = "test" },
                    { id = "pro", name = "Pro", model = "pro" },
                },
                max_message_length = 100, session_title_length = 24 } },
            skynet = { localname = function(name)
                return ({ [".app_center"] = 80, [".logind_1"] = 20, [".websocket_1"] = 100, [".websocket_2"] = 200,
                    [".websocket_3"] = 300, [".client_1"] = 10, [".client_2"] = 11, [".shared"] = 77 })[name]
            end, genid = function() next_id = next_id + 1; return next_id end,
                fork = function(callback) tasks[#tasks + 1] = coroutine.create(callback) end,
                error = function() end, sleep = function() coroutine.yield("sleep") end },
            ["skynet.debug"] = {}, ["skynet.codecache"] = { clear = function() end },
            log = { info = function() end, failure = function() end },
            rpc = { call = function(address, command)
                assert.are.equal(80, address)
                assert.are.equal("subscribe", command)
                return codes.succ, { revision = 1, apps = { { app_id = "agent", addresses = agent_addresses,
                    enabled = true, requests = require("agent.routes").requests } } }
            end, call_no_timeout = function(address, command, ...)
                return codes.succ, instances[address][command](instances[address], { source = 10 }, ...)
            end, send = function(address, command, ...)
                if command == "publish" then
                    local username = ...
                    assert.are.equal(10, address)
                    for _, agent in ipairs(agent_addresses) do
                        if instances[agent].users[username] then
                            service:publish({ source = agent }, ...)
                            return codes.succ
                        end
                    end
                    error("未知 Agent 用户")
                end
                if command == "disconnect" then
                    instances[address]:disconnect({ source = 10 }, ...)
                    return codes.succ
                end
                events[#events + 1] = { address = address, command = command, args = table.pack(...) }
                return codes.succ
            end },
        })
        instances[1] = require("agent"):new()
        instances[1]:init()
        apps = instances[1].users
        service = require("client"):new()
        service:init()
    end)
    after_each(function()
        scope:restore()
    end)

    local function request(id, name, args, connection, source)
        service:handle_request({ source = source or 100 }, connection or "a", id, name, args)
        return events[#events].args[4]
    end

    local function open(id, websocket, username)
        if not service:open({ source = 20 }, id, websocket, username) then return nil end
        local snapshot = request(1, "AgentSnapshotReq", {}, id, websocket).snapshot
        table.remove(events)
        return snapshot
    end

    local function send(session_id, text, connection, extra)
        local args = extra or {}
        args.session_id, args.text = session_id, text
        return request(2, "ChatReq", args, connection)
    end

    local function first(text, extra)
        return send(nil, text or "问题", nil, extra).chat_session.session
    end

    it("登录只绑定身份；同名连接与重连按用户名选择同一常驻实例", function()
        instances[2] = require("agent"):new()
        instances[2]:init()
        agent_addresses[2] = 2
        service = require("client"):new()
        service:init()
        assert.is_nil(service:open({ source = 10 }, "bad", 100, "alice"))
        assert.is_nil(service:open({ source = 20 }, "bad", 10, "alice"))
        local identity = service:open({ source = 20 }, "a", 100, "alice")
        assert.same({ user_id = identity.user_id, username = "alice" }, identity)
        assert.same({}, instances[1].users)
        assert.same({}, instances[2].users)
        open("b", 200, "alice")
        request(2, "AgentSnapshotReq", {})
        open("c", 300, "bob")
        assert.is_truthy(instances[1].users.bob)
        assert.is_nil(instances[1].users.alice)
        local alice = instances[2].users.alice
        assert.is_truthy(alice.connections.a)
        assert.is_truthy(alice.connections.b)
        service:disconnect({ source = 100 }, "a")
        assert.same(identity.user_id, open("d", 100, "alice").user_id)
        assert.are.equal(alice, instances[2].users.alice)
        assert.is_nil(instances[2].users.bob)
    end)

    it("并发请求共享用户上下文，断开连接后丢弃迟到响应", function()
        local rpc = require("rpc")
        local call = rpc.call_no_timeout
        rpc.call_no_timeout = function(address, command, ...)
            local code, result = call(address, command, ...)
            coroutine.yield("reply")
            return code, result
        end
        local function start(id)
            service:open({ source = 20 }, id, 100, "alice")
            return coroutine.create(function()
                service:handle_request({ source = 100 }, id, 2, "AgentSnapshotReq", {})
            end)
        end
        local first_connection, second_connection = start("a"), start("b")
        assert.same({ true, "reply" }, { coroutine.resume(first_connection) })
        assert.same({ true, "reply" }, { coroutine.resume(second_connection) })
        service:disconnect({ source = 100 }, "a")
        assert.is_true(coroutine.resume(first_connection))
        assert.is_true(coroutine.resume(second_connection))
        assert.are.equal(1, #events)
        assert.are.equal("b", events[1].args[1])
        assert.is_nil(apps.alice.connections.a)
    end)

    it("应用请求失败可重试，失败期间保留登录身份", function()
        local rpc = require("rpc")
        local call = rpc.call_no_timeout
        service:open({ source = 20 }, "a", 100, "alice")
        rpc.call_no_timeout = function() return codes.call_fail end
        assert.are.equal(codes.call_fail, request(2, "AgentSnapshotReq", {}).ret)
        rpc.call_no_timeout = call
        assert.are.equal(codes.succ, request(3, "AgentSnapshotReq", {}).ret)
        assert.are.equal(service.users.alice.identity.user_id, apps.alice.identity.user_id)
    end)

    it("公共服务跨用户共用地址，每个请求和推送仍绑定身份", function()
        service = require("client"):new()
        service:init()
        service:sync_routes({ source = 80 }, { revision = 2, apps = {
            { app_id = "common", enabled = true, addresses = { 77 }, requests = { "CommonReq" } },
        } })
        local requests = {}
        instances[77] = { handle_request = function(_, _, identity)
            requests[#requests + 1] = identity.username
            return { ret = codes.succ }
        end }
        for _, name in ipairs({ "alice", "bob" }) do
            service:open({ source = 20 }, name, 100, name)
            request(2, "CommonReq", {}, name)
        end
        assert.same({ "alice", "bob" }, requests)
        assert.same({}, apps)
        events = {}
        service:publish({ source = 88 }, "alice", "CommonNtf", {})
        service:publish({ source = 77 }, "alice", "CommonNtf", {}, "bob")
        service:publish({ source = 77 }, "alice", "CommonNtf", {})
        assert.are.equal(1, #events)
        assert.are.equal("alice", events[1].args[1])
    end)

    it("首次快照只创建用户上下文，首条有效消息才创建会话及工作区", function()
        local snapshot = open("a", 100, "alice")
        assert.same({}, snapshot.chat_sessions)
        assert.are.equal("test", snapshot.default_model_id)
        assert.are.equal("", snapshot.permission_model_id)
        assert.are.equal(2, #snapshot.models)
        assert.same(snapshot, require("agent.handler").REQUEST.AgentSnapshotReq(apps.alice).snapshot)
        assert.are.equal(0, #workspaces)
        assert.are.equal(0, #tasks)
        assert.are.equal(0, #events)
        local created = first("第一条消息", { model_id = "pro" })
        local session = apps.alice.chat.sessions[created.id]
        assert.are.equal(require("agent.app"), getmetatable(apps.alice))
        assert.are.equal(require("agent.chat"), getmetatable(apps.alice.chat))
        assert.are.equal(require("agent.session"), getmetatable(session))
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

    it("服务变更整表替换，拒绝过期快照和未授权更新", function()
        open("a", 100, "alice")
        local snapshot = { revision = 3, apps = { { app_id = "agent", addresses = { 1 },
            requests = require("agent.routes").requests, enabled = false } } }
        assert.has_error(function() service:sync_routes({ source = 100 }, snapshot) end, "应用目录来源无效")
        assert.is_true(service:sync_routes({ source = 80 }, snapshot))
        snapshot.revision = 2
        snapshot.apps[1].enabled = true
        assert.is_true(service:sync_routes({ source = 80 }, snapshot))
        assert.are.equal(codes.server_busy, request(2, "AgentSnapshotReq", {}).ret)
        snapshot.revision = 4
        assert.is_true(service:sync_routes({ source = 80 }, snapshot))
        assert.are.equal(codes.succ, request(3, "AgentSnapshotReq", {}).ret)
    end)

    it("应用中心重推未确认的最新路由，取代旧版本的重试", function()
        local timers, delivered = {}, {}
        require("skynet").timeout = function(_, callback) timers[#timers + 1] = callback end
        require("rpc").call = function(address, command, snapshot)
            assert.are.equal(10, address)
            assert.are.equal("sync_routes", command)
            delivered[#delivered + 1] = snapshot.revision
            if #delivered < 3 then return codes.call_fail end
            return codes.succ, true
        end
        local center = require("app_center"):new()
        center:subscribe({ source = 10 })
        assert.is_false(center:_sync())
        assert.is_false(center:_sync())
        timers[1]()
        timers[2]()
        assert.same({ 1, 2, 2 }, delivered)
        assert.are.equal(2, #timers)
    end)

    it("服务初始化加载一次模板，各会话共享启动快照与项目规则上限", function()
        assert.are.equal(1, template_loads)
        open("a", 100, "alice")
        open("b", 200, "bob")
        first("一")
        first("二")
        assert.are.equal(1, template_loads)
        for _, session in pairs(apps.alice.chat.sessions) do
            assert.are.equal(templates, session.agent.templates)
            assert.are.equal(32768, session.agent.options.project_instructions_max_bytes)
        end
    end)

    it("应用下线等待路由重推成功后才允许回收实例", function()
        local retry, attempts = nil, 0
        require("skynet").timeout = function(_, callback) retry = callback end
        require("rpc").call = function()
            attempts = attempts + 1
            if attempts == 1 then return codes.call_fail end
            return codes.succ, true
        end
        local center = require("app_center"):new()
        center:subscribe({ source = 10 })
        local synced = coroutine.create(function() return center:_sync(true) end)
        assert.same({ true, "sleep" }, { coroutine.resume(synced) })
        retry()
        assert.same({ true, true }, { coroutine.resume(synced) })
    end)

    it("首发拒绝无效文本、模型与重试组合，不生成会话工作区或任务", function()
        open("a", 100, "alice")
        for _, args in ipairs({ {}, { text = "" }, { text = string.rep("x", 101) }, { text = "\255" },
            { text = "问题", model_id = "unknown" }, { text = "问题", retry_run_id = "old" } }) do
            local response = request(2, "ChatReq", args)
            assert.are.equal(codes.invalid_param, response.ret)
        end
        assert.same({}, apps.alice:snapshot().chat_sessions)
        assert.are.equal(0, #workspaces)
        assert.are.equal(0, #tasks)
        assert.is_nil(next(apps.alice.pending_runs))
        assert.are.equal(codes.fail, send("unknown", "有效文本").ret)
    end)

    it("模型配置与 Agent 构造失败不登记会话，修复后首发可成功", function()
        open("a", 100, "alice")
        local config = require("etc.cfg").agent
        config.llm.api_key = nil
        assert.are.equal(codes.call_fail, send(nil, "问题").ret)
        assert.are.equal(0, #workspaces)
        config.llm.api_key = "test"
        model.create_fail = true
        assert.are.equal(codes.call_fail, send(nil, "问题").ret)
        assert.same({}, apps.alice:snapshot().chat_sessions)
        assert.are.equal(0, #tasks)
        assert.is_nil(next(apps.alice.pending_runs))
        model.create_fail = false
        assert.are.equal(codes.succ, send("", "问题").ret)
        assert.are.equal(1, #apps.alice:snapshot().chat_sessions)
    end)

    it("首发模型、权限策略和运行中模型切换返回一致包装", function()
        open("a", 100, "alice")
        model.yield = true
        local created = first("任务", { model_id = "pro" })
        local user = apps.alice
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
        local snapshot = open("a", 100, "alice")
        assert.same(snapshot, request(41, "AgentSnapshotReq", {}).snapshot)
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
        assert.is_true(apps.alice.chat.sessions[created.id].run.cancelled)
        assert.is_true(coroutine.resume(tasks[1]))
    end)

    for _, name in ipairs({ "UnknownReq", "LoginReq" }) do
        it("拒绝用户不支持的请求 " .. name, function()
            open("a", 100, "alice")
            events = {}
            service:handle_request({ source = 100 }, "a", 2, name, {})
            assert.same({ { address = 100, command = "close_connection",
                args = table.pack("a", codes.websocket_policy_violation, "未知请求") } }, events)
        end)
    end

    it("同名共享用户，异名隔离，断线只移除订阅", function()
        local a = open("a", 100, "alice")
        local b = open("b", 200, "alice")
        local c = open("c", 100, "bob")
        assert.are.equal(a.user_id, b.user_id)
        assert.are_not.equal(a.user_id, c.user_id)
        first("共享")
        local running = apps.alice:snapshot()
        service:disconnect({ source = 20 }, "a")
        service:disconnect({ source = 20 }, "b")
        assert.same(running, open("d", 300, "alice"))
        assert.same({}, c.chat_sessions)
    end)

    it("服务计数重新开始时，新用户 ID 也不能复用旧 ID", function()
        local previous = open("a", 100, "alice")
        next_id = 0
        local restarted_service = require("client"):new()
        restarted_service:init(params)
        local restarted = restarted_service:open({ source = 20 }, "a", 100, "alice")
        assert.are_not.equal(previous.user_id, restarted.user_id)
    end)

    it("离线任务继续完成，快照与模型上下文均恢复", function()
        open("a", 100, "alice")
        local created = first()
        local running = apps.alice:snapshot()
        service:disconnect({ source = 20 }, "a")
        assert.is_true(coroutine.resume(tasks[1]))
        local restored = open("b", 200, "alice")
        assert.are.equal(status.streaming, running.chat_sessions[1].session.messages[2].status)
        assert.are.equal(status.completed, restored.chat_sessions[1].session.messages[2].status)
        assert.same({ "问题" }, apps.alice.chat.sessions[created.id].agent.messages)
        assert.are.equal("回答", restored.chat_sessions[1].session.messages[2].content)
    end)

    it("只向同用户广播，拒绝伪造来源与跨用户操作", function()
        open("a", 100, "alice")
        open("b", 200, "alice")
        open("c", 300, "bob")
        local created = first()
        assert.are.equal(3, #events)
        assert.are.equal(0, events[1].args[2])
        assert.are.equal("SessionUpdatedNtf", events[1].args[3])
        assert.are.equal(codes.fail, request(2, "ChatReq", { session_id = created.id, text = "越权" }, "c", 300).ret)
        local count = #events
        service:handle_request({ source = 999 }, "a", 3, "ChatReq", { text = "伪造" })
        service:handle_request({ source = 100 }, "missing", 4, "ChatReq", { text = "无效连接" })
        assert.are.equal(count, #events)
        assert.are.equal(1, #apps.alice:snapshot().chat_sessions)
        assert.same({}, apps.bob:snapshot().chat_sessions)
    end)

    it("服务拒绝其他 client 冒用身份或断开已有用户连接", function()
        require("etc.cfg").agent_gateway.instance.client = 2
        local agent = instances[1]
        local identity = { username = "alice", user_id = "alice-id" }
        local function snapshot(source, user)
            return agent:handle_request({ source = source }, user, "a", "AgentSnapshotReq", {})
        end
        assert.has_error(function() snapshot(10, identity) end)
        assert.is_nil(apps.alice)
        assert.are.equal(codes.succ, snapshot(11, identity).ret)
        assert.has_error(function() snapshot(11, { username = "alice", user_id = "other" }) end)
        assert.has_error(function() agent:disconnect({ source = 10 }, identity, "a") end)
        assert.is_truthy(apps.alice.connections.a)
        local bob = { username = "bob", user_id = "bob-id" }
        assert.are.equal(codes.succ, snapshot(10, bob).ret)
        agent:disconnect({ source = 10 }, bob, "a")
        assert.is_nil(apps.bob.connections.a)
        assert.is_truthy(apps.alice.connections.a)
    end)

    it("同一实例按用户隔离同名桌面、执行回执和设备通知", function()
        open("a", 100, "alice")
        open("b", 200, "bob")
        local device = { device_id = "desktop", name = "Alice", authorization_id = "auth" }
        assert.are.equal(codes.succ, request(2, "DesktopRegisterReq", device).ret)
        assert.are.equal(2, #events)
        assert.are.equal("a", events[1].args[1])
        assert.same({}, apps.bob:snapshot().desktops)
        device.name = "Bob"
        assert.are.equal(codes.succ, request(2, "DesktopRegisterReq", device, "b", 200).ret)
        local pending = { connection = apps.alice.connections.a }
        apps.alice.execution.pending.call = pending
        request(3, "ExecutionResultReq", { request_id = "call", result = "{}" }, "b", 200)
        assert.is_nil(pending.result)
        service:disconnect({ source = 200 }, "b")
        assert.are.equal("Alice", apps.alice:snapshot().desktops[1].name)
        assert.is_true(apps.alice:snapshot().desktops[1].online)
        assert.is_false(apps.bob:snapshot().desktops[1].online)
    end)

    it("同会话串行，不同会话并行，任一端可取消且退出前不释放占用", function()
        open("a", 100, "alice")
        open("b", 200, "alice")
        local first_id = first("一").id
        assert.are.equal(codes.server_busy, send(first_id, "重复").ret)
        local second_id = first("二").id
        assert.are.equal(2, #tasks)
        local user = apps.alice
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
        open("a", 100, "alice")
        model.fail = true
        local created = first()
        local session = apps.alice.chat.sessions[created.id]
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
        open("a", 100, "alice")
        local created = first()
        local session = apps.alice.chat.sessions[created.id]
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
        open("a", 100, "alice")
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
        assert.is_nil(open("bad", 100, ""))
        open("a", 100, "alice")
        local created = first()
        local session = apps.alice.chat.sessions[created.id]
        open("b", 100, "bob")
        local other_id = send(nil, "第二个用户", "b").chat_session.session.id
        local other = apps.bob.chat.sessions[other_id]
        local closing = coroutine.create(function() return instances[1]:close() end)
        assert.same({ true, "sleep" }, { coroutine.resume(closing) })
        assert.is_true(session.run.cancelled)
        assert.is_true(other.run.cancelled)
        assert.is_false(session.agent.closed)
        assert.is_true(coroutine.resume(tasks[1]))
        assert.same({ true, "sleep" }, { coroutine.resume(closing) })
        assert.is_true(coroutine.resume(tasks[2]))
        assert.same({ true, true }, { coroutine.resume(closing) })
        assert.is_true(session.agent.closed)
        assert.is_true(other.agent.closed)
        assert.is_nil(next(apps.alice.pending_runs))
    end)

    it("同一实例某个用户清理失败仍收尾其他用户的会话", function()
        open("a", 100, "alice")
        open("b", 100, "bob")
        local alice = apps.alice.chat.sessions[first().id]
        local bob = apps.bob.chat.sessions[send(nil, "任务", "b").chat_session.session.id]
        alice.run.llm_request = { cancel = function() error("取消失败") end }
        alice.agent.close = function() error("清理失败") end
        local closing = coroutine.create(function() return instances[1]:close() end)
        assert.same({ true, "sleep" }, { coroutine.resume(closing) })
        assert.is_true(alice.run.cancelled)
        assert.is_true(bob.run.cancelled)
        for _, task in ipairs(tasks) do assert.is_true(coroutine.resume(task)) end
        assert.same({ true, false }, { coroutine.resume(closing) })
        assert.is_true(bob.agent.closed)
    end)
end)
