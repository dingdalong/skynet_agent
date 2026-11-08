local lfs = require("lfs")
local Linux = {}

function Linux.command(argv, workspace, dependencies)
    local command = { require("agent.sandbox").program("bwrap"), "--unshare-user", "--unshare-pid",
        "--unshare-ipc", "--unshare-uts", "--die-with-parent", "--new-session", "--cap-drop", "ALL",
        "--proc", "/proc", "--dev", "/dev", "--dir", "/tmp" }
    for _, path in ipairs({ "/usr", "/bin", "/sbin", "/lib", "/lib64", "/etc/ssl", "/etc/pki",
        "/etc/resolv.conf", "/etc/hosts", "/etc/nsswitch.conf", "/etc/ld.so.cache" }) do
        if lfs.attributes(path) then
            command[#command + 1] = "--ro-bind"; command[#command + 1] = path; command[#command + 1] = path
        end
    end
    for _, path in ipairs(dependencies) do
        command[#command + 1] = "--ro-bind"; command[#command + 1] = path; command[#command + 1] = path
    end
    command[#command + 1] = "--bind"; command[#command + 1] = workspace; command[#command + 1] = workspace
    -- Keep bubblewrap's synthetic parent directories read-only as well.
    command[#command + 1] = "--remount-ro"; command[#command + 1] = "/"
    command[#command + 1] = "--chdir"; command[#command + 1] = workspace
    command[#command + 1] = "--"
    for _, arg in ipairs(argv) do command[#command + 1] = arg end
    return command
end

return Linux
