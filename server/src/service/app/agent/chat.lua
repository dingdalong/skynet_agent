local class = require("class")
local AgentSession = require("agent.session")
local error_code = require("error_code")
local models = require("agent.models")
local log = require("log")
local config = require("etc.cfg").agent

---@class agent.Chat
---@field app agent.App
---@field sessions table<string, agent.session.AgentSession>
---@field session_order string[]
---@field prompt_templates agent.PromptTemplates
---@field pending_runs table<agent.Run, boolean>
local Chat = class()

local function failure(code, message, retryable)
    log.info("agent.chat", "request", "拒绝请求 code=%d reason=%s", code, message)
    return { ret = code, error = { message = message, retryable = retryable or false } }
end

function Chat:ctor(app, templates, pending_runs)
    self.app = app
    self.sessions = {}
    self.session_order = {}
    self.prompt_templates = templates
    self.pending_runs = pending_runs
end

---@return table[]
function Chat:snapshot()
    local sessions = {}
    for _, id in ipairs(self.session_order) do
        sessions[#sessions + 1] = self.sessions[id]:snapshot(0, 0)
    end
    return sessions
end

---@param name string
---@param args table
function Chat:publish(name, args)
    self.app:publish(name, args)
end

---@param args table
---@return table
function Chat:chat(args, connection)
    if args.session_id and args.session_id ~= "" then
        local session = self.sessions[args.session_id]
        if not session then return failure(error_code.fail, "会话不存在或已经失效") end
        if args.execution_target or (args.cloud_project or "") ~= "" then
            return failure(error_code.invalid_param, "已有会话的项目已固定")
        end
        return session:send_message(args, connection)
    end
    if args.retry_run_id and args.retry_run_id ~= "" then
        return failure(error_code.invalid_param, "新会话不能重试消息")
    end
    if not AgentSession.valid_text(args.text) then
        return failure(error_code.invalid_param, "消息格式无效或内容过长")
    end
    local model_id = args.model_id
    if not model_id or model_id == "" then model_id = self.app.default_model end
    if not pcall(models.resolve, config, model_id) then
        return failure(error_code.invalid_param, "模型不在可选清单中")
    end
    if type(config.llm.api_key) ~= "string" or config.llm.api_key == "" then
        return failure(error_code.call_fail, "模型配置未加载", true)
    end
    local valid, target = pcall(self.app.desktop_connections.validate_target, self.app.desktop_connections,
        args.execution_target, connection)
    if not valid then return failure(error_code.invalid_param, tostring(target)) end
    local project = args.cloud_project ~= "" and args.cloud_project or nil
    if (project ~= nil) == (target ~= nil) or args.execution_target and not target then
        return failure(error_code.invalid_param, "请选择一个工作项目")
    end
    local workspace
    if project then
        local found
        found, workspace = pcall(require("agent.workspace").existing, config.tools.workspace_root,
            self.app.identity.user_id,
            project)
        if not found then return failure(error_code.invalid_param, "云端项目不可用，请重新选择") end
    end
    local ok, session = pcall(AgentSession.new, AgentSession, self, model_id, target, nil, project, workspace)
    if not ok then
        log.failure("agent.chat", "chat 创建 Agent 失败", session)
        return failure(error_code.call_fail, "创建 Agent 失败", true)
    end
    self.sessions[session.id] = session
    table.insert(self.session_order, 1, session.id)
    return session:send_message(args, connection)
end

---@param args table
---@return table
function Chat:cancel_message(args)
    local session = self.sessions[args.session_id]
    if not session then return failure(error_code.fail, "会话不存在或已经失效") end
    return session:cancel_run(args)
end

---@param args table
---@return table
function Chat:set_session_model(args)
    local session = self.sessions[args.session_id]
    if not session then return failure(error_code.fail, "会话不存在或已经失效") end
    return session:set_model(args.model_id)
end

function Chat:close()
    local succeeded = true
    for id, session in pairs(self.sessions) do
        local ok, err = pcall(session.close, session)
        if not ok then
            log.failure("agent.chat", "close session=" .. id, err)
            succeeded = false
        end
    end
    return succeeded
end

return Chat
