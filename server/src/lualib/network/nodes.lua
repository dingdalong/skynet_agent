local skynet = require("skynet")
local cluster = require("skynet.cluster")
local crypt = require("skynet.crypt")
local config = require("etc.cfg")
local Nodes = {}

function Nodes.open(port)
    cluster.reload({ center = "127.0.0.1:" .. config.app_center.port,
        gateway = "127.0.0.1:" .. config.app_center.gateway_port })
    return skynet.call(skynet.uniqueservice("clusterd"), "lua", "listen", "127.0.0.1", port)
end

function Nodes.key(create)
    local path = config.app_center.key_file
    local file = io.open(path, "r")
    if file then
        local key = file:read("a")
        file:close()
        assert(#key == 64, "集群凭据无效")
        return key
    end
    assert(create, "缺少集群凭据")
    local key = crypt.hexencode(crypt.randomkey() .. crypt.randomkey() .. crypt.randomkey() .. crypt.randomkey())
    file = assert(io.open(path .. ".tmp", "w"))
    assert(file:write(key))
    assert(file:close())
    assert(os.rename(path .. ".tmp", path))
    return key
end

function Nodes.application(id, endpoint)
    local name = "app-" .. id
    cluster.reload({ [name] = endpoint })
    skynet.call(skynet.uniqueservice("clusterd"), "lua", "sender", name)
    return cluster.proxy(name, "@application")
end

return Nodes
