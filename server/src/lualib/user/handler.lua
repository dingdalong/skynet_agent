local codes = require("enum.error_code")

local REQUEST = {}

---@param self user.User
---@return table
function REQUEST:UserSnapshotReq()
    return { ret = codes.succ, snapshot = self:snapshot() }
end

return { REQUEST = REQUEST }
