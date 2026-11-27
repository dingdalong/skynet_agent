local error_code = require("error_code")
local log = require("log")
local Client = require("agent.tools.runtime.client")
local REQUEST = {}

function REQUEST:AgentSnapshotReq()
    -- A timed-out first write may have created no session. Confirm it before listing it again.
    for _, session in pairs(self.chat.sessions) do
        if session.storage_failed and not session.run then require("agent.persistence").reload(self, session) end
    end
    return { ret = error_code.succ, snapshot = self:snapshot() }
end

function REQUEST:AgentSessionHistoryReq(args)
    local session = self.chat.sessions[args.session_id]
    if not session then return { ret = error_code.fail, error = { message = "会话不存在" } } end
    return session:history(args.before or 0)
end

function REQUEST:AgentChatReq(args, connection)
    return self.chat:chat(args, connection)
end

function REQUEST:AgentMessageCancelReq(args)
    return self.chat:cancel_message(args)
end

function REQUEST:AgentSessionModelSetReq(args)
    return self.chat:set_session_model(args)
end

function REQUEST:AgentPreferenceSetReq(args)
    local store = require("agent.persistence")
    if not pcall(require("agent.models").resolve, require("etc.cfg").agent, args.model_id) then
        return { ret = error_code.invalid_param, error = { message = "模型不可用" } }
    end
    store.settings(self, "model", { model_id = args.model_id })
    self.default_model = args.model_id
    return { ret = error_code.succ, model_id = args.model_id }
end

local function attempt(method, owner, args, connection)
    local ok, result = pcall(method, owner, args, connection)
    if ok then return result end
    log.failure("execution", "request", result)
    return { ret = error_code.invalid_param, error = { message = tostring(result):match("[^\n]+$"), retryable = false } }
end
function REQUEST:AgentDesktopRegisterReq(args, connection)
    return attempt(self.register_desktop, self, args, connection)
end

function REQUEST:AgentExecutionResultReq(args, connection)
    return attempt(Client.receive_result, self.pending_client_requests, args, connection)
end

function REQUEST:AgentCloudProjectCreateReq(args)
    local workspace = require("agent.workspace")
    if not workspace.valid_name(args.name) then
        return { ret = error_code.invalid_param, error = { message = "请输入有效的单个项目名称" } }
    end
    local ok, err = pcall(workspace.create, require("etc.cfg").agent.tools.workspace_root, self.identity.user_id,
        args.name)
    if not ok then
        log.failure("agent.workspace", "create", err)
        return { ret = error_code.call_fail, error = { message = "云端项目目录创建失败" } }
    end
    self:publish("AgentCloudProjectCreatedNtf", { name = args.name })
    return { ret = error_code.succ, name = args.name }
end

return { REQUEST = REQUEST }
