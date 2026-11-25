local socket = require("skynet.socket")

return {
    run = function()
        local ports, listeners = {}, {}
        for i = 1, 4 do
            local id, _, port = socket.listen("127.0.0.1", 0)
            listeners[i], ports[i] = assert(id), assert(port)
        end
        print(table.concat(ports, " "))
        for _, id in ipairs(listeners) do socket.close(id) end
    end
}
