local cjson = require("cjson")
local fixture = os.getenv("AGENT_REAL_FIXTURE")

return {
    shutdown_mode = os.getenv("SHUTDOWN_TEST_MODE") or "normal",
    shutdown_port = tonumber(os.getenv("SHUTDOWN_TEST_CONTROL_PORT")) or 18002,
    real_fixture = fixture and cjson.decode(fixture) or nil,
}
