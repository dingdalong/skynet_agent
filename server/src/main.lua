local node = require("node")
local protobuf = require("helper.protobuf")
local config = require("etc.cfg")

node.init(function(instance)
    protobuf.load(config.protocol.agent_gateway_schema_dir, "platform.proto")
    local count = config.agent_gateway.instance
    instance.app_center = instance:launch("app.app_center", 1, nil, ".app_center")[1]
    local client_services = instance:launch("client", count.client)
    local loginds = instance:launch("logind", count.logind, { client_services = client_services })
    local websockets = instance:launch("websocket", count.websocket)
    instance:launch("gateway", 1, { loginds = loginds, websockets = websockets }, ".gateway")
end)
