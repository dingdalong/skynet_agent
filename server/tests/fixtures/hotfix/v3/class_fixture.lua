local class = require("class")

local Object = class()

function Object:ctor(value)
    self.value = value
    self.created_by = "v3"
end

function Object:get_value()
    return "v3:" .. self.value
end

return Object
