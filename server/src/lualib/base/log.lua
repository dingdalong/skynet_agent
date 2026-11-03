local skynet = require("skynet")

local Log = {}

---@param service string
---@param method string
---@param format string
---@param ... any
function Log.info(service, method, format, ...)
    skynet.error(string.format("[%s] %s %s", service, method, string.format(format, ...)))
end

---@param service string
---@param method string
---@param err any
function Log.failure(service, method, err)
    require("log").info(service, method, "失败 error=%s", tostring(err))
end

return Log
