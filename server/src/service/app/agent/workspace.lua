local lfs = require("lfs")
local filesystem = require("agent_filesystem")
local Workspace = {}

function Workspace.inside(path, root)
    return path == root or path:sub(1, #root + 1) == root .. "/"
end

function Workspace.resolve(path, base)
    assert(type(path) == "string" and not path:find("%z"), "路径无效")
    if path:sub(1, 1) ~= "/" then path = (base or assert(filesystem.realpath("."))) .. "/" .. path end
    local parts = {}
    for part in path:gmatch("[^/]+") do
        if part == ".." then table.remove(parts) elseif part ~= "." then parts[#parts + 1] = part end
    end
    path = "/" .. table.concat(parts, "/")
    local resolved = filesystem.realpath(path)
    if resolved then return resolved end
    local parent, name = path:match("^(.*)/([^/]+)$")
    assert(parent and parent ~= path, "无法解析路径")
    local resolved_parent = Workspace.resolve(parent == "" and "/" or parent)
    return (resolved_parent == "/" and "" or resolved_parent) .. "/" .. name
end

function Workspace.mkdir(path)
    if lfs.attributes(path, "mode") == "directory" then return end
    local parent = path:match("^(.*)/[^/]+$")
    if parent and parent ~= "" and parent ~= path then Workspace.mkdir(parent) end
    local ok, err = lfs.mkdir(path)
    assert(ok or lfs.attributes(path, "mode") == "directory", err)
end

function Workspace.create(root, username, session_id)
    assert(session_id:match("^[%w_-]+$"), "会话目录身份无效")
    local encoded = username:gsub(".", function(byte) return string.format("%02x", byte:byte()) end)
    root = Workspace.resolve(root)
    local path = root .. "/" .. encoded .. "/" .. session_id
    Workspace.mkdir(path)
    assert(Workspace.inside(Workspace.resolve(path), root), "会话目录越界")
    Workspace.mkdir(path .. "/.agent-tmp")
    Workspace.mkdir(path .. "/.agent-home")
    return path
end

return Workspace
