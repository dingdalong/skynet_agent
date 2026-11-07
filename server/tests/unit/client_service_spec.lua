local Scope = require("tests.support.modules")
local codes = require("enum.error_code")
local status = require("enum.message_status")

describe("用户与客户端服务", function()
    local scope, service, tasks, events, model, next_id, random_id
    before_each(function()
        tasks, events, next_id, random_id = {}, {}, 0, 0
        model = { text = "回答" }
        local conversation = require("class")()
        function conversation:ctor() self.messages = {} end
        function conversation:chat(text, on_delta, request)
            if model.yield then coroutine.yield("generating") end
            if request.cancelled then return nil, "cancelled" end
            on_delta("回")
            if model.fail then return nil, "upstream failed" end
            on_delta("答")
            self.messages[#self.messages + 1] = text
            return model.text
        end
        scope = Scope.new({
            user = false, client = false,
            ["skynet.crypt"] = {
                randomkey = function() random_id = random_id + 1; return tostring(random_id) end,
                hexencode = function(value) return value end,
            },
            ["agent.conversation"] = conversation,
            ["etc.cfg"] = { agent = { llm = { api_key = "test" }, system_prompt = "test",
                max_message_length = 100, session_title_length = 24 } },
            skynet = { genid = function() next_id = next_id + 1; return next_id end,
                fork = function(callback) tasks[#tasks + 1] = coroutine.create(callback) end,
                error = function() end, sleep = function() coroutine.yield("sleep") end },
            log = { info = function() end, failure = function() end },
            rpc = { send = function(address, command, ...)
                events[#events + 1] = { address = address, command = command, args = table.pack(...) }
                return codes.succ
            end },
        })
        service = require("client"):new()
    end)
    after_each(function() scope:restore() end)

    local function send(session_id, text, connection, extra)
        local args = extra or {}
        args.session_id, args.text = session_id, text
        service:handle_request({ source = 100 }, connection or "a", 2, "MessageSendReq", args)
    end

    it("同名共享用户，异名隔离，断线只移除订阅", function()
        local a = service:open(nil, "a", 100, "alice")
        local b = service:open(nil, "b", 200, "alice")
        local c = service:open(nil, "c", 100, "bob")
        assert.are.equal(a.user_id, b.user_id)
        assert.are.equal(a.sessions[1].id, b.sessions[1].id)
        assert.are_not.equal(a.user_id, c.user_id)
        service:disconnect(nil, "a")
        service:disconnect(nil, "b")
        local restored = service:open(nil, "d", 300, "alice")
        assert.same(a, restored)
    end)

    it("服务计数重新开始时，新用户 ID 也不能复用旧 ID", function()
        local previous = service:open(nil, "a", 100, "alice")
        next_id = 0
        local restarted = require("client"):new():open(nil, "a", 100, "alice")
        assert.are_not.equal(previous.user_id, restarted.user_id)
    end)

    it("离线任务继续完成，快照与模型上下文均恢复", function()
        local snapshot = service:open(nil, "a", 100, "alice")
        local session_id = snapshot.sessions[1].id
        send(session_id, "问题")
        local running = service.users.alice:snapshot()
        service:disconnect(nil, "a")
        assert.is_true(coroutine.resume(tasks[1]))
        local restored = service:open(nil, "b", 200, "alice")
        assert.are.equal(status.streaming, running.sessions[1].messages[2].status)
        assert.are.equal(status.completed, restored.sessions[1].messages[2].status)
        assert.same({ "问题" }, service.users.alice.sessions[session_id].conversation.messages)
        assert.are.equal("回答", restored.sessions[1].messages[2].content)
    end)

    it("只向同用户广播，拒绝伪造来源与跨用户操作", function()
        local a = service:open(nil, "a", 100, "alice")
        service:open(nil, "b", 200, "alice")
        service:open(nil, "c", 300, "bob")
        events = {}
        send(a.sessions[1].id, "问题")
        assert.are.equal(3, #events)
        assert.are.equal(0, events[1].args[2])
        assert.are.equal("SessionUpdatedNtf", events[1].args[3])
        service:handle_request({ source = 300 }, "c", 2, "MessageSendReq", {
            session_id = a.sessions[1].id, text = "越权",
        })
        assert.are.equal(codes.fail, events[#events].args[4].ret)
        local count = #events
        service:handle_request({ source = 999 }, "a", 3, "SessionCreateReq", {})
        assert.are.equal(count, #events)
    end)

    it("同会话串行，不同会话并行，任一端可取消且退出前不释放占用", function()
        local a = service:open(nil, "a", 100, "alice")
        service:open(nil, "b", 200, "alice")
        local user = service.users.alice
        local first = a.sessions[1].id
        local second = user:SessionCreateReq().session.id
        send(first, "一")
        send(first, "重复")
        assert.are.equal(codes.server_busy, events[#events].args[4].ret)
        send(second, "二")
        assert.are.equal(2, #tasks)
        local request = user.sessions[first].request
        service:handle_request({ source = 200 }, "b", 4, "MessageCancelReq", {
            session_id = first, run_id = request.id,
        })
        assert.is_true(request.cancelled)
        assert.are.equal(request, user.sessions[first].request)
        assert.is_true(coroutine.resume(tasks[1]))
        assert.is_nil(user.sessions[first].request)
        assert.are.equal(status.cancelled, user.sessions[first].messages[2].status)
        assert.same({}, user.sessions[first].conversation.messages)
        assert.is_true(coroutine.resume(tasks[2]))
        assert.are.equal(status.completed, user.sessions[second].messages[2].status)
        send(first, "三")
        assert.are.equal(3, #tasks)
    end)

    it("失败历史与错误状态保留，重试原位替换且不污染上下文", function()
        local snapshot = service:open(nil, "a", 100, "alice")
        local session = service.users.alice.sessions[snapshot.sessions[1].id]
        model.fail = true
        send(session.id, "问题")
        assert.is_true(coroutine.resume(tasks[1]))
        local failed_id, message_id = session.messages[2].run_id, session.messages[2].id
        assert.are.equal(status.failed, session.messages[2].status)
        assert.same({}, session.conversation.messages)
        model.fail = false
        send(session.id, "", "a", { retry_run_id = failed_id })
        assert.are.equal(2, #session.messages)
        assert.are.equal(message_id, session.messages[2].id)
        assert.are_not.equal(failed_id, session.messages[2].run_id)
        assert.is_true(coroutine.resume(tasks[2]))
        assert.same({ "问题" }, session.conversation.messages)
        send(session.id, "", "a", { retry_run_id = failed_id })
        assert.are.equal(codes.invalid_param, events[#events].args[4].ret)
    end)

    it("无效用户名与无效消息失败不创建任务", function()
        assert.is_nil(service:open(nil, "bad", 100, ""))
        local snapshot = service:open(nil, "a", 100, "alice")
        send(snapshot.sessions[1].id, string.rep("x", 101))
        assert.are.equal(codes.invalid_param, events[#events].args[4].ret)
        assert.are.equal(0, #tasks)
    end)

    it("关闭时取消并等待仍在后台执行的所有请求", function()
        local snapshot = service:open(nil, "a", 100, "alice")
        send(snapshot.sessions[1].id, "问题")
        local closing = coroutine.create(function() return service:close() end)
        assert.same({ true, "sleep" }, { coroutine.resume(closing) })
        local request = service.users.alice.sessions[snapshot.sessions[1].id].request
        assert.is_true(request.cancelled)
        assert.is_true(coroutine.resume(tasks[1]))
        assert.same({ true, true }, { coroutine.resume(closing) })
    end)
end)
