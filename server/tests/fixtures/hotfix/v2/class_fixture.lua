local class = require("class")

local Object = class()

function Object:ctor(value)
    self.value = value
    self.created_by = "v2"
end

function Object:get_value()
    return "v2:" .. self.value
end

return Object
