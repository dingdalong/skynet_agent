local class = require("class")
local AgentSession = require("agent_session")
local codes = require("enum.error_code")
local models = require("agent.models")
local log = require("log")
local config = require("etc.cfg").agent

---@class user.Chat
---@field new fun(self: user.Chat, user: user.User, templates: agent.PromptTemplates, pending: table): user.Chat
---@field user user.User
---@field sessions table<string, agent_session.AgentSession>
---@field session_order string[]
---@field prompt_templates agent.PromptTemplates
---@field pending_runs table<agent.Run, boolean>
local Chat = class()

local function failure(code, message, retryable)
    log.info("user.chat", "request", "拒绝请求 code=%d reason=%s", code, message)
    return { ret = code, error = { message = message, retryable = retryable or false } }
end

function Chat:ctor(user, templates, pending_runs)
    self.user = user
    self.sessions = {}
    self.session_order = {}
    self.prompt_templates = templates
    self.pending_runs = pending_runs
end

---@return table[]
function Chat:snapshot()
    local sessions = {}
    for _, id in ipairs(self.session_order) do
        sessions[#sessions + 1] = self.sessions[id]:snapshot()
    end
    return sessions
end

---@param name string
---@param args table
function Chat:publish(name, args)
    self.user.owner:publish(self.user, name, args)
end

---@param args table
---@return table
function Chat:chat(args, connection)
    if args.session_id and args.session_id ~= "" then
        local session = self.sessions[args.session_id]
        if not session then return failure(codes.fail, "会话不存在或已经失效") end
        return session:send_message(args, connection)
    end
    if args.retry_run_id and args.retry_run_id ~= "" then
        return failure(codes.invalid_param, "新会话不能重试消息")
    end
    if not AgentSession.valid_text(args.text) then
        return failure(codes.invalid_param, "消息格式无效或内容过长")
    end
    local model_id = args.model_id
    if not model_id or model_id == "" then model_id = config.default_model_id end
    if not pcall(models.resolve, config, model_id) then
        return failure(codes.invalid_param, "模型不在可选清单中")
    end
    if type(config.llm.api_key) ~= "string" or config.llm.api_key == "" then
        return failure(codes.call_fail, "模型配置未加载", true)
    end
    local valid, target = pcall(self.user.execution.validate_target, self.user.execution,
        args.execution_target, connection)
    if not valid then return failure(codes.invalid_param, tostring(target)) end
    local ok, session = pcall(AgentSession.new, AgentSession, self, model_id, target)
    if not ok then
        log.failure("user.chat", "chat 创建 Agent 失败", session)
        return failure(codes.call_fail, "创建 Agent 失败", true)
    end
    self.sessions[session.id] = session
    table.insert(self.session_order, 1, session.id)
    return session:send_message(args, connection)
end

---@param args table
---@return table
function Chat:cancel_message(args)
    local session = self.sessions[args.session_id]
    if not session then return failure(codes.fail, "会话不存在或已经失效") end
    return session:cancel_run(args)
end

---@param args table
---@return table
function Chat:set_session_model(args)
    local session = self.sessions[args.session_id]
    if not session then return failure(codes.fail, "会话不存在或已经失效") end
    return session:set_model(args.model_id)
end

function Chat:close()
    for _, session in pairs(self.sessions) do session:close() end
end

return Chat
