local Macos = {}

local function quote(value)
    return '"' .. value:gsub("\\", "\\\\"):gsub('"', '\\"') .. '"'
end

function Macos.command(argv, workspace, dependencies)
    local reads = { "/System", "/usr", "/bin", "/sbin", "/Library/Apple", "/opt/homebrew",
        "/private/etc", "/dev", workspace }
    for _, path in ipairs(dependencies) do reads[#reads + 1] = path end
    local profile = {
        "(version 1)(deny default)",
        "(allow process-exec process-fork)(allow signal (target same-sandbox))",
        "(allow process-info* (target same-sandbox))(allow sysctl-read)",
        "(allow file-read-metadata)(allow network*)",
        -- dyld needs the root vnode itself while bootstrapping its shared cache.
        '(allow file-read* (literal "/"))',
        '(allow mach-lookup (global-name "com.apple.TrustEvaluationAgent")'
            .. ' (global-name "com.apple.system.opendirectoryd.libinfo"))',
        '(allow file-read* file-write* file-ioctl (literal "/dev/null") (literal "/dev/ptmx")'
            .. ' (regex #"^/dev/ttys[0-9]+"))(allow pseudo-tty)',
        "(allow file-write* (subpath " .. quote(workspace) .. "))",
    }
    for _, path in ipairs(reads) do profile[#profile + 1] = "(allow file-read* (subpath " .. quote(path) .. "))" end
    local command = { "/usr/bin/sandbox-exec", "-p", table.concat(profile, "\n") }
    for _, arg in ipairs(argv) do command[#command + 1] = arg end
    return command
end

return Macos
