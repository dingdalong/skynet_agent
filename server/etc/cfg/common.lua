local skynet = require("skynet")

local api_key = os.getenv("DEEPSEEK_API_KEY")
if api_key == "" then
    api_key = nil
end

local entry = skynet.getenv("start")
local database_prefix = entry == "center_main" and "APP_CENTER_MONGO_"
    or entry == "main" and "GATEWAY_MONGO_" or "APP_MONGO_"
local database_name = os.getenv(database_prefix .. "DATABASE")

return {
    database = {
        host = os.getenv("APP_MONGO_HOST") or "127.0.0.1",
        port = tonumber(os.getenv("APP_MONGO_PORT") or "18083"),
        name = database_name,
        authdb = os.getenv(database_prefix .. "AUTH_DB") or database_name,
        username = os.getenv(database_prefix .. "USERNAME"),
        password = os.getenv(database_prefix .. "PASSWORD"),
    },
    database_admin = entry == "center_main" and {
        password = os.getenv("APP_CENTER_MONGO_PROVISION_PASSWORD"),
        user_authdb = "app_credentials",
        legacy_database = os.getenv("LEGACY_MONGO_DATABASE") or "applications",
        legacy_authdb = os.getenv("LEGACY_MONGO_AUTH_DB") or "applications",
        legacy_username = os.getenv("LEGACY_MONGO_USERNAME") or "applications",
    } or nil,
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
