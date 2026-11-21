local config = require("etc.cfg")
local frame = require("network.frame")
local cluster = require("skynet.cluster")
local protobuf = require("helper.protobuf")

require("node").init(function(node)
    local app = config.application
    assert(frame.valid_app(app.id) and app.schema, "缺少应用节点配置")
    local count = app.instances or config.agent_gateway.instance.agent
    assert(math.type(count) == "integer" and count >= 1 and count <= 32, "无效的应用实例数")
    protobuf.load(config.protocol.agent_gateway_schema_dir, app.schema)
    local workers = node:launch("app." .. app.id:gsub("-", "_"), count)
    node:launch("app_endpoint", 1, { app = app.id, workers = workers }, ".app_endpoint")
    cluster.open(18082)
end)
