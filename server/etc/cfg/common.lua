local skynet = require("skynet")

local api_key = os.getenv("DEEPSEEK_API_KEY")
if api_key == "" then
    api_key = nil
end

return {
    worker_thread = tonumber(skynet.getenv("thread")),
    runtime = {
        control_port = 18000,
        executable_search_path = (os.getenv("PATH") or "")
            .. ":/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
    },
    protocol = {
        agent_gateway_schema_dir = "../common/proto",
    },
    agent_gateway = {
        socket = {
            host = "127.0.0.1",
            path = "/agent",
        },
        login_timeout_ticks = 1000,
    },
    agent = {
        project_instructions_max_bytes = 32768,
        tools = {
            workspace_root = os.getenv("AGENT_WORKSPACE_ROOT") or "./work_dir",
            timeout_ms = 300000,
            max_processes = 8,
            max_output_bytes = 1048576,
        },
        permission = { rules_enabled = true, timeout_ticks = 3000 },
        max_message_length = 20000,
        session_title_length = 24,
        default_model_id = os.getenv("DEEPSEEK_MODEL") or "deepseek-flash",
        models = {
            { id = "deepseek-flash", name = "DeepSeek Flash", model = "deepseek-flash" },
            { id = "deepseek-v4-pro", name = "DeepSeek Pro", model = "deepseek-v4-pro" },
        },
        llm = {
            api_key = api_key,
            request_timeout_ticks = 12000,
        },
    },
}
