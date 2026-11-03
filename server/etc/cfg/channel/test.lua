return {
    runtime = { control_port = 18001 },
    agent_gateway = {
        socket = {
            port = 18791,
        },
        instance = {
            client = 2,
            logind = 2,
            websocket = 2,
        },
    },
    agent = {
        llm = {
            base_url = "http://127.0.0.1:18792",
            model = "e2e-test-model",
            request_timeout_ticks = 300,
        },
    },
}
