local skynet = require("skynet")
local error_code = require("enum.error_code")
local log = require("log")

local Rpc = {}

---@param ticks integer? nil 表示无超时等待
---@param address integer|string
---@param command string
---@param ... any
---@return error_code
---@return any ...
local function request(ticks, address, command, ...)
    local function execute(...)
        local requests = skynet.request(table.pack(address, "lua", command, ...))
        for _, response in requests:select(ticks) do
            if response then
                return table.unpack(response, 1, response.n)
            end
            return error_code.call_fail
        end
        return ticks and error_code.timeout or error_code.call_fail
    end
    local result = table.pack(pcall(execute, ...))
    if not result[1] then
        log.failure("rpc", string.format("call address=%s command=%s", address, command), result[2])
        return error_code.call_fail
    end
    if result[2] ~= error_code.succ then
        log.info("rpc", "call", "address=%s command=%s code=%s", address, command, tostring(result[2]))
    end
    return table.unpack(result, 2, result.n)
end

---@param address integer|string
---@param command string
---@param ... any
---@return error_code
---@return any ...
function Rpc.call(address, command, ...)
    return request(300, address, command, ...)
end

---等待远端完成，不设置截止时间，也不重试。
---@param address integer|string
---@param command string
---@param ... any
---@return error_code
---@return any ...
function Rpc.call_no_timeout(address, command, ...)
    return request(nil, address, command, ...)
end

---成功仅表示消息交给 Skynet，不代表远端命令已经执行。
---@param address integer|string
---@param command string
---@param ... any
---@return error_code
function Rpc.send(address, command, ...)
    local ok, result = pcall(skynet.send, address, "lua", command, ...)
    -- Skynet 对失效地址返回 nil、超大消息返回 false，成功的异步 session 为 0。
    if not ok or result ~= 0 then
        log.failure("rpc", string.format("send address=%s command=%s", address, command),
            ok and "消息未被 Skynet 接收" or result)
        return error_code.call_fail
    end
    return error_code.succ
end

return Rpc
