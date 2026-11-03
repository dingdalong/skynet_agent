local class = require("class")

---@class llm.Client
---@field new fun(self: llm.Client, api_key: string): llm.Client
---@field current_request llm.Request?
---@field api_key string
---@field config table
---@field api_base string
---@field default_model string
local Client = class()

---第三方方法动态委托，实例与方法表都不复制第三方方法。
function Client:__index(key)
    return rawget(require("llm.client"), key) or require("openai").OpenAI.__base[key]
end

---@param api_key string
function Client:ctor(api_key)
    require("openai").OpenAI.__init(self, api_key)
end

---@return table
function Client:get_http()
    local request = self.current_request
    -- provider 仅在本次请求中使用，不安装共享的协程上下文或长期方法闭包。
    return {
        request = function(options)
            return require("openai.skynet_compat").request(options, request)
        end,
    }
end

return Client
