local Frame = require("network.frame")
local Protocol = require("network.protocol")
local M = setmetatable({}, { __index = Protocol })
M.__index = M

local suffixes = { "Req", "Res", "Ntf" }

function M:encode_msg(message_id, name, args)
    local app = self.app_id
    if not app then
        app = name:match("^Login") and "login" or name:match("^AppCenter") and "app-center" or "agent"
    end
    for kind, suffix in ipairs(suffixes) do
        if name:sub(-3) == suffix then return Frame.pack(kind, message_id, app, self:encode_body(name, args)) end
    end
    error("无效的业务消息方向")
end

function M:decode_msg(data)
    local kind, id, app, body = Frame.unpack(data)
    assert(not self.app_id or app == self.app_id, "应用不匹配")
    if kind == Frame.routing_error then
        return id, "RoutingError", { ret = assert(body:byte()), error = { message = body:sub(2), retryable = true } }
    end
    return id, self:decode_body(body, suffixes[kind])
end

return M
