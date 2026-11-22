local skynet = require("skynet")

local api_key = os.getenv("DEEPSEEK_API_KEY")
if api_key == "" then
    api_key = nil
end

local entry = skynet.getenv("start")
local database
if entry == "center_main" or entry == "main" then
    database = {
        host = os.getenv("MONGO_HOST") or "127.0.0.1",
        port = tonumber(os.getenv("MONGO_PORT") or "18083"),
        name = "skynet_agent", authdb = "admin", username = "root", password = os.getenv("MONGO_ROOT_PASSWORD"),
        platform_collection = entry == "center_main" and "app_center" or "user",
    }
else
    local settings = os.getenv("APP_DATABASE_CONFIG")
    assert(settings or entry ~= "app_main", "业务节点缺少应用数据库连接配置")
    if settings then
        local ok, assigned = pcall(require("cjson").decode, settings)
        assert(ok and type(assigned) == "table", "应用数据库连接配置无效")
        assigned.port = math.tointeger(assigned.port)
        database = assigned
    end
end

return {
    database = database,
    worker_thread = tonumber(skynet.getenv("thread")),
    runtime = {
        control_port = 18000,
        file_control = os.getenv("NODE_CONTROL_FILES") == "1",
        executable_search_path = (os.getenv("PATH") or "")
            .. ":/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
    },
    protocol = {
        agent_gateway_schema_dir = "../common/proto",
    },
    application = {
        id = os.getenv("APP_ID"),
        schema = os.getenv("APP_SCHEMA"),
        instances = tonumber(os.getenv("APP_INSTANCES") or ""),
        key = os.getenv("APP_REGISTRATION_KEY"),
    },
    app_center = {
        user_authdb = "app_credentials",
        port = tonumber(os.getenv("APP_CENTER_PORT") or "18081"),
        gateway_port = tonumber(os.getenv("GATEWAY_CLUSTER_PORT") or "18082"),
        key_file = os.getenv("CLUSTER_KEY_FILE") or "./gateway.key",
        admin_token = os.getenv("APP_CENTER_ADMIN_TOKEN"),
    },
    agent_gateway = {
        socket = {
            host = os.getenv("GATEWAY_HOST") or "127.0.0.1",
            path = "/agent",
        },
        login_timeout_ticks = 1000,
    },
    agent = {
        project_instructions_max_bytes = 32768,
        tools = {
            sandbox_backend = os.getenv("AGENT_SANDBOX_BACKEND") or "native",
            tcp_ports = os.getenv("AGENT_TOOL_TCP_PORTS"),
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
