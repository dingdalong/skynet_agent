return {
    runtime = {
        control_port = os.getenv("NODE_ROLE") == "center" and not os.getenv("APP_ID") and 18004
            or os.getenv("APP_ID") and 18003 or 18001
    },
    application = { instances = 2 },
    agent_gateway = {
        socket = {
            port = tonumber(os.getenv("GATEWAY_PORT") or "18791"),
        },
        instance = {
            client = 2,
            logind = 2,
            websocket = 2,
        },
    },
    agent = {
        default_model_id = "e2e-test-model",
        models = {
            { id = "e2e-test-model", name = "测试 Flash", model = "e2e-test-model" },
            { id = "e2e-second-model", name = "测试 Pro", model = "e2e-second-model" },
        },
        permission = { timeout_ticks = 100 },
        llm = {
            base_url = "http://127.0.0.1:18792",
            model = "e2e-test-model",
            request_timeout_ticks = 300,
        },
    },
}
