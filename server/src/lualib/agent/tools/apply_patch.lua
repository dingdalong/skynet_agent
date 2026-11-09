local filesystem = require("agent_filesystem")
local cjson = require("cjson")
local Patch = {}

Patch.spec = { type = "function", name = "apply_patch", description =
    "使用 *** Begin Patch / *** End Patch 格式增删改文件，支持 *** Move to:。"
        .. "相对路径基于会话工作目录。",
    parameters = { type = "object", properties = {
        patch = { type = "string" }, sandbox_permissions = { type = "string",
            enum = { "use_default", "require_escalated" } }, justification = { type = "string" },
    }, required = { "patch" }, additionalProperties = false } }

function Patch.prepare(text, root, mode)
    local result = cjson.decode(filesystem.prepare_patch(text, root, mode == "require_escalated"))
    assert(result.ok, result.error)
    return result.changed_files
end

return Patch
