local class = require("class")
local socket = require("skynet.socket")
local pool = require("helper.service_pool")
local rpc = require("rpc")
local log = require("log")
local error_code = require("enum.error_code")
local config = require("etc.cfg").agent_gateway.socket

---@class gateway.Gateway
---@field new fun(self: gateway.Gateway): gateway.Gateway
---@field listen_id integer?
---@field websockets helper.ServicePool?
---@field loginds helper.ServicePool?
---@field closing boolean
local Gateway = class()

Gateway.commands = {}

function Gateway:ctor()
    self.closing = false
end

---@param params {websockets: integer[], loginds: integer[]}
function Gateway:init(params)
    self.websockets = pool:new(params.websockets)
    self.loginds = pool:new(params.loginds)
    self.listen_id = assert(socket.listen(config.host, config.port))
    socket.start(self.listen_id, function(fd, addr)
        self:accept(fd, addr)
    end)
    log.info("gateway", "init", "host=%s port=%d", config.host, config.port)
end

---@param fd integer
---@param addr string
function Gateway:accept(fd, addr)
    if self.closing then
        socket.close_fd(fd)
        return
    end
    local code = rpc.send(self.websockets:next(), "accept", fd, addr, self.loginds:next())
    if code ~= error_code.succ then
        socket.close_fd(fd)
    end
end

function Gateway:close()
    self.closing = true
    if self.listen_id then
        socket.close(self.listen_id)
        self.listen_id = nil
    end
end

return Gateway
