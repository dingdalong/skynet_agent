local class = require("class")
local skynet = require("skynet")
local crypt = require("skynet.crypt")

---@class client.User
---@field identity {user_id: string, username: string}
---@field connections table<string, client.Connection>
local User = class()

function User:ctor(username)
    self.identity = {
        user_id = string.format("user-%s-%s", crypt.hexencode(crypt.randomkey()), skynet.genid()),
        username = username,
    }
    self.connections = {}
end

return User
