local lfs = require("lfs")
local workspace = require("agent.workspace")
local Bash = {}
Bash.spec = {
    type = "function",
    name = "exec_command",
    description =
        "在服务端会话目录运行 bash，默认使用系统沙盒并允许联网。"
        .. "长任务返回 session_id，可用 write_stdin 继续。"
        .. "沙盒外执行必须设置 require_escalated 并说明原因；"
        .. "不要在失败后盲目重复有副作用的命令。",
    parameters = {
        type = "object",
        properties = {
            cmd = { type = "string" },
            workdir = { type = "string" },
            tty = { type = "boolean" },
            yield_time_ms = { type = "integer" },
            timeout_ms = { type = "integer" },
            max_output_tokens = { type = "integer" },
            sandbox_permissions = {
                type = "string",
                enum = { "use_default", "require_escalated" }
            },
            justification = { type = "string" },
        },
        required = { "cmd" },
        additionalProperties = false
    }
}

function Bash.prepare(action)
    local args = action.args
    assert(args.cmd:match("%S") and #args.cmd <= 65536, "命令为空或过长")
    action.cwd = workspace.resolve(args.workdir or ".", action.workspace)
    assert(lfs.attributes(action.cwd, "mode") == "directory", "命令工作目录不存在")
    assert(action.mode == "require_escalated" or workspace.inside(action.cwd, action.workspace), "工作目录超出当前会话")
end

function Bash.execute(action, processes, run, record)
    local args = action.args
    local process = processes:start({ "/bin/bash", "--noprofile", "--norc", "-c", args.cmd },
        action.cwd, args.tty or false, action.mode, action.timeout, run, record)
    return processes:collect_result(process, action, record)
end

return Bash
