---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local Conversation
local fake_llm
local original_conversation
local original_llm_base

---@return function
local function no_text_delta()
end

---@return table
local function install_fake_llm()
    local fake = {
        new_configs = {},
        requests = {},
        new_error = nil,
        response_handler = nil,
    }

    function fake.new(config)
        if fake.new_error then
            error(fake.new_error, 0)
        end
        fake.new_configs[#fake.new_configs + 1] = config
        return {
            client_index = #fake.new_configs,
        }
    end

    function fake.stream_responses(client, input, on_text_delta)
        fake.requests[#fake.requests + 1] = {
            client = client,
            input = input,
        }
        return fake.response_handler(client, input, on_text_delta)
    end

    package.loaded["llm.base"] = fake
    package.loaded["agent.conversation"] = nil
    Conversation = require("agent.conversation")
    return fake
end

before_each(function()
    original_conversation = package.loaded["agent.conversation"]
    original_llm_base = package.loaded["llm.base"]
    fake_llm = install_fake_llm()
end)

after_each(function()
    package.loaded["agent.conversation"] = original_conversation
    package.loaded["llm.base"] = original_llm_base
end)

describe("conversation", function()
    it("延迟创建 LLM 客户端并发送 system 消息和首轮用户消息", function()
        local deltas = {}
        fake_llm.response_handler = function(_, _, on_text_delta)
            on_text_delta("你")
            on_text_delta("好")
            return "你好"
        end
        local llm_config = {
            api_key = "secret",
            base_url = "https://api.deepseek.com",
            model = "deepseek-flash",
        }
        local conversation = Conversation:new(llm_config, "保持简洁")

        luassert.are.equal(Conversation, getmetatable(conversation))
        luassert.are.equal(0, #fake_llm.new_configs)

        local text, err = conversation:chat("介绍自己", function(delta)
            deltas[#deltas + 1] = delta
        end)

        luassert.is_nil(err)
        luassert.are.equal("你好", text)
        luassert.are.same({ "你", "好" }, deltas)
        luassert.are.equal(1, #fake_llm.new_configs)
        luassert.are.equal("secret", fake_llm.new_configs[1].api_key)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "介绍自己" },
        }, fake_llm.requests[1].input)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "介绍自己" },
            { role = "assistant", content = "你好" },
        }, conversation.messages)
    end)

    it("连续对话携带完整的本地历史", function()
        fake_llm.response_handler = function()
            return "回答" .. tostring(#fake_llm.requests)
        end
        local conversation = Conversation:new({
            api_key = "secret",
            base_url = "https://api.deepseek.com",
            model = "deepseek-flash",
        }, "保持简洁")

        local first_text, first_error = conversation:chat("第一问", no_text_delta)
        luassert.is_nil(first_error)
        luassert.are.equal("回答1", first_text)

        local second_text, second_error = conversation:chat("第二问", no_text_delta)
        luassert.is_nil(second_error)
        luassert.are.equal("回答2", second_text)

        luassert.are.equal(1, #fake_llm.new_configs)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "第一问" },
            { role = "assistant", content = "回答1" },
            { role = "user", content = "第二问" },
        }, fake_llm.requests[2].input)
    end)

    it("切换 LLM 配置后重建客户端并保留历史", function()
        fake_llm.response_handler = function()
            return "回答" .. tostring(#fake_llm.requests)
        end
        local conversation = Conversation:new({
            api_key = "first-secret",
            base_url = "https://first.example.com",
            model = "first-model",
        }, "保持简洁")
        local first_text, first_error = conversation:chat("第一问", no_text_delta)
        luassert.is_nil(first_error)
        luassert.are.equal("回答1", first_text)

        local next_config = {
            api_key = "second-secret",
            base_url = "https://second.example.com",
            model = "second-model",
        }
        conversation:set_llm(next_config)
        next_config.model = "mutated-model"

        luassert.are.equal(1, #fake_llm.new_configs)
        local second_text, second_error = conversation:chat("第二问", no_text_delta)
        luassert.is_nil(second_error)
        luassert.are.equal("回答2", second_text)
        luassert.are.equal(2, #fake_llm.new_configs)
        luassert.are.equal("second-secret", fake_llm.new_configs[2].api_key)
        luassert.are.equal("second-model", fake_llm.new_configs[2].model)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "第一问" },
            { role = "assistant", content = "回答1" },
            { role = "user", content = "第二问" },
        }, fake_llm.requests[2].input)
    end)

    it("客户端创建失败时保留历史并允许重试", function()
        fake_llm.new_error = "无效配置"
        fake_llm.response_handler = function()
            return "重试成功"
        end
        local conversation = Conversation:new({
            api_key = "secret",
            base_url = "https://api.deepseek.com",
            model = "deepseek-flash",
        }, "保持简洁")

        local text, err = conversation:chat("第一问", no_text_delta)
        luassert.is_nil(text)
        luassert.matches("创建 LLM 客户端失败", assert(err))
        luassert.are.same({
            { role = "system", content = "保持简洁" },
        }, conversation.messages)

        fake_llm.new_error = nil
        text, err = conversation:chat("第一问", no_text_delta)
        luassert.is_nil(err)
        luassert.are.equal("重试成功", text)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "第一问" },
            { role = "assistant", content = "重试成功" },
        }, conversation.messages)
    end)

    it("流式请求失败时整轮回滚并允许原样重试", function()
        fake_llm.response_handler = function()
            return nil, "网络错误"
        end
        local conversation = Conversation:new({
            api_key = "secret",
            base_url = "https://api.deepseek.com",
            model = "deepseek-flash",
        }, "保持简洁")

        local text, err = conversation:chat("第一问", no_text_delta)
        luassert.is_nil(text)
        luassert.are.equal("网络错误", err)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
        }, conversation.messages)

        fake_llm.response_handler = function()
            return "重试成功"
        end
        text, err = conversation:chat("第一问", no_text_delta)
        luassert.is_nil(err)
        luassert.are.equal("重试成功", text)
        luassert.are.same({
            { role = "system", content = "保持简洁" },
            { role = "user", content = "第一问" },
            { role = "assistant", content = "重试成功" },
        }, conversation.messages)
    end)

    it("最后一个增量后取消也不会提交模型历史，并允许下一轮发送", function()
        local request = { cancelled = false }
        fake_llm.response_handler = function(_, _, on_text_delta)
            on_text_delta("未完成回答")
            request.cancelled = true
            return "完整但已取消的回答"
        end
        local conversation = Conversation:new({}, "保持简洁")
        local text, err = conversation:chat("取消这一轮", no_text_delta, request)
        luassert.is_nil(text)
        luassert.are.equal("用户已取消生成", err)
        luassert.are.same({ { role = "system", content = "保持简洁" } }, conversation.messages)

        fake_llm.response_handler = function() return "下一轮成功" end
        text, err = conversation:chat("新问题", no_text_delta)
        luassert.is_nil(err)
        luassert.are.equal("下一轮成功", text)
        luassert.are.equal(3, #conversation.messages)
        luassert.are.equal("新问题", conversation.messages[2].content)
    end)

    it("无效构造参数和调用参数返回明确错误", function()
        local ok, err = pcall(Conversation.new, Conversation, "invalid", "保持简洁")
        luassert.is_false(ok)
        luassert.matches("LLM 配置必须是 table", tostring(err))

        ok, err = pcall(Conversation.new, Conversation, {}, "")
        luassert.is_false(ok)
        luassert.matches("system_prompt 不能为空", tostring(err))

        local conversation = Conversation:new({
            api_key = "secret",
            base_url = "https://api.deepseek.com",
            model = "deepseek-flash",
        }, "保持简洁")
        ok, err = pcall(conversation.set_llm, conversation, "invalid")
        luassert.is_false(ok)
        luassert.matches("LLM 配置必须是 table", tostring(err))

        ok, err = pcall(conversation.chat, conversation, "", no_text_delta)
        luassert.is_false(ok)
        luassert.matches("用户消息不能为空", tostring(err))

        ok, err = pcall(conversation.chat, conversation, "问题", nil)
        luassert.is_false(ok)
        luassert.matches("文本回调必须是函数", tostring(err))
    end)
end)
