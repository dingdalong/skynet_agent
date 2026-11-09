local lfs = require("lfs")
local native = require("agent_process")
local workspace_paths = require("agent.workspace")

local Project = {}

---@class agent.ProjectInstructions
---@field workspace string
---@field path string?
---@field text string?

---@param path string
---@return boolean
local function exists(path)
    local attributes, message, code = lfs.symlinkattributes(path)
    if not attributes then
        if code == 2 then return false end
        error("无法检查项目规则 " .. path .. ": " .. tostring(message), 0)
    end
    assert(attributes.mode == "file" or attributes.mode == "link", "项目规则必须是普通文件: " .. path)
    return true
end

---@param workspace string
---@param max_bytes integer
---@return agent.ProjectInstructions
function Project.load(workspace, max_bytes)
    assert(type(workspace) == "string" and workspace ~= "" and not workspace:find("%z"), "项目工作目录无效")
    assert(type(max_bytes) == "number" and max_bytes % 1 == 0 and max_bytes >= 0, "项目规则字节上限无效")
    if max_bytes == 0 then return { workspace = workspace } end

    local root, root_error = native.realpath(workspace)
    assert(root, "无法解析项目工作目录 " .. workspace .. ": " .. tostring(root_error))
    assert(lfs.attributes(root, "mode") == "directory", "项目工作目录必须是目录: " .. root)
    local snapshot = { workspace = root }
    for _, name in ipairs({ "AGENTS.override.md", "AGENTS.md" }) do
        local path = root .. "/" .. name
        if exists(path) then
            local resolved, resolve_error = native.realpath(path)
            assert(resolved, "无法解析项目规则 " .. path .. ": " .. tostring(resolve_error))
            assert(workspace_paths.inside(resolved, root), "项目规则超出当前会话目录: " .. path)
            assert(lfs.attributes(resolved, "mode") == "file", "项目规则必须是普通文件: " .. path)
            -- 描述符逐层拒绝符号链接，避免检查后路径被后台进程替换。
            local ok, text = pcall(native.read_file, resolved, max_bytes)
            assert(ok, "无法读取项目规则 " .. path .. ": " .. tostring(text))
            assert(#text <= max_bytes, "项目规则超过字节上限: " .. path)
            assert(utf8.len(text) and not text:find("%z"), "项目规则必须是 UTF-8 文本: " .. path)
            snapshot.path = path
            snapshot.text = text:match("%S") and text or nil
            return snapshot
        end
    end
    return snapshot
end

---@param previous agent.ProjectInstructions?
---@param current agent.ProjectInstructions
---@return llm.Message?
function Project.update(previous, current)
    local before = previous and previous.text
    if not before and not current.text then return nil end
    if previous and previous.workspace == current.workspace and previous.path == current.path
        and before == current.text then return nil end

    local parts = { "# AGENTS.md instructions for " .. current.workspace, "", "<INSTRUCTIONS>" }
    if current.text then
        if before then
            parts[#parts + 1] = "以下规则替换此前自动加载的本会话根目录项目规则。"
        end
        parts[#parts + 1] = "来源文件: " .. assert(current.path)
        parts[#parts + 1] = "作用目录: " .. current.workspace
        parts[#parts + 1] = ""
        parts[#parts + 1] = current.text
    else
        parts[#parts + 1] = "此前自动加载的本会话根目录项目规则已失效。"
        parts[#parts + 1] = "此前来源文件: " .. assert(previous.path)
        if current.path then parts[#parts + 1] = "当前来源文件: " .. current.path end
    end
    parts[#parts + 1] = "</INSTRUCTIONS>"
    return { role = "user", source = "project", content = table.concat(parts, "\n") }
end

return Project
