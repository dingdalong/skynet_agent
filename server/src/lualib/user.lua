local class = require("class")
local Chat = require("user.mods.chat.chat")
local models = require("agent.models")
local skynet = require("skynet")
local crypt = require("skynet.crypt")
local config = require("etc.cfg").agent

---@class user.User
---@field new fun(self: user.User, username: string, owner: client.Service): user.User
---@field id string
---@field username string
---@field owner client.Service
---@field chat user.Chat
local User = class()

---@param username string
---@param owner client.Service
function User:ctor(username, owner)
    self.id = string.format("user-%s-%s", crypt.hexencode(crypt.randomkey()), tostring(skynet.genid()))
    self.username = username
    self.owner = owner
    self.chat = Chat:new(self, assert(owner.prompt_templates, "Agent 提示词模板未加载"), owner.pending_runs)
end

---@return table
function User:snapshot()
    return {
        user_id = self.id, username = self.username, chat_sessions = self.chat:snapshot(),
        models = models.public(config), default_model_id = config.default_model_id,
        permission_model_id = config.permission.model_id or "",
    }
end

function User:close()
    self.chat:close()
end

return User
