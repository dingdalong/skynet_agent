local class = require("class")
local log = require("log")

---@alias llm.OnTextDelta fun(delta: string)

---@class llm.Message
---@field role string?
---@field content string|table?
---@field type string?
---@field call_id string?
---@field name string?
---@field arguments string?
---@field output string?
---@field source 'app'|'environment'|'project'|'user'|'model'|'tool'|nil 内部宿主来源，不发送给供应商

---@class llm.Response
---@field output llm.Message[]
---@field calls llm.Message[]
---@field usage table?
---@field model string?

---@class llm.Config
---@field api_key string
---@field base_url string
---@field model string
---@field request_timeout_ticks integer?
---@field id string?

---@class llm.Base
---@field new fun(self: llm.Base, config: llm.Config, purpose: string): llm.Base
---@field config llm.Config
---@field client llm.Client?
---@field Client llm.Client
---@field Request llm.Request
---@field purpose string
---@field sequence integer
local Base = class()

---@class llm.ReasoningBlock
---@field id string
---@field run_id string
---@field model_id string
---@field text string
---@field status string

---@param config llm.Config
---@param purpose string
function Base:ctor(config, purpose)
    assert(type(config) == "table", "LLM 配置必须是 table")
    self.config = table.deep_copy(config)
    self.client = nil
    self.purpose = purpose
    self.sequence = 0
end

---@param config llm.Config
function Base:set_config(config)
    assert(type(config) == "table", "LLM 配置必须是 table")
    self.config = table.deep_copy(config)
    self.client = nil
end

---@class llm.Client
---@field new fun(self: llm.Client, config: llm.Config): llm.Client
---@field current_request llm.Request?
---@field api_key string
---@field config table
---@field api_base string
---@field default_model string
---@field request_timeout_ticks integer
Base.Client = class()

---第三方方法动态委托，实例与方法表都不复制第三方方法。
function Base.Client:__index(key)
    return rawget(require("agent.llm.base").Client, key) or require("openai").OpenAI.__base[key]
end

---@param config llm.Config
function Base.Client:ctor(config)
    assert(type(config) == "table", "LLM 配置必须是 table")

    local api_key = config.api_key
    local base_url = config.base_url
    local model = config.model
    assert(type(api_key) == "string" and api_key ~= "", "LLM API Key 不能为空")
    assert(type(base_url) == "string" and base_url ~= "", "LLM base_url 不能为空")
    assert(type(model) == "string" and model ~= "", "LLM model 不能为空")

    require("openai.skynet_compat").install()
    require("openai").OpenAI.__init(self, config.api_key)
    self.config.http_provider = "openai.skynet_compat"
    self.api_base = config.base_url:gsub("/+$", "")
    self.default_model = config.model
    self.request_timeout_ticks = config.request_timeout_ticks or 12000
    self.current_request = nil
end

---@return table
function Base.Client:get_http()
    local request = self.current_request
    local compat = require("openai.skynet_compat")
    local http_client = compat.new_http_client(self.request_timeout_ticks)
    -- provider 仅在本次请求中使用，不安装共享的协程上下文或长期方法闭包。
    return {
        request = function(options)
            return require("openai.skynet_compat").request(options, request, http_client)
        end,
    }
end

---@class llm.Request
---@field new fun(self: llm.Request): llm.Request
---@field cancelled boolean
---@field stream openai.skynet_compat.ResponseStream?
---@field close_error string?
Base.Request = class()

function Base.Request:ctor()
    self.cancelled = false
    self.stream = nil
    self.close_error = nil
end

---@return boolean
function Base.Request:cancel()
    self.cancelled = true
    if self.stream then
        local ok, err = pcall(self.stream.close, self.stream)
        if not ok then
            self.close_error = tostring(err)
            log.failure("llm", "cancel", err)
            return false
        end
    end
    return self.close_error == nil
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

---@param client table
---@param input llm.Message[]
---@param on_text_delta llm.OnTextDelta
---@param request llm.Request
---@param options table?
---@return string|nil
---@return string|nil
---@return llm.Response|nil
local function stream_responses(client, input, on_text_delta, request, options, on_reasoning)
    assert(type(client) == "table", "LLM 响应客户端必须是 table")
    assert(type(input) == "table", "LLM 输入必须是消息数组")
    assert(type(on_text_delta) == "function", "LLM 文本回调必须是函数")
    if request.cancelled then
        return nil, "用户已取消生成"
    end

    local text_parts = {}
    local completed_response
    local output_items = {}
    local request_terminal_error
    local reasoning = {}
    local function reasoning_text(text, key, complete)
        if type(text) ~= "string" or text == "" then return end
        local previous = reasoning[key] or ""
        local delta = text
        if complete then
            if text:sub(1, #previous) ~= previous then return end
            delta = text:sub(#previous + 1)
        end
        reasoning[key] = previous .. delta
        if delta ~= "" and on_reasoning then on_reasoning(delta, key) end
    end

    ---@param event openai.sse.Event
    local function on_event(event)
        if event.type == "response.reasoning_text.delta" or event.type == "response.reasoning_summary_text.delta"
            or event.type == "response.reasoning_text.done" or event.type == "response.reasoning_summary_text.done" then
            local kind = event.type:find("summary", 1, true) and "summary" or "text"
            local key = (event.output_index or 0) .. ":" .. (event.content_index or event.summary_index or 0) .. kind
            reasoning_text(event.delta or event.text, key, event.type:sub(-5) == ".done")
        elseif event.type == "response.output_text.delta" then
            local delta = event.delta
            if type(delta) == "string" and delta ~= "" then
                text_parts[#text_parts + 1] = delta
                on_text_delta(delta)
            end
        elseif event.type == "response.output_item.done" then
            output_items[(event.output_index or #output_items) + 1] = event.item
        elseif event.type == "response.completed" then
            completed_response = event.response
        elseif event.type == "response.incomplete"
            or event.type == "response.failed"
            or event.type == "error" then
            request_terminal_error = terminal_error(event)
        end
    end

    client.current_request = request
    local request_options = table.copy(options or {})
    request_options.stream = true
    local messages = {}
    for index, item in ipairs(input) do
        local message = table.copy(item)
        message.source = nil
        messages[index] = message
    end
    local ok, status, body = pcall(client.create_response, client, messages, request_options, on_event)
    client.current_request = nil
    if request.cancelled then
        return nil, "用户已取消生成"
    end
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
    local output = completed_response.output or {}
    if #output == 0 then output = output_items end
    local calls = {}
    for index, item in ipairs(output) do
        if item.type == "reasoning" then
            for part_index, part in ipairs(item.content or {}) do
                reasoning_text(part.text, (index - 1) .. ":" .. (part_index - 1) .. "text", true)
            end
            for part_index, part in ipairs(item.summary or {}) do
                reasoning_text(part.text, (index - 1) .. ":" .. (part_index - 1) .. "summary", true)
            end
        end
        if item.type == "function_call" then
            if type(item.call_id) ~= "string" or item.call_id == "" or type(item.name) ~= "string"
                or #item.call_id > 128 or #item.name > 64
                or type(item.arguments) ~= "string" or (item.status and item.status ~= "completed") then
                return nil, "模型工具调用不完整"
            end
            if #item.arguments > 262144 then return nil, "模型工具参数过长" end
            calls[#calls + 1] = item
        end
    end
    if assistant_text == "" then
        for _, item in ipairs(output) do
            for _, part in ipairs(item.content or {}) do
                if part.type == "output_text" and type(part.text) == "string" then
                    assistant_text = assistant_text .. part.text
                end
            end
        end
        if assistant_text ~= "" then on_text_delta(assistant_text) end
    end
    if assistant_text == "" and #calls == 0 then return nil, "流式响应中没有文本内容" end
    if #output == 0 then output = { { role = "assistant", content = assistant_text } } end
    return assistant_text, nil, { output = output, calls = calls,
        usage = completed_response.usage, model = completed_response.model }
end

---@param input llm.Message[]
---@param on_text llm.OnTextDelta
---@param run agent.Run
---@param options table?
---@param tool agent.ToolCall?
---@return string|nil, string|nil, llm.Response|nil
function Base:stream(input, on_text, run, options, tool)
    if run.cancelled then return nil, "用户已取消生成" end
    local config = self.config
    local client = self.client
    if not client then
        local ok, value = pcall(self.Client.new, self.Client, config)
        if not ok or type(value) ~= "table" then return nil, "创建 LLM 客户端失败: " .. tostring(value) end
        client, self.client = value, value
    end
    if client.current_request then return nil, "LLM 客户端已有请求正在执行" end
    self.sequence = self.sequence + 1
    local trace = (run.id or "standalone") .. ":" .. self.purpose .. ":" .. self.sequence
    local request = self.Request:new()
    local field = self.purpose == "permission" and "permission_request" or "llm_request"
    run[field] = request
    local target = tool or run.assistant
    target.reasoning = target.reasoning or {}
    local blocks = {}
    local ok, text, err, response = pcall(stream_responses, client, input, on_text, request, options,
        function(delta, key)
            local block = blocks[key]
            if not block then
                block = { id = trace .. ":" .. key, run_id = run.id or "", model_id = config.id or config.model,
                    text = "", status = "streaming" }
                blocks[key] = block
                target.reasoning[#target.reasoning + 1] = block
            end
            block.text = block.text .. delta
            run:on_reasoning(block, delta, tool and tool.id)
        end)
    if run[field] == request then run[field] = nil end
    for _, block in pairs(blocks) do
        block.status = run.cancelled and "cancelled" or ok and text ~= nil and "completed" or "failed"
        run:on_reasoning(block, "", tool and tool.id)
    end
    if response and response.usage then
        local usage = response.usage
        local cached = usage.input_tokens_details and usage.input_tokens_details.cached_tokens
        log.info("agent.llm", "usage",
            "purpose=%s run=%s model=%s input_tokens=%s cached_tokens=%s output_tokens=%s",
            self.purpose, run.id or "", response.model or config.model,
            tostring(usage.input_tokens), tostring(cached), tostring(usage.output_tokens))
    end
    if not ok then return nil, "调用 LLM 失败: " .. tostring(text) end
    return text, err, response
end

return Base
