local class = require("class")

---@class client.User
---@field identity {user_id: string, username: string}
---@field connections table<string, client.Connection>
local User = class()

function User:ctor(identity)
    self.identity = identity
    self.connections = {}
end

return User
