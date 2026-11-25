local codes = require("enum.error_code")
local log = require("log")
local Client = require("agent.tools.runtime.client")
local REQUEST = {}

function REQUEST:AgentSnapshotReq()
    -- A timed-out first write may have created no session. Confirm it before listing it again.
    for _, session in pairs(self.chat.sessions) do
        if session.storage_failed and not session.run then require("agent.persistence").reload(self, session) end
    end
    return { ret = codes.succ, snapshot = self:snapshot() }
end

function REQUEST:AgentSessionHistoryReq(args)
    local session = self.chat.sessions[args.session_id]
    if not session then return { ret = codes.fail, error = { message = "会话不存在" } } end
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

function REQUEST:AgentPreferenceSetReq(args, connection)
    local store = require("agent.persistence")
    if args.set_target then
        if not connection.device_id then return { ret = codes.invalid_param } end
        local ok, target = pcall(self.desktop_connections.validate_target, self.desktop_connections, args.target,
            connection)
        if not ok then return { ret = codes.invalid_param, error = { message = "工作目录无效" } } end
        store.settings(self, "device/" .. connection.device_id, { target = target or {} })
        self.targets[connection.device_id] = target
        return { ret = codes.succ, target = target, set_target = true }
    end
    if not pcall(require("agent.models").resolve, require("etc.cfg").agent, args.model_id) then
        return { ret = codes.invalid_param, error = { message = "模型不可用" } }
    end
    store.settings(self, "model", { model_id = args.model_id })
    self.default_model = args.model_id
    return { ret = codes.succ, model_id = args.model_id }
end

local function attempt(method, owner, args, connection)
    local ok, result = pcall(method, owner, args, connection)
    if ok then return result end
    log.failure("execution", "request", result)
    return { ret = codes.invalid_param, error = { message = tostring(result):match("[^\n]+$"), retryable = false } }
end
function REQUEST:AgentDesktopRegisterReq(args, connection)
    return attempt(self.register_desktop, self, args, connection)
end

function REQUEST:AgentExecutionResultReq(args, connection)
    return attempt(Client.receive_result, self.pending_client_requests, args, connection)
end

function REQUEST:AgentSessionExecutionSetReq(args, connection)
    local session = self.chat.sessions[args.session_id]
    if not session then return { ret = codes.fail } end
    local ok, result = pcall(session.set_execution, session, args.target, connection)
    if ok then return result end
    log.failure("execution", "set_execution", result)
    return { ret = codes.invalid_param, error = { message = tostring(result), retryable = false } }
end

return { REQUEST = REQUEST }
