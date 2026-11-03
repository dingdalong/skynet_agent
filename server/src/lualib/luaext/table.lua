-- 标准库扩展在 VM 启动时预加载，变更需要重启。

---@param source table
---@return table
function table.copy(source)
    assert(type(source) == "table", "table copy 的 source 必须是 table")
    local copied = {}
    for key, value in pairs(source) do
        copied[key] = value
    end
    return copied
end

---@param value any
---@param copied table<table, table>
---@return any
local function deep_copy_value(value, copied)
    if type(value) ~= "table" then
        return value
    end

    local existing = copied[value]
    if existing then
        return existing
    end

    local result = {}
    copied[value] = result
    for key, item in pairs(value) do
        result[key] = deep_copy_value(item, copied)
    end
    return result
end

---@param value any
---@return any
function table.deep_copy(value)
    return deep_copy_value(value, {})
end
