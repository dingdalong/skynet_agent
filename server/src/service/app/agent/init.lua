local class = require("class")
local skynet = require("skynet")
local Prompts = require("agent.prompts")
local App = require("agent.app")
local log = require("log")
local codes = require("enum.error_code")

---@class agent.Service
---@field users table<string, agent.App>
---@field templates agent.PromptTemplates?
---@field available boolean
local AgentService = class()
local Store = require("agent.persistence")
local queue = require("skynet.queue")

AgentService.commands = {
    handle_request = "handle_request", disconnect = "disconnect", drain = "drain",
}
AgentService.closing_commands = { disconnect = true, handle_request = true }

function AgentService:ctor()
    self.users = {}
    self.locks = {}
    self.templates = nil
    self.available = true
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
        assert(source == skynet.localname(".app_endpoint"), "Agent 请求来源无效")
    end
    return app
end

function AgentService:handle_request(context, identity, id, name, args, draining)
    local app = self:_user(identity, context.source)
    -- 桌面回执可能正是持锁请求等待的结果。
    if name == "AgentExecutionResultReq" and app and app.connections[id] then
        return app:handle_request(id, name, args)
    end
    local key = identity.user_id
    self.locks[key] = self.locks[key] or queue()
    return self.locks[key](self._handle, self, context, identity, id, name, args, draining)
end

function AgentService:_handle(context, identity, id, name, args, draining)
    local app = self:_user(identity, context.source)
    local receipt = name == "AgentExecutionResultReq" and app and app.connections[id]
    if (draining or not self.available) and not receipt then
        return { ret = codes.server_busy, error = { message = "应用服务已下线", retryable = true } }
    end
    if not app then
        app = App:new(identity, context.source, self.templates)
        if not pcall(Store.restore, app) then
            return { ret = codes.call_fail, error = { message = "历史读取失败，请重试", retryable = true } }
        end
        if not self.available then
            return { ret = codes.server_busy, error = { message = "应用服务已下线", retryable = true } }
        end
        self.users[identity.username] = app
    end
    if name == "AgentSnapshotReq" then
        for _, session in pairs(app.chat.sessions) do
            if session.storage_failed and not session.run then
                if not pcall(Store.reload, app, session) then
                    return { ret = codes.call_fail,
                        error = { message = "会话同步失败，请重试", retryable = true } }
                end
            end
        end
    end
    local ok, result = pcall(app.handle_request, app, id, name, args)
    if ok then return result end
    log.info("agent", "request", "请求未确认 name=%s", name)
    return { ret = codes.call_fail,
        error = { message = "操作未确认，请重新同步并重试", retryable = true } }
end

function AgentService:disconnect(context, identity, id)
    local app = self:_user(identity, context.source)
    if app then app:disconnect(id) end
end

function AgentService:close()
    self.available = false
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

function AgentService:drain(context)
    assert(context.source == skynet.localname(".app_endpoint"), "应用节点来源无效")
    return self:close()
end

return AgentService
