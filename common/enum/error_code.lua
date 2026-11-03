---@enum error_code
local error_code = {
    -- 1～99 通用
    succ = 1,
    fail = 2,
    server_busy = 4,
    invalid_param = 12,
    call_fail = 17,
    timeout = 18,
    invalid_command = 19,

    -- WebSocket 关闭码
    websocket_unsupported_data = 1003,
    websocket_invalid_payload_data = 1007,
    websocket_policy_violation = 1008,
    websocket_internal_error = 1011,
}

return error_code
