local filesystem = require("agent_filesystem")
local lfs = require("lfs")
local Sandbox = {}

function Sandbox.platform()
    return lfs.attributes("/System/Library", "mode") == "directory" and "macos" or "linux"
end

function Sandbox.command(argv, workspace, dependencies)
    return filesystem.sandbox(argv, workspace, dependencies or {})
end

function Sandbox.environment(workspace)
    return {
        "PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "HOME=" .. workspace .. "/.agent-home",
        "TMPDIR=" .. workspace .. "/.agent-tmp",
        "LANG=en_US.UTF-8", "TERM=xterm-256color",
    }
end

return Sandbox
