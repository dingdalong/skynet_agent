local class = require("class")

---@class helper.ServicePool
---@field new fun(self: helper.ServicePool, addresses: integer[]): helper.ServicePool
---@field addresses integer[]
---@field index integer
local Pool = class()

---@param addresses integer[]
function Pool:ctor(addresses)
    assert(type(addresses) == "table" and #addresses > 0, "服务池不能为空")
    self.addresses = table.copy(addresses)
    self.index = 0
end

---@return integer
function Pool:next()
    self.index = self.index % #self.addresses + 1
    return self.addresses[self.index]
end

return Pool
