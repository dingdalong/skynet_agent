---@class base.Class
local Class = {}

---@param class_table table
---@param ... any
---@return table
local function construct(class_table, ...)
    assert(type(class_table) == "table", "class 必须是 table")
    local instance = setmetatable({}, class_table)
    assert(type(instance.ctor) == "function", "class 必须定义 ctor")
    instance:ctor(...)
    return instance
end

---@param _ base.Class
---@return table
local function create_class(_)
    local class_table = {}
    class_table.__index = class_table
    class_table.new = construct
    return class_table
end

setmetatable(Class, {
    __call = create_class,
})

return Class
