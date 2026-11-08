return {
    runtime = { control_port = 18001 },
    agent_gateway = {
        socket = { port = 18791 },
        instance = { client = 2, logind = 2, websocket = 2 },
    },
    agent = { llm = require("etc.cfg.channel.develop").agent.llm },
}
