local skynet = require("skynet")

local api_key = os.getenv("DEEPSEEK_API_KEY")
if api_key == "" then
    api_key = nil
end

return {
    worker_thread = tonumber(skynet.getenv("thread")),
    runtime = {
        control_port = 18000,
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
        system_prompt = "你是一个可靠、清晰的中文助手。"
            .. "回答应直接、准确，并说明重要限制。",
        max_message_length = 20000,
        session_title_length = 24,
        llm = {
            api_key = api_key,
            request_timeout_ticks = 12000,
        },
    },
}
