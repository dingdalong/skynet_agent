local skynet = require("skynet")
local config = require("etc.cfg")
local remote = setmetatable({}, { __index = skynet })
local allowed = {
    [".app_center"] = { directory = true, register = true, submit = true, request = true, disconnect = true },
    [".app_routes"] = { update = true, publish = true },
    [".app_endpoint"] = { hello = true, request = true, disconnect = true, events = true, drain = true, finish = true },
}

local function authorize(address, message, size)
    local args = table.pack(skynet.unpack(message, size))
    for name, commands in pairs(allowed) do
        if address == skynet.localname(name) and commands[args[1]] then
            if name ~= ".app_endpoint" or (config.application.key and args[args.n] == config.application.key) then
                return
            end
        end
    end
    skynet.trash(message, size)
    error("拒绝未经授权的跨节点调用")
end

function remote.rawcall(address, protocol, message, size)
    authorize(address, message, size)
    return skynet.rawcall(address, protocol, message, size)
end

function remote.rawsend(address, protocol, message, size)
    authorize(address, message, size)
    return skynet.rawsend(address, protocol, message, size)
end

function remote.tracecall(tag, address, protocol, message, size)
    authorize(address, message, size)
    return skynet.tracecall(tag, address, protocol, message, size)
end

local environment = setmetatable({
    require = function(name)
        if name == "skynet" then return remote end
        return require(name)
    end
}, { __index = _ENV })
assert(loadfile("3rd/skynet/service/clusteragent.lua", "t", environment))(...)
