local skynet = require("skynet")

-- inject 返回文本，探针据此确认 HOTFIX 调试 RPC 的布尔结果。
for index = 1, 2 do
    local ok, err = skynet.call(".client_" .. index, "debug", "HOTFIX", "client", "user")
    assert(ok, err)
end
local _, states = skynet.call(".main", "lua", "status")
local count = 0
for address in states:gmatch("(%.agent_%d+) :%x+ ready") do
    local ok, err = skynet.call(address, "debug", "HOTFIX",
        "agent", "agent.app", "agent.handler", "agent.chat", "agent_session", "agent.agent", "agent.run")
    assert(ok, err)
    count = count + 1
end
assert(count > 0)
print("CLIENT_HOTFIX_OK")
