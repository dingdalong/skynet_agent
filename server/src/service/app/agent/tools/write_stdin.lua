local Stdin = {}
Stdin.spec = { type = "function", name = "write_stdin", description =
    "读取已有执行会话的后续输出。chars 非空时向 PTY 发送输入；空字符串只读取。"
        .. "session_id 只能来自当前聊天会话。",
    parameters = { type = "object", properties = {
        session_id = { type = "string" }, chars = { type = "string" },
        yield_time_ms = { type = "integer" }, max_output_tokens = { type = "integer" },
    }, required = { "session_id" }, additionalProperties = false } }
return Stdin
