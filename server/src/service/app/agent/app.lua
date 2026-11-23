local class = require("class")
local rpc = require("rpc")
local Chat = require("agent.chat")
local Execution = require("agent.execution")
local handler = require("agent.handler")
local models = require("agent.models")
local config = require("etc.cfg").agent

---@class agent.App
---@field identity table
---@field router integer
---@field connections table<string, table>
---@field pending_runs table<agent.Run, boolean>
---@field chat agent.Chat
---@field execution agent.Execution
local App = class()

function App:ctor(identity, router, templates)
    self.identity = identity
    self.router = router
    self.connections = {}
    self.default_model = config.default_model_id
    self.blocked_settings = {}
    self.legacy_settings = {}
    self.targets = {}
    self.pending_runs = {}
    self.execution = Execution:new(self)
    self.chat = Chat:new(self, templates, self.pending_runs)
end

function App:snapshot()
    return {
        user_id = self.identity.user_id, username = self.identity.username,
        desktops = self.execution:snapshot(), chat_sessions = self.chat:snapshot(),
        models = models.public(config), default_model_id = self.default_model,
        permission_model_id = config.permission.model_id or "",
    }
end

function App:publish(name, args, id)
    return rpc.send(self.router, "publish", self.identity.username, name, args, id)
end

function App:handle_request(id, name, args)
    local method = assert(handler.REQUEST[name], "未知 Agent 请求")
    local connection = self.connections[id]
    if not connection then
        connection = { id = id }
        self.connections[id] = connection
    end
    return method(self, args, connection)
end

function App:disconnect(id)
    local connection = self.connections[id]
    if connection then
        self.connections[id] = nil
        self.execution:disconnect(connection)
    end
end

return App
