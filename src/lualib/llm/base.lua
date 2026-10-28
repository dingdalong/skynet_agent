---@alias llm.OnTextDelta fun(delta: string)

---@class llm.Message
---@field role string
---@field content string|table

---@class llm.Provider
---@field name string
local Provider = {}
Provider.__index = Provider

---@class llm.ResponsesClient
local ResponsesClient = {}

---@param input llm.Message[]
---@param opts table?
---@param on_event fun(event: openai.sse.Event)?
---@return integer?
---@return any
---@return table<string, string>?
function ResponsesClient:create_response(input, opts, on_event)
    error("LLM ResponsesClient 只能用于接口声明", 0)
end

---@param input llm.Message[]
---@param on_text_delta llm.OnTextDelta
---@return string|nil
---@return string|nil
function Provider:stream_response(input, on_text_delta)
    error("LLM Provider 必须实现 stream_response", 0)
end

---@param status integer|string|nil
---@param body any
---@return string
local function http_error_message(status, body)
    local detail
    if type(body) == "table" then
        local api_error = body.error
        if type(api_error) == "table" then
            detail = api_error.message or api_error.code
        elseif type(api_error) == "string" then
            detail = api_error
        else
            detail = body.message
        end
    end
    if not detail and body ~= nil then
        detail = tostring(body)
    end
    return string.format("LLM HTTP %s: %s", tostring(status), detail or "未知错误")
end

---@param event openai.sse.Event
---@return string
local function terminal_error(event)
    local response = event.response or {}
    if event.type == "response.incomplete" then
        local details = response.incomplete_details or {}
        return "LLM 响应未完成: " .. tostring(details.reason or response.status or "未知原因")
    end
    if event.type == "response.failed" then
        local api_error = response.error
        local detail = api_error
        if type(api_error) == "table" then
            detail = api_error.message or api_error.code
        end
        return "LLM 响应失败: " .. tostring(detail or response.status or "未知错误")
    end

    ---@type string|table|nil
    local detail = event.message
    if not detail and type(event.error) == "table" then
        detail = event.error.message or event.error.code
    elseif not detail then
        detail = event.error
    end
    return "LLM 返回错误事件: " .. tostring(detail or "未知错误")
end

---@param client llm.ResponsesClient
---@param input llm.Message[]
---@param on_text_delta llm.OnTextDelta
---@return string|nil
---@return string|nil
local function stream_responses(client, input, on_text_delta)
    assert(type(client) == "table", "LLM 响应客户端必须是 table")
    assert(type(input) == "table", "LLM 输入必须是消息数组")
    assert(type(on_text_delta) == "function", "LLM 文本回调必须是函数")

    local text_parts = {}
    local completed_response
    local request_terminal_error

    ---@param event openai.sse.Event
    local function on_event(event)
        if event.type == "response.output_text.delta" then
            local delta = event.delta
            if type(delta) == "string" and delta ~= "" then
                text_parts[#text_parts + 1] = delta
                on_text_delta(delta)
            end
        elseif event.type == "response.completed" then
            completed_response = event.response
        elseif event.type == "response.incomplete"
            or event.type == "response.failed"
            or event.type == "error" then
            request_terminal_error = terminal_error(event)
        end
    end

    local ok, status, body = pcall(client.create_response, client, input, {
        stream = true,
    }, on_event)
    if not ok then
        return nil, "LLM 请求失败: " .. tostring(status)
    end
    if status ~= 200 then
        return nil, http_error_message(status, body)
    end
    if request_terminal_error then
        return nil, request_terminal_error
    end
    if type(completed_response) ~= "table" then
        return nil, "SSE 流在 response.completed 前结束"
    end

    local assistant_text = table.concat(text_parts)
    if assistant_text == "" then
        return nil, "流式响应中没有文本内容"
    end
    return assistant_text
end

return {
    Provider = Provider,
    stream_responses = stream_responses,
}
