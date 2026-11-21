local filesystem = require("agent_filesystem")
local lfs = require("lfs")
local Sandbox = {}

function Sandbox.platform()
    return lfs.attributes("/System/Library", "mode") == "directory" and "macos" or "linux"
end

function Sandbox.command(argv, workspace, dependencies, config)
    if config.sandbox_backend == "landlock" then
        local command = { "/usr/local/libexec/workspace-sandbox", workspace }
        if config.tcp_ports then command[#command + 1] = "--tcp=" .. config.tcp_ports end
        for _, path in ipairs(dependencies or {}) do command[#command + 1] = path end
        command[#command + 1] = "--"
        for _, argument in ipairs(argv) do command[#command + 1] = argument end
        return command
    end
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
