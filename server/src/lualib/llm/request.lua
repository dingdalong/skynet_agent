local class = require("class")
local log = require("log")

---@class llm.Request
---@field new fun(self: llm.Request): llm.Request
---@field cancelled boolean
---@field stream openai.skynet_compat.ResponseStream?
---@field close_error string?
local Request = class()

function Request:ctor()
    self.cancelled = false
end

---@return boolean
function Request:cancel()
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

return Request
