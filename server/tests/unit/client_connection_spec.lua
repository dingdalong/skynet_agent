local error_code = require("enum.error_code")
local message_status = require("enum.message_status")

local connection
local fake_conversation
local agent_config
local skynet_mock

---@param responses table[]
---@param name string
---@param message_id integer
---@param ret integer?
---@param status message_status?
---@return table|nil
local function find_response(responses, name, message_id, ret, status)
    for _, response in ipairs(responses) do
        if
            response.name == name
            and response.message_id == message_id
            and (ret == nil or response.args.ret == ret)
            and (status == nil or response.args.status == status)
        then
            return response
        end
    end
    return nil
end

---@param response_handler fun(on_text_delta: fun(delta: string)): string|nil, string|nil
---@param overrides table?
---@return client.Connection
---@return table[]
local function new_connection(response_handler, overrides)
    local responses = {}
    overrides = overrides or {}
    fake_conversation.response_handler = response_handler
    agent_config.max_message_length = overrides.max_message_length or 20000
    agent_config.session_title_length = overrides.session_title_length or 24
    skynet_mock.fork = overrides.fork or function(callback)
        callback()
    end
    local function response_writer(message_id, name, args)
        responses[#responses + 1] = {
            message_id = message_id,
            name = name,
            args = args,
        }
    end
    return connection:new(response_writer), responses
end

describe("client_connection", function()
    local original_conversation
    local original_connection
    local original_config
    local original_skynet

    before_each(function()
        local Conversation = {}
        Conversation.__index = Conversation
        function Conversation:chat(_, on_text_delta)
            return fake_conversation.response_handler(on_text_delta)
        end

        fake_conversation = {
            response_handler = nil,
        }
        function fake_conversation:new(llm_config, system_prompt)
            fake_conversation.llm_config = llm_config
            fake_conversation.system_prompt = system_prompt
            return setmetatable({}, Conversation)
        end

        local next_id = 0
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
        original_connection = package.loaded["client.connection"]
        original_config = package.loaded["etc.cfg"]
        original_skynet = package.loaded.skynet
        package.loaded["agent.conversation"] = fake_conversation
        package.loaded["etc.cfg"] = {
            agent = agent_config,
        }
        package.loaded.skynet = skynet_mock
        package.loaded["client.connection"] = nil
        connection = require("client.connection")
    end)

    after_each(function()
        package.loaded["agent.conversation"] = original_conversation
        package.loaded["client.connection"] = original_connection
        package.loaded["etc.cfg"] = original_config
        package.loaded.skynet = original_skynet
    end)

    it("通过 Proto 同名 Handler 创建会话并返回直接响应", function()
        local instance, responses = new_connection(function()
            return "不会执行"
        end)
        local initial = assert(instance:create_session())
        local initial_snapshot = assert(instance:snapshot())
        assert.are.equal(initial.id, initial_snapshot.active_session_id)

        instance:SessionCreateReq(2, {})

        local response =
            assert(find_response(responses, "SessionCreateRes", 2, error_code.succ))
        assert.is_not_nil(response.args.session)
        assert.are.equal(2, #instance:snapshot().sessions)
    end)

    it("发送消息时聚合流式回答并复用原消息 ID", function()
        local instance, responses = new_connection(function(on_text_delta)
            on_text_delta("你")
            on_text_delta("好")
            return "你好"
        end)
        local session = assert(instance:create_session())

        instance:MessageSendReq(3, {
            session_id = session.id,
            text = "测试消息",
        })

        local streaming = 0
        for _, response in ipairs(responses) do
            assert.are.equal(3, response.message_id)
            if response.name == "MessageSendRes" then
                assert.are.equal(error_code.succ, response.args.ret)
                if response.args.status == message_status.streaming then
                    streaming = streaming + 1
                end
            end
        end
        assert.are.equal(2, streaming)

        local completed = assert(find_response(
            responses,
            "MessageSendRes",
            3,
            error_code.succ,
            message_status.completed
        ))
        assert.are.equal(error_code.succ, completed.args.ret)
        assert.are.equal("你好", completed.args.message.content)
        assert.are.equal("测试消息", session.title)
        assert.are.equal(2, #session.messages)
        assert.is_nil(instance.active_request)
    end)

    it("失败时回滚用户消息并返回可重试错误", function()
        local instance, responses = new_connection(function()
            return nil, "上游失败"
        end)
        local session = assert(instance:create_session())

        instance:MessageSendReq(2, {
            session_id = session.id,
            text = "失败消息",
        })

        local failed =
            assert(find_response(responses, "MessageSendRes", 2, error_code.call_fail))
        assert.are.equal(error_code.call_fail, failed.args.ret)
        assert.is_nil(failed.args.status)
        assert.is_nil(failed.args.error.code)
        assert.are.equal("对话请求失败，请稍后重试", failed.args.error.message)
        assert.is_true(failed.args.error.retryable)
        assert.are.equal(0, #session.messages)
    end)

    it("取消请求先确认，再用原消息 ID 返回取消终态", function()
        local pending
        local instance, responses = new_connection(function(on_text_delta)
            on_text_delta("半截")
            return "半截回答"
        end, {
            fork = function(callback)
                pending = callback
            end,
        })
        local session = assert(instance:create_session())

        instance:MessageSendReq(3, {
            session_id = session.id,
            text = "取消消息",
        })
        instance:MessageCancelReq(4, {
            target_message_id = 3,
        })

        assert.is_not_nil(
            find_response(responses, "MessageCancelRes", 4, error_code.succ)
        )
        assert.is_not_nil(instance.active_request)
        assert.is_not_nil(pending)
        pending()
        assert.is_not_nil(find_response(
            responses,
            "MessageSendRes",
            3,
            error_code.succ,
            message_status.cancelled
        ))
        assert.is_nil(find_response(
            responses,
            "MessageSendRes",
            3,
            error_code.succ,
            message_status.completed
        ))
        assert.are.equal(0, #session.messages)
        assert.is_nil(instance.active_request)
    end)

    it("拒绝并发消息，并忽略无效目标的取消", function()
        local instance, responses = new_connection(function()
            return "回答"
        end, {
            fork = function()
            end,
        })
        local session = assert(instance:create_session())

        instance:MessageSendReq(1, {
            session_id = session.id,
            text = "第一条",
        })
        instance:MessageSendReq(2, {
            session_id = session.id,
            text = "第二条",
        })
        instance:MessageCancelReq(3, {
            target_message_id = 999,
        })

        local failed =
            assert(find_response(responses, "MessageSendRes", 2, error_code.server_busy))
        assert.are.equal("上一条消息仍在处理", failed.args.error.message)
        assert.is_not_nil(
            find_response(responses, "MessageCancelRes", 3, error_code.succ)
        )
        assert.is_not_nil(instance.active_request)
    end)

    it("生成期间拒绝会话操作", function()
        local instance, responses = new_connection(function()
            return "回答"
        end, {
            fork = function()
            end,
        })
        local session = assert(instance:create_session())

        instance:MessageSendReq(1, {
            session_id = session.id,
            text = "生成中",
        })
        instance:SessionCreateReq(2, {})
        instance:SessionSelectReq(3, {
            session_id = session.id,
        })

        local create_failed = assert(find_response(
            responses,
            "SessionCreateRes",
            2,
            error_code.server_busy
        ))
        assert.are.equal("上一条消息仍在处理", create_failed.args.error.message)
        local select_failed = assert(find_response(
            responses,
            "SessionSelectRes",
            3,
            error_code.server_busy
        ))
        assert.are.equal("上一条消息仍在处理", select_failed.args.error.message)
    end)

    it("按配置限制消息长度", function()
        local instance, responses = new_connection(function()
            return "不会执行"
        end, {
            max_message_length = 4,
            fork = function()
                error("超长消息不应执行模型请求")
            end,
        })
        local session = assert(instance:create_session())

        instance:MessageSendReq(3, {
            session_id = session.id,
            text = "12345",
        })

        local failed =
            assert(find_response(responses, "MessageSendRes", 3, error_code.invalid_param))
        assert.are.equal("消息格式无效或内容过长", failed.args.error.message)
        assert.are.equal(0, #session.messages)
    end)

    it("选择不存在的会话时返回通用失败码", function()
        local instance, responses = new_connection(function()
            return "不会执行"
        end)
        assert(instance:create_session())

        instance:SessionSelectReq(3, {
            session_id = "missing-session",
        })

        local failed =
            assert(find_response(responses, "SessionSelectRes", 3, error_code.fail))
        assert.are.equal("会话不存在或已经失效", failed.args.error.message)
        assert.is_false(failed.args.error.retryable)
    end)

    it("按配置生成会话标题", function()
        local instance = new_connection(function()
            return "回答"
        end, {
            session_title_length = 2,
        })
        local session = assert(instance:create_session())

        instance:MessageSendReq(4, {
            session_id = session.id,
            text = "你好世界",
        })

        assert.are.equal("你好…", session.title)
    end)
end)
