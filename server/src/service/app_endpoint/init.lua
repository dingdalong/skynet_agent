local class = require("class")
local cluster = require("skynet.cluster")
local skynet = require("skynet")
local config = require("etc.cfg")
local crypt = require("skynet.crypt")
local Pool = require("helper.service_pool")
local Protocol = require("network.protocol")
local rpc = require("rpc")
local codes = require("enum.error_code")
---@class app_endpoint.Service
---@field app string
---@field generation string
---@field workers helper.ServicePool
---@field codec network.Protocol
---@field queue table<integer, table>
---@field first integer
---@field last integer
---@field draining boolean
---@field drained boolean
local Endpoint = class()

Endpoint.commands = {
    hello = "hello", request = "request", disconnect = "disconnect", publish = "publish",
    events = "events", drain = "drain", finish = "finish", announce = "announce",
}

function Endpoint:ctor()
    self.app = nil
    self.generation = nil
    self.workers = nil
    self.codec = Protocol:new()
    self.queue = {}
    self.first = 1
    self.last = 0
    self.draining = false
    self.drained = false
end

function Endpoint:init(params)
    self.app = params.app
    self.generation = crypt.hexencode(crypt.randomkey() .. crypt.randomkey())
    self.workers = Pool:new(params.workers)
    self.codec:init(self.app)
    self.codec:validate()
    cluster.register("application")
end

function Endpoint:announce(context, port)
    assert(context.source == skynet.localname(".main"))
    local center = cluster.proxy("center", "@center")
    skynet.fork(function()
        while not self.draining do
            rpc.call(center, "register", self.app, config.application.key, port, self.generation)
            skynet.sleep(100)
        end
    end)
end

function Endpoint:hello()
    return self.app, self.generation, #self.workers.addresses, self.first - 1
end

function Endpoint:request(_, generation, identity, connection, body, draining)
    assert(generation == self.generation, "应用代次已失效")
    local name, args = self.codec:decode_body(body, "Req")
    local code, result = rpc.call_no_timeout(self.workers:select(identity.username), "handle_request",
        identity, connection, name, args, self.draining or draining)
    assert(code == codes.succ and type(result) == "table", "应用请求处理失败")
    return self.codec:encode_body(name:gsub("Req$", "Res"), result)
end

function Endpoint:disconnect(_, generation, identity, connection)
    if generation == self.generation then
        rpc.send(self.workers:select(identity.username), "disconnect", identity, connection)
    end
end

function Endpoint:publish(context, username, name, args, connection)
    assert(context.source == self.workers:select(username) and name:sub(-3) == "Ntf", "应用通知来源无效")
    assert(self.last - self.first < 8192, "应用通知队列已满")
    local payload = self.codec:encode_body(name, args)
    self.last = self.last + 1
    self.queue[self.last] = { username = username, connection = connection, body = payload }
end

function Endpoint:events(_, generation, acknowledged)
    assert(generation == self.generation and acknowledged <= self.last, "应用通知游标已失效")
    while self.first <= acknowledged do
        self.queue[self.first] = nil
        self.first = self.first + 1
    end
    local events = {}
    for position = self.first, math.min(self.last, self.first + 31) do
        events[#events + 1] = self.queue[position]
    end
    return self.first, events
end

function Endpoint:drain(_, generation)
    assert(generation == self.generation, "应用代次已失效")
    self.draining = true
    for _, address in ipairs(self.workers.addresses) do
        local code, done = rpc.call_no_timeout(address, "drain")
        assert(code == codes.succ and done, "应用排空失败")
    end
    self.drained = true
    return self.last
end

function Endpoint:finish(_, generation)
    assert(self.drained and generation == self.generation, "应用尚未完成排空")
    return rpc.send(".main", "shutdown") == codes.succ
end

return Endpoint
