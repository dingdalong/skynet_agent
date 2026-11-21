local Echo = require("class")()
local rpc = require("rpc")
Echo.commands = { handle_request = "handle_request", disconnect = "disconnect", drain = "drain" }

function Echo:ctor() end
function Echo:handle_request(context, identity, connection, name, args, draining)
    assert(not draining and name == "EchoRepeatReq")
    rpc.send(context.source, "publish", identity.username, "EchoRepeatedNtf", args, connection)
    return args
end
function Echo:disconnect() end
function Echo:drain() return true end
return Echo
