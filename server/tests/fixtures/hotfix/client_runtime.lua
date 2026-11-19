local skynet = require("skynet")

local function reload(address, ...)
    local ok, err, report = skynet.call(address, "debug", "HOTFIX", ...)
    assert(ok, err)
    assert(#report.updated == select("#", ...), "热修跳过模块: " .. table.concat(report.skipped, ","))
end

-- inject 返回文本，探针据此确认 HOTFIX 调试 RPC 的布尔结果。
for index = 1, 2 do
    reload(".client_" .. index, "client", "client.user")
end
local _, states = skynet.call(".main", "lua", "status")
local count = 0
for address in states:gmatch("(%.agent_%d+) :%x+ ready") do
    reload(address, "agent", "agent.app", "agent.handler", "agent.chat", "agent.session", "agent.agent", "agent.run")
    count = count + 1
end
assert(count > 0)
print("CLIENT_HOTFIX_OK")
