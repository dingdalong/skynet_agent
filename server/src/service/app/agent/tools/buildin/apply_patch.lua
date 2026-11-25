local filesystem = require("agent_filesystem")
local cjson = require("cjson")
local Patch = {}

Patch.spec = {
    type = "function",
    name = "apply_patch",
    description =
        "使用 *** Begin Patch / *** End Patch 格式增删改文件，支持 *** Move to:。"
        .. "相对路径基于会话工作目录。",
    parameters = {
        type = "object",
        properties = {
            patch = { type = "string" },
            sandbox_permissions = {
                type = "string",
                enum = { "use_default", "require_escalated" }
            },
            justification = { type = "string" },
        },
        required = { "patch" },
        additionalProperties = false
    }
}

function Patch.prepare(action)
    local result = cjson.decode(filesystem.prepare_patch(action.args.patch, action.workspace,
        action.mode == "require_escalated"))
    assert(result.ok, result.error)
    action.paths = result.changed_files
end

function Patch.execute(action, processes, run, record)
    local worker = assert(filesystem.realpath("bin/agent_worker"))
    local input = filesystem.temporary_file(action.args.patch)
    local argv = { worker, "patch", action.workspace, input }
    local ok, process = pcall(processes.start, processes, argv, action.workspace, false, action.mode,
        processes.config.timeout_ms, run, record, { worker, input })
    if not ok then
        os.remove(input); error(process, 0)
    end
    process.cleanup_path = input
    local result, output = nil, ""
    repeat
        result = processes:collect(process, 1000, 16384)
        output = output .. result.output
        assert(#output <= processes.config.max_output_bytes, "补丁执行输出过长")
    until not result.session_id
    local decoded, value = pcall(cjson.decode, output)
    if decoded and type(value) == "table" then
        record.changed_files = value.changed_files
        processes:publish(process)
        return value
    end
    return { ok = false, error = result.error or output, exit_code = result.exit_code }
end

return Patch
