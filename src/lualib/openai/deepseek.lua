local openai = require("openai")
local types = require("tableshape").types

---@alias openai.deepseek.Input string|table[]
---@alias openai.deepseek.HttpProvider string|table
---@alias openai.deepseek.Options table<string, any>

---@class openai.deepseek.Config
---@field base_url string
---@field model? string
---@field http_provider? openai.deepseek.HttpProvider

---@class openai.deepseek.RawResponse
---@field status any 请求异常时为空；HTTP 响应时为状态码
---@field headers? table<string, string>
---@field body? any

---@alias openai.deepseek.OnTextDelta fun(delta: string, event: openai.sse.Event)

---@class openai.deepseek.UpstreamClient
---@field api_base string
---@field default_model string
---@field create_response fun(self: openai.deepseek.UpstreamClient, input: openai.deepseek.Input, opts: openai.deepseek.Options?, on_event: openai.sse.OnEvent?): integer?, any?, table<string, string>?
---@field get_http? fun(self: openai.deepseek.UpstreamClient): openai.deepseek.HttpProvider

local DEFAULT_MODEL = "deepseek-flash"
local DEFAULT_HTTP_PROVIDER = "openai.skynet_http"
local valid_input = types.string + types.array_of(types.table)

---@class openai.deepseek.Client
---@field http_client openai.deepseek.UpstreamClient
---@field base_url string
---@field model string
---@field create_response fun(self: openai.deepseek.Client, input: openai.deepseek.Input, opts: openai.deepseek.Options?): integer?, any, table<string, string>?
---@field stream_response fun(self: openai.deepseek.Client, input: openai.deepseek.Input, opts: openai.deepseek.Options?, on_text_delta: openai.deepseek.OnTextDelta?): table?, string?, openai.deepseek.RawResponse

local Client = {}
Client.__index = Client

---@param source openai.deepseek.Options?
---@return openai.deepseek.Options
local function copy_table(source)
    local result = {}
    for key, value in pairs(source or {}) do
        result[key] = value
    end
    return result
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
    return string.format("DeepSeek HTTP %s: %s", tostring(status), detail or "未知错误")
end

---@param event openai.sse.Event
---@return string
local function terminal_error(event)
    local response = event.response or {}
    if event.type == "response.incomplete" then
        local details = response.incomplete_details or {}
        return "DeepSeek 响应未完成: " .. tostring(details.reason or response.status or "未知原因")
    end
    if event.type == "response.failed" then
        local api_error = response.error
        local detail = api_error
        if type(api_error) == "table" then
            detail = api_error.message or api_error.code
        end
        return "DeepSeek 响应失败: " .. tostring(detail or response.status or "未知错误")
    end
    ---@type string|table|nil
    local detail = event.message
    if not detail and type(event.error) == "table" then
        detail = event.error.message or event.error.code
    elseif not detail then
        detail = event.error
    end
    return "DeepSeek 返回错误事件: " .. tostring(detail or "未知错误")
end

---@param input openai.deepseek.Input
---@param opts openai.deepseek.Options?
---@return integer|nil status
---@return any response
---@return table<string, string>|nil headers
function Client:create_response(input, opts)
    assert(valid_input(input), "Responses input 必须是字符串或消息数组")
    local ok, status, body, headers = pcall(
        self.http_client.create_response,
        self.http_client,
        input,
        opts
    )
    if not ok then
        return nil, status, nil
    end
    return status, body, headers
end

---@param input openai.deepseek.Input
---@param opts openai.deepseek.Options?
---@param on_text_delta openai.deepseek.OnTextDelta?
---@return table|nil final_response
---@return string|nil error_message
---@return openai.deepseek.RawResponse raw_response
function Client:stream_response(input, opts, on_text_delta)
    assert(valid_input(input), "Responses input 必须是字符串或消息数组")
    if on_text_delta ~= nil and type(on_text_delta) ~= "function" then
        error("on_text_delta 必须是函数", 2)
    end

    local request_opts = copy_table(opts)
    request_opts.stream = true

    ---@type table|false|nil
    local completed_response
    local request_terminal_error

    ---@param event openai.sse.Event
    local function on_event(event)
        if event.type == "response.output_text.delta" then
            local delta = event.delta
            if type(delta) == "string" and delta ~= "" then
                if on_text_delta then
                    on_text_delta(delta, event)
                end
            end
        elseif event.type == "response.completed" then
            completed_response = event.response or false
            -- 终态必须显式识别，连接关闭不能等同于响应成功完成。
        elseif event.type == "response.incomplete"
            or event.type == "response.failed"
            or event.type == "error" then
            request_terminal_error = terminal_error(event)
        end
    end

    local ok, status, body, headers = pcall(
        self.http_client.create_response,
        self.http_client,
        input,
        request_opts,
        on_event
    )

    ---@type openai.deepseek.RawResponse
    local raw = {
        status = status,
        headers = headers,
        body = body,
    }

    if not ok then
        raw.status = nil
        raw.body = nil
        return nil, "DeepSeek 请求失败: " .. tostring(status), raw
    end
    if status ~= 200 then
        return nil, http_error_message(status, body), raw
    end
    if request_terminal_error then
        return nil, request_terminal_error, raw
    end
    if not completed_response then
        return nil, "SSE 流在 response.completed 前结束", raw
    end

    return completed_response, nil, raw
end

local module = {}

---@param api_key string
---@param config openai.deepseek.Config
---@return openai.deepseek.Client
function module.new(api_key, config)
    assert(type(api_key) == "string" and api_key ~= "", "DeepSeek API Key 不能为空")
    assert(type(config) == "table", "DeepSeek 配置必须是 table")

    local base_url = config.base_url
    assert(type(base_url) == "string" and base_url ~= "", "DeepSeek base_url 不能为空")
    base_url = base_url:gsub("/+$", "")

    local model = config.model or DEFAULT_MODEL
    assert(type(model) == "string" and model ~= "", "DeepSeek model 不能为空")

    local http_provider = config.http_provider
    local client_config = {}
    if type(http_provider) == "table" then
        client_config.http_provider = DEFAULT_HTTP_PROVIDER
    else
        client_config.http_provider = http_provider or DEFAULT_HTTP_PROVIDER
    end

    local http_client = openai.new(api_key, client_config)
    ---@cast http_client openai.deepseek.UpstreamClient
    http_client.api_base = base_url
    http_client.default_model = model
    if type(http_provider) == "table" then
        http_client.get_http = function()
            return http_provider
        end
    end

    return setmetatable({
        http_client = http_client,
        base_url = base_url,
        model = model,
    }, Client)
end

return module
