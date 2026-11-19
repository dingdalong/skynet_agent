local Bash = {}
Bash.spec = { type = "function", name = "exec_command", description =
    "在服务端会话目录运行 bash，默认使用系统沙盒并允许联网。"
        .. "长任务返回 session_id，可用 write_stdin 继续。"
        .. "沙盒外执行必须设置 require_escalated 并说明原因；"
        .. "不要在失败后盲目重复有副作用的命令。",
    parameters = { type = "object", properties = {
        cmd = { type = "string" }, workdir = { type = "string" }, tty = { type = "boolean" },
        yield_time_ms = { type = "integer" }, timeout_ms = { type = "integer" },
        max_output_tokens = { type = "integer" }, sandbox_permissions = { type = "string",
            enum = { "use_default", "require_escalated" } }, justification = { type = "string" },
    }, required = { "cmd" }, additionalProperties = false } }
return Bash
