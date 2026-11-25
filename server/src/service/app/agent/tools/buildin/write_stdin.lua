local Stdin = { default_wait_ms = 1000 }
Stdin.spec = {
    type = "function",
    name = "write_stdin",
    description =
        "读取已有执行会话的后续输出。chars 非空时向 PTY 发送输入；空字符串只读取。"
        .. "session_id 只能来自当前聊天会话。",
    parameters = {
        type = "object",
        properties = {
            session_id = { type = "string" },
            chars = { type = "string" },
            yield_time_ms = { type = "integer" },
            max_output_tokens = { type = "integer" },
        },
        required = { "session_id" },
        additionalProperties = false
    }
}

function Stdin.prepare(action, processes)
    local process = processes:get(action.args.session_id)
    assert(#(action.args.chars or "") <= 65536, "终端输入过长")
    action.mode, action.cwd, action.launch_argv = process.mode, process.cwd, process.argv
end

function Stdin.execute(action, processes, run, record)
    local process = processes:get(action.args.session_id)
    run.executions[process.id] = processes
    record.process_id, record.status = process.id, "running"
    return processes:collect_result(process, action, record)
end

return Stdin
