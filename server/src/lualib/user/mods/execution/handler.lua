local codes = require("enum.error_code")
local log = require("log")
local REQUEST = {}
local function attempt(method, self, args, connection)
    local ok, result = pcall(method, self.execution, args, connection)
    if ok then return result end
    log.failure("execution", "request", result)
    return { ret = codes.invalid_param, error = { message = tostring(result):match("[^\n]+$"), retryable = false } }
end
function REQUEST:DesktopRegisterReq(args, connection)
    return attempt(self.execution.register, self, args, connection)
end
function REQUEST:ExecutionResultReq(args, connection)
    return attempt(self.execution.result, self, args, connection)
end
function REQUEST:SessionExecutionSetReq(args, connection)
    local session = self.chat.sessions[args.session_id]
    if not session then return { ret = codes.fail } end
    local ok, result = pcall(session.set_execution, session, args.target, connection)
    if ok then return result end
    log.failure("execution", "set_execution", result)
    return { ret = codes.invalid_param, error = { message = tostring(result), retryable = false } }
end
return { REQUEST = REQUEST }
