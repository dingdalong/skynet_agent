local User = require("user")
local class = require("class")
local rpc = require("rpc")
local log = require("log")
local codes = require("enum.error_code")
local skynet = require("skynet")
local username = require("helper.username")
local Prompts = require("agent.prompts")

---@class client.ConnectionState
---@field user user.User
---@field websocket_address integer

---@class client.Service
---@field new fun(self: client.Service): client.Service
---@field users table<string, user.User>
---@field connections table<string, client.ConnectionState>
---@field pending_runs table<user.Run, boolean>
---@field prompt_templates agent.PromptTemplates?
local ClientService = class()

ClientService.commands = { open = "open", handle_request = "handle_request", disconnect = "disconnect" }
ClientService.closing_commands = { disconnect = true }

function ClientService:ctor()
    self.users = {}
    self.connections = {}
    self.pending_runs = {}
    self.prompt_templates = nil
end

function ClientService:init()
    assert(not self.prompt_templates, "Agent 提示词模板已经加载")
    self.prompt_templates = Prompts.load_templates()
    log.info("client", "init", "Agent 提示词模板已加载")
end

---@param user user.User
---@param name string
---@param args table
function ClientService:publish(user, name, args)
    for id, state in pairs(self.connections) do
        if state.user == user then
            local code = rpc.send(state.websocket_address, "send_response", id, 0, name, args)
            if code ~= codes.succ then log.failure("client", "publish connection=" .. id, code) end
        end
    end
end

---@param _ base.CommandContext
---@param id string
---@param websocket_address integer
---@param name string
---@return table|nil
function ClientService:open(_, id, websocket_address, name)
    assert(not self.connections[id], "连接已经绑定 client 服务")
    if not name or not username.normalize(name) or username.normalize(name) ~= name then return nil end
    local user = self.users[name]
    if not user then
        user = User:new(name, self)
        local response = user:SessionCreateReq()
        if response.ret ~= codes.succ then return nil end
        self.users[name] = user
        log.info("client", "open", "创建用户 user=%s", user.id)
    end
    self.connections[id] = { user = user, websocket_address = websocket_address }
    return user:snapshot()
end

---@param context base.CommandContext
---@param id string
---@param message_id integer
---@param name string
---@param args table
function ClientService:handle_request(context, id, message_id, name, args)
    local state = self.connections[id]
    if not state or context.source ~= state.websocket_address then
        log.info("client", "handle_request", "连接来源无效 connection=%s source=%s", id, context.source)
        return
    end
    local method = state.user[name]
    if type(method) ~= "function" then
        log.info("client", "handle_request", "未知请求 connection=%s name=%s", id, name)
        rpc.send(state.websocket_address, "close_connection", id, codes.websocket_policy_violation, "未知请求")
        return
    end
    local ok, response = xpcall(function() return method(state.user, args) end, debug.traceback)
    if not ok then
        log.failure("client", "handle_request connection=" .. id, response)
        rpc.send(state.websocket_address, "close_connection", id, codes.websocket_internal_error, "请求处理失败")
        return
    end
    rpc.send(state.websocket_address, "send_response", id, message_id, name:gsub("Req$", "Res"), response)
end

---@param _ base.CommandContext?
---@param id string
function ClientService:disconnect(_, id)
    self.connections[id] = nil
end

function ClientService:close()
    local succeeded, runs = true, {}
    for run in pairs(self.pending_runs) do runs[#runs + 1] = run end
    for _, run in ipairs(runs) do
        if not run:cancel() then succeeded = false end
    end
    self.connections = {}
    while next(self.pending_runs) do skynet.sleep(1) end
    for _, run in ipairs(runs) do
        if run.close_error then
            succeeded = false
            log.failure("client", "close", run.close_error)
        end
    end
    for _, user in pairs(self.users) do
        for _, session in pairs(user.sessions) do session.agent:close() end
    end
    return succeeded
end

return ClientService
