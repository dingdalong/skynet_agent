return {
    agent_gateway = {
        socket = {
            port = 18787,
        },
    },
    agent = {
        llm = {
            base_url = os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com",
            model = os.getenv("DEEPSEEK_MODEL") or "deepseek-flash",
        },
    },
}
