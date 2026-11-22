local config = require("etc.cfg")
local network = require("network.nodes")

require("node").init(function(node)
    node:launch("database", 1, nil, ".database")
    require("helper.protobuf").load(config.protocol.agent_gateway_schema_dir, "app_center/schema.proto")
    network.key(true)
    network.open(config.app_center.port)
    node.app_center = node:launch("app.app_center", 1, nil, ".app_center")[1]
end)
