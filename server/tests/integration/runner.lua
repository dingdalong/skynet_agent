local skynet = require("skynet")
local config = require("integration.config")

local probes = {
    agent_gateway_probe = true,
    fake_llm_server = true,
    hotfix_watch_probe = true,
    service_control_probe = true,
    probe_support_probe = true,
}

skynet.start(function()
    if config.probe ~= "fake_llm_server" then
        skynet.timeout(18000, function()
            io.stderr:write("集成测试总超时 probe=", config.probe, " mode=", config.mode, "\n")
            os.exit(1)
        end)
    end
    local ok, failure = xpcall(function()
        assert(probes[config.probe], "未知测试探针: " .. config.probe)
        if config.probe ~= "fake_llm_server" then
            require("helper.protobuf").load("../common/proto")
            require("pb").option("enum_as_value")
        end
        require("integration." .. config.probe).run(config)
    end, debug.traceback)
    if not ok then io.stderr:write(tostring(failure), "\n") end
    os.exit(ok and 0 or 1)
end)
