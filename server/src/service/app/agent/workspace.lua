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

local function projects_root(root, user_id)
    assert(type(user_id) == "string" and user_id ~= "", "缺少账号身份")
    local encoded = user_id:gsub(".", function(byte) return string.format("%02x", byte:byte()) end)
    local path = Workspace.resolve(root) .. "/" .. encoded .. "/projects"
    assert(Workspace.resolve(path) == path, "项目根目录已变更")
    return path
end

function Workspace.valid_name(name)
    return type(name) == "string" and #name <= 255 and utf8.len(name) and name:match("%S")
        and name ~= "." and name ~= ".." and not name:find("[/%c]") and not name:find("\\", 1, true)
end

local function project_path(root, user_id, name)
    assert(Workspace.valid_name(name), "请输入有效的单个项目名称")
    local path = projects_root(root, user_id) .. "/" .. name
    assert(not lfs.symlinkattributes(path) or lfs.symlinkattributes(path, "mode") == "directory", "项目目录不可用")
    return path
end

function Workspace.list(root, user_id)
    local path = projects_root(root, user_id)
    local names = {}
    if not lfs.attributes(path) then return names end
    for name in lfs.dir(path) do
        if Workspace.valid_name(name) and lfs.symlinkattributes(path .. "/" .. name, "mode") == "directory" then
            names[#names + 1] = name
        end
    end
    table.sort(names)
    return names
end

function Workspace.existing(root, user_id, name)
    local path = project_path(root, user_id, name)
    assert(lfs.symlinkattributes(path, "mode") == "directory", "原项目目录不可用，请恢复目录或新建会话")
    return path
end

function Workspace.create(root, user_id, name)
    local path = project_path(root, user_id, name)
    Workspace.mkdir(path)
    for _, suffix in ipairs({ "/.agent-tmp", "/.agent-home" }) do
        local dir = path .. suffix
        assert(not lfs.symlinkattributes(dir) or lfs.symlinkattributes(dir, "mode") == "directory", "项目运行目录不可用")
        Workspace.mkdir(dir)
    end
    return path
end

return Workspace
