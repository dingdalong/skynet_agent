local class = require("class")
local rpc = require("rpc")
local Chat = require("agent.chat")
local DesktopConnections = require("agent.desktop_connections")
local Client = require("agent.tools.runtime.client")
local log = require("log")
local error_code = require("error_code")
local handler = require("agent.handler")
local models = require("agent.models")
local config = require("etc.cfg").agent

---@class agent.App
---@field tool_registry agent.ToolRegistry
---@field identity table
---@field router integer
---@field connections table<string, table>
---@field pending_runs table<agent.Run, boolean>
---@field chat agent.Chat
---@field desktop_connections agent.DesktopConnections
---@field pending_client_requests table<string, agent.ClientRequest>
local App = class()

function App:ctor(identity, router, templates, tool_registry)
    self.tool_registry = tool_registry
    self.identity = identity
    self.router = router
    self.connections = {}
    self.default_model = config.default_model_id
    self.blocked_settings = {}
    self.legacy_settings = {}
    self.pending_runs = {}
    self.desktop_connections = DesktopConnections:new(self)
    self.pending_client_requests = {}
    self.chat = Chat:new(self, templates, self.pending_runs)
end

function App:snapshot()
    local projects = require("agent.workspace").list(config.tools.workspace_root, self.identity.user_id)
    local available = {}
    for _, name in ipairs(projects) do available[name] = true end
    for _, session in pairs(self.chat.sessions) do
        if session.cloud_project then session.needs_workspace = not available[session.cloud_project] end
    end
    return {
        user_id = self.identity.user_id,
        username = self.identity.username,
        desktops = self.desktop_connections:snapshot(),
        cloud_projects = projects,
        chat_sessions = self.chat:snapshot(),
        models = models.public(config),
        default_model_id = self.default_model,
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

function App:register_desktop(args, connection)
    local device, failure = self.desktop_connections:register(args, connection)
    if not device then return failure end
    if not device.remote_enabled then
        for _, session in pairs(self.chat.sessions) do
            if session.execution_target and session.execution_target.device_id == device.id then
                session:stop_other_device_runs()
            end
        end
    end
    self.desktop_connections:publish(device)
    return { ret = error_code.succ }
end

function App:disconnect_desktop(connection)
    local device = self.desktop_connections:disconnect(connection)
    if not device then return end
    Client.fail_connection(self.pending_client_requests, connection)
    for _, session in pairs(self.chat.sessions) do
        if session.execution_target and session.execution_target.device_id == device.id and session.run then
            log.info("execution", "disconnect", "device=%s session=%s", device.id, session.id)
            session.run:cancel()
        end
    end
    self.desktop_connections:publish(device)
end

function App:disconnect(id)
    local connection = self.connections[id]
    if connection then
        self.connections[id] = nil
        self:disconnect_desktop(connection)
    end
end

return App
