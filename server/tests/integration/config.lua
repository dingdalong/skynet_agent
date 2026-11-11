---@class integration.ProbeConfig
---@field probe string
---@field mode string
---@field gateway_url string
---@field model_url string
---@field model_port integer
---@field control_port integer
---@field server_root string
---@field server_log? string
---@field live_prompt string
---@field command_path string

---@param name string
---@param default string
---@return integer
local function port(name, default)
    local value = tonumber(os.getenv(name) or default)
    assert(value and value % 1 == 0 and value >= 1 and value <= 65535, name .. " 必须为有效端口")
    return value
end

---@type integration.ProbeConfig
local config = {
    probe = os.getenv("AGENT_TEST_PROBE") or "agent_gateway_probe",
    mode = os.getenv("AGENT_TEST_MODE") or "test",
    gateway_url = os.getenv("AGENT_WS_URL") or "ws://127.0.0.1:18791/agent",
    model_url = os.getenv("AGENT_FAKE_LLM_URL") or "http://127.0.0.1:18792",
    model_port = port("FAKE_LLM_PORT", "18792"),
    control_port = port("AGENT_TEST_CONTROL_PORT", "18001"),
    server_root = os.getenv("AGENT_TEST_SERVER_ROOT") or ".",
    server_log = os.getenv("AGENT_TEST_SERVER_LOG"),
    live_prompt = os.getenv("AGENT_LIVE_PROMPT") or "请只回复：live-ok",
    command_path = os.getenv("PATH") or "/usr/bin:/bin",
}

return config
