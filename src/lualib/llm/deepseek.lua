local openai = require("openai")
local llm = require("llm.base")

local DEFAULT_HTTP_PROVIDER = "openai.skynet_http"

---@alias llm.deepseek.HttpProvider string|table

---@class llm.deepseek.Config
---@field api_key string
---@field base_url string
---@field model string
---@field http_provider? llm.deepseek.HttpProvider

---@class llm.deepseek.Provider: llm.Provider
---@field name string
---@field base_url string
---@field model string
---@field http_client llm.ResponsesClient

local Client = setmetatable({}, {
    __index = llm.Provider,
})
Client.__index = Client

---@param input llm.Message[]
---@param on_text_delta llm.OnTextDelta
---@return string|nil
---@return string|nil
function Client:stream_response(input, on_text_delta)
    return llm.stream_responses(self.http_client, input, on_text_delta)
end

local module = {}

---@param config llm.deepseek.Config
---@return llm.Provider
function module.new(config)
    assert(type(config) == "table", "DeepSeek 配置必须是 table")

    local api_key = config.api_key
    local base_url = config.base_url
    local model = config.model
    assert(type(api_key) == "string" and api_key ~= "", "DeepSeek API Key 不能为空")
    assert(type(base_url) == "string" and base_url ~= "", "DeepSeek base_url 不能为空")
    assert(type(model) == "string" and model ~= "", "DeepSeek model 不能为空")
    base_url = base_url:gsub("/+$", "")

    local http_provider = config.http_provider or DEFAULT_HTTP_PROVIDER
    local client_config = {
        http_provider = DEFAULT_HTTP_PROVIDER,
    }
    local provider_table
    if type(http_provider) == "table" then
        provider_table = http_provider
    else
        assert(
            type(http_provider) == "string" and http_provider ~= "",
            "DeepSeek http_provider 必须是非空字符串或 table"
        )
        client_config.http_provider = http_provider
    end

    local http_client = openai.new(api_key, client_config)
    http_client.api_base = base_url
    http_client.default_model = model
    if provider_table then
        http_client.get_http = function()
            return provider_table
        end
    end

    ---@cast http_client llm.ResponsesClient
    local provider = setmetatable({
        name = "deepseek",
        base_url = base_url,
        model = model,
        http_client = http_client,
    }, Client)
    ---@cast provider llm.Provider
    return provider
end

return module
