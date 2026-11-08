local class = require("class")
local llm = require("llm.base")

---@class agent
---@field new fun(self: agent, llm_config: llm.Config, system_prompt: string): agent
---@field llm_config llm.Config
---@field llm table?
---@field messages llm.Message[]

local Agent = class()

---@param llm_config llm.Config
---@param system_prompt string
function Agent:ctor(llm_config, system_prompt)
    assert(type(llm_config) == "table", "Agent 的 LLM 配置必须是 table")
    assert(
        type(system_prompt) == "string" and system_prompt ~= "",
        "Agent 的 system_prompt 不能为空"
    )

    self.llm_config = table.copy(llm_config)
    self.messages = {
        { role = "system", content = system_prompt },
    }
end

---@param llm_config llm.Config
function Agent:set_llm(llm_config)
    assert(type(llm_config) == "table", "Agent 的 LLM 配置必须是 table")

    self.llm_config = table.copy(llm_config)
    -- 保留历史，下一次对话使用最新配置重新创建客户端。
    self.llm = nil
end

---@param user_input string
---@param on_text_delta llm.OnTextDelta
---@param request llm.Request?
---@return string|nil
---@return string|nil
function Agent:chat(user_input, on_text_delta, request)
    assert(
        type(user_input) == "string" and user_input ~= "",
        "Agent 的用户消息不能为空"
    )
    assert(type(on_text_delta) == "function", "Agent 的文本回调必须是函数")

    local client = self.llm
    if not client then
        local create_ok, client_or_error = pcall(llm.new, self.llm_config)
        if not create_ok then
            return nil, "创建 LLM 客户端失败: " .. tostring(client_or_error)
        end
        if type(client_or_error) ~= "table" then
            return nil, "创建 LLM 客户端失败: 返回值必须是 table"
        end
        self.llm = client_or_error
        client = client_or_error
    end

    local next_messages = table.copy(self.messages)
    local user_message = {
        role = "user",
        content = user_input,
    }
    next_messages[#next_messages + 1] = user_message

    local request_ok, assistant_text, request_error = pcall(
        llm.stream_responses,
        client,
        next_messages,
        on_text_delta,
        request
    )
    if not request_ok then
        return nil, "调用 LLM 失败: " .. tostring(assistant_text)
    end
    if not assistant_text then
        return nil, request_error or "LLM 请求失败"
    end

    if request and request.cancelled then
        return nil, "用户已取消生成"
    end

    -- 请求成功后再提交整轮历史，失败时调用方可以原样重试。
    self.messages[#self.messages + 1] = user_message
    self.messages[#self.messages + 1] = {
        role = "assistant",
        content = assistant_text,
    }
    return assistant_text
end

return Agent
