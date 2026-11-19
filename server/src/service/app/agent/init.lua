local class = require("class")
local skynet = require("skynet")
local Pool = require("helper.service_pool")
local Prompts = require("agent.prompts")
local App = require("agent.app")
local config = require("etc.cfg")
local log = require("log")

---@class agent.Service
---@field users table<string, agent.App>
---@field templates agent.PromptTemplates?
local AgentService = class()

AgentService.commands = { handle_request = "handle_request", disconnect = "disconnect" }
AgentService.closing_commands = { disconnect = true }

function AgentService:ctor()
    self.users = {}
    self.templates = nil
end

function AgentService:init()
    self.templates = Prompts.load_templates()
end

---@return agent.App?
function AgentService:_user(identity, source)
    local app = self.users[identity.username]
    if app then
        assert(source == app.router and identity.user_id == app.identity.user_id, "Agent 用户身份或来源无效")
    else
        local slot = Pool.slot(identity.username, config.agent_gateway.instance.client)
        assert(source == skynet.localname(".client_" .. slot), "Agent 请求来源无效")
    end
    return app
end

function AgentService:handle_request(context, identity, id, name, args)
    local app = self:_user(identity, context.source)
    if not app then
        app = App:new(identity, context.source, self.templates)
        self.users[identity.username] = app
    end
    return app:handle_request(id, name, args)
end

function AgentService:disconnect(context, identity, id)
    local app = self:_user(identity, context.source)
    if app then app:disconnect(id) end
end

function AgentService:close()
    local runs = {}
    for _, app in pairs(self.users) do
        for run in pairs(app.pending_runs) do runs[#runs + 1] = run end
    end
    local succeeded = true
    for _, run in ipairs(runs) do
        local ok, cancelled = pcall(run.cancel, run)
        if not ok then log.failure("agent", "cancel run=" .. run.id, cancelled) end
        if not ok or not cancelled then succeeded = false end
    end
    for _, app in pairs(self.users) do
        while next(app.pending_runs) do skynet.sleep(1) end
        if not app.chat:close() then succeeded = false end
    end
    for _, run in ipairs(runs) do
        if run.close_error then
            succeeded = false
            log.failure("agent", "close", run.close_error)
        end
    end
    return succeeded
end

return AgentService
