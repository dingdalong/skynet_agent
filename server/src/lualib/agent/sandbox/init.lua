local filesystem = require("agent_filesystem")
local lfs = require("lfs")
local config = require("etc.cfg").runtime
local Sandbox = {}

function Sandbox.platform()
    return lfs.attributes("/System/Library", "mode") == "directory" and "macos" or "linux"
end

function Sandbox.command(argv, workspace, dependencies)
    return require("agent.sandbox." .. Sandbox.platform()).command(argv, workspace, dependencies or {})
end

function Sandbox.environment(workspace)
    return {
        "PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "HOME=" .. workspace .. "/.agent-home",
        "TMPDIR=" .. workspace .. "/.agent-tmp",
        "LANG=en_US.UTF-8", "TERM=xterm-256color",
    }
end

function Sandbox.program(name)
    local paths = config.executable_search_path
    for directory in paths:gmatch("[^:]+") do
        local path = filesystem.realpath(directory .. "/" .. name)
        if path and lfs.attributes(path, "mode") == "file" then return path end
    end
    error("缺少执行依赖: " .. name)
end

return Sandbox
