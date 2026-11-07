local M = {}

---@param value unknown
---@return string|nil
function M.normalize(value)
    if type(value) ~= "string" then return nil end
    local name = value:match("^[ \t\r\n\v\f]*(.-)[ \t\r\n\v\f]*$")
    local length = utf8.len(name)
    if not length or length < 1 or length > 32 or name:find("[%z\1-\31\127]") then return nil end
    return name
end

return M
