local skynet = require("skynet")

-- inject 返回文本，探针据此确认 HOTFIX 调试 RPC 的布尔结果。
for index = 1, 2 do
    local ok, err = skynet.call(".client_" .. index, "debug", "HOTFIX",
        "client", "user", "agent")
    assert(ok, err)
end
print("CLIENT_HOTFIX_OK")
