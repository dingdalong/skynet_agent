local M = {}

---读取节点随产物交付的发布号和构建标识。
---@param service string 已校验的服务目录名
---@return string
function M.read(service)
    local file <close> = assert(io.open("src/service/" .. service .. "/VERSION", "r"))
    return assert(file:read("l"))
end

return M
