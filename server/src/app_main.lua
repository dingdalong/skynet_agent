local config = require("etc.cfg")
local frame = require("network.frame")
local rpc = require("rpc")
local protobuf = require("helper.protobuf")

require("node").init(function(node)
    local app = config.application
    assert(frame.valid_app(app.id) and app.schema, "缺少应用节点配置")
    local count = app.instances or config.agent_gateway.instance.agent
    assert(math.type(count) == "integer" and count >= 1 and count <= 32, "无效的应用实例数")
    protobuf.load(config.protocol.agent_gateway_schema_dir, app.schema)
    local workers = node:launch("app." .. app.id:gsub("-", "_"), count)
    local endpoint = node:launch("app_endpoint", 1, { app = app.id, workers = workers }, ".app_endpoint")[1]
    local _, port = require("network.nodes").open(0)
    require("log").info("app", "listen", "app=%s endpoint=127.0.0.1:%d", app.id, port)
    assert(rpc.call(endpoint, "announce", port) == require("enum.error_code").succ)
end)
