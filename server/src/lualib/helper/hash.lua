local M = {}

---@param value string
---@return integer
function M.fnv1a32(value)
    local hash = 2166136261
    for index = 1, #value do
        hash = ((hash ~ value:byte(index)) * 16777619) & 0xffffffff
    end
    return hash
end

return M
