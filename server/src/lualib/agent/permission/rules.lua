local Rules = {}

function Rules.check(action, config)
    if not config.rules_enabled then return true end
    if action.name == "exec_command" then
        local command = action.args.cmd
        for _, pattern in ipairs(config.deny_patterns or { "rm%s+%-[^\n]*r[^\n]*%s+/%s*$",
            "mkfs[%s%.]", "shutdown%s", "reboot%s" }) do
            if command:match(pattern) then return false, "命中服务端禁止命令规则" end
        end
    end
    return true
end

return Rules
