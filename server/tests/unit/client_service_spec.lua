local error_code = require("enum.error_code")
local message_status = require("enum.message_status")

local client_service
local agent_config
local fake_conversation
local responses
local skynet_mock

---@param captured_responses table[]
---@return client.Service
local function new_service(captured_responses)
    responses = captured_responses
    return client_service:new()
end

describe("client_service", function()
    local original_conversation
    local original_client_connection
    local original_client_service
    local original_config
    local original_skynet
    local original_rpc
    local original_log

    before_each(function()
        local Conversation = {}
        Conversation.__index = Conversation
        function Conversation:chat(_, on_text_delta)
            on_text_delta(fake_conversation.response_text)
            return fake_conversation.response_text
        end

        fake_conversation = {
            response_text = "回答",
        }
        function fake_conversation:new(llm_config, system_prompt)
            fake_conversation.llm_config = llm_config
            fake_conversation.system_prompt = system_prompt
            return setmetatable({}, Conversation)
        end

        local next_id = 0
        responses = {}
        skynet_mock = {
            error = function()
            end,
            fork = function(callback)
                callback()
            end,
            genid = function()
                next_id = next_id + 1
                return next_id
            end,
            send = function(address, protocol, command, fd, message_id, name, args)
                assert.are.equal("lua", protocol)
                assert.are.equal("send_response", command)
                responses[#responses + 1] = {
                    websocket_address = address,
                    fd = fd,
                    message_id = message_id,
                    name = name,
                    args = args,
                }
            end,
        }
        agent_config = {
            llm = {
                api_key = "secret",
                base_url = "https://api.example.com",
                model = "test-model",
            },
            system_prompt = "测试系统提示",
            max_message_length = 20000,
            session_title_length = 24,
        }

        original_conversation = package.loaded["agent.conversation"]
        original_client_connection = package.loaded["client.connection"]
        original_client_service = package.loaded["client"]
        original_config = package.loaded["etc.cfg"]
        original_rpc = package.loaded["rpc"]
        original_log = package.loaded["log"]
        package.loaded["log"] = { info = function() end, failure = function() end }
        package.loaded["rpc"] = { send = function(address, command, ...)
            return skynet_mock.send(address, "lua", command, ...)
        end }
        original_skynet = package.loaded.skynet
        package.loaded["agent.conversation"] = fake_conversation
        package.loaded["etc.cfg"] = {
            agent = agent_config,
        }
        package.loaded.skynet = skynet_mock
        package.loaded["client.connection"] = nil
        package.loaded["client"] = nil
        client_service = require("client")
    end)

    after_each(function()
        package.loaded["agent.conversation"] = original_conversation
        package.loaded["client.connection"] = original_client_connection
        package.loaded["client"] = original_client_service
        package.loaded["etc.cfg"] = original_config
        package.loaded["rpc"] = original_rpc
        package.loaded["log"] = original_log
        package.loaded.skynet = original_skynet
    end)

    it("为多个连接建立隔离会话并按 Proto 名称路由", function()
        local responses = {}
        local instance = new_service(responses)
        local first = assert(instance:open(nil, 11, 101))
        local second = assert(instance:open(nil, 12, 102))

        assert.are_not.equal(first.active_session_id, second.active_session_id)
        assert.is_not_nil(instance.connections[11])
        assert.is_not_nil(instance.connections[12])

        instance:handle_request({ source = 101 }, 11, 21, "MessageSendReq", {
            session_id = first.active_session_id,
            text = "连接十一",
        })

        assert.are.equal(101, responses[1].websocket_address)
        assert.are.equal(11, responses[1].fd)
        assert.are.equal(21, responses[1].message_id)

        local completed
        for _, response in ipairs(responses) do
            assert.are.equal(101, response.websocket_address)
            assert.are.equal(11, response.fd)
            assert.are.equal(21, response.message_id)
            if
                response.name == "MessageSendRes"
                and response.args.ret == error_code.succ
                and response.args.status == message_status.completed
            then
                completed = response
            end
        end
        assert.is_not_nil(completed)
        assert.are.equal("回答", completed.args.message.content)
    end)

    it("断开一个连接不影响其他连接", function()
        local responses = {}
        local instance = new_service(responses)
        assert(instance:open(nil, 11, 101))
        local second = assert(instance:open(nil, 12, 102))

        instance:disconnect(nil, 11)
        assert.is_nil(instance.connections[11])
        assert.is_not_nil(instance.connections[12])

        instance:handle_request({ source = 102 }, 12, 12, "MessageSendReq", {
            session_id = second.active_session_id,
            text = "连接十二",
        })
        assert.are.equal(102, responses[#responses].websocket_address)
        assert.are.equal(12, responses[#responses].fd)
    end)

    it("缺少模型配置时拒绝建立连接", function()
        agent_config.llm.api_key = nil
        local instance = client_service:new()
        local snapshot = instance:open(nil, 11, 101)
        assert.is_nil(snapshot)
        assert.same({}, instance.connections)
    end)

    it("未知请求关闭连接，并拒绝错误来源", function()
        local instance = new_service({})
        assert(instance:open(nil, 11, 101))
        local closed
        package.loaded["rpc"].send = function(address, command, id, code)
            closed = { address, command, id, code }
        end
        instance:handle_request({ source = 102 }, 11, 1, "MessageSendReq", {})
        assert.is_nil(closed)
        instance:handle_request({ source = 101 }, 11, 1, "LoginReq", {})
        assert.same({ 101, "close_connection", 11, error_code.websocket_policy_violation }, closed)
    end)
    it("断线后仍跟踪后台生成，close 等待协程收尾", function()
        local pending
        skynet_mock.fork = function(callback) pending = callback end
        skynet_mock.sleep = function() coroutine.yield() end
        local instance = new_service({})
        local snapshot = instance:open(nil, "pending", 101)
        instance:handle_request({ source = 101 }, "pending", 1, "MessageSendReq", {
            session_id = snapshot.active_session_id, text = "test",
        })
        local request = next(instance.pending_requests)
        assert.is_not_nil(request)
        instance:disconnect(nil, "pending")
        assert.same({}, instance.connections)
        assert.is_true(request.cancelled)
        assert.is_not_nil(next(instance.pending_requests))
        local done = false
        local closing = coroutine.create(function() instance:close(); done = true end)
        assert.is_true(coroutine.resume(closing))
        assert.is_false(done)
        pending()
        assert.is_nil(next(instance.pending_requests))
        assert.is_true(coroutine.resume(closing))
        assert.is_true(done)
    end)

    it("取消资源失败不能报告清理成功", function()
        local instance = new_service({})
        local request = { cancel = function(self)
            instance.pending_requests[self] = nil
            return false
        end }
        instance.pending_requests[request] = true
        assert.is_false(instance:close())
    end)

    it("取消后迟到的资源释放失败仍传播到关服结果", function()
        local instance = new_service({})
        local request = { cancel = function() return true end }
        instance.pending_requests[request] = true
        skynet_mock.sleep = function() coroutine.yield() end
        local result
        local closing = coroutine.create(function() result = instance:close() end)
        assert.is_true(coroutine.resume(closing))
        assert.is_nil(result)
        request.close_error = "late stream close failed"
        instance.pending_requests[request] = nil
        assert.is_true(coroutine.resume(closing))
        assert.is_false(result)
    end)

    it("取消一个请求期间其他请求结束也不会遗漏释放失败", function()
        local instance = new_service({})
        local function cancel(request)
            for other in pairs(instance.pending_requests) do
                if other ~= request then
                    other.close_error = "concurrent stream close failed"
                    instance.pending_requests[other] = nil
                end
            end
            instance.pending_requests[request] = nil
            return true
        end
        instance.pending_requests[{ cancel = cancel }] = true
        instance.pending_requests[{ cancel = cancel }] = true
        assert.is_false(instance:close())
    end)

end)
