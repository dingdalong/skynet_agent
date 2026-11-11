local class = require("class")
local skynet = require("skynet")
local websocket = require("http.websocket")
local crypt = require("skynet.crypt")
local Protocol = require("network.protocol")
local support = require("integration.support")

---@class integration.AgentSocket
---@field new fun(self: integration.AgentSocket, url: string): integration.AgentSocket
---@field url string
---@field id? integer
---@field protocol network.Protocol
---@field events table[]
---@field closed boolean
---@field close_code? integer
---@field failure? string
---@field next_message_id? integer
local AgentSocket = class()

function AgentSocket:ctor(url)
    self.url = url
    self.id = nil
    self.protocol = Protocol:new()
    self.protocol:init()
    self.events = {}
    self.closed = false
    self.close_code = nil
    self.failure = nil
    self.next_message_id = 1
end

function AgentSocket:_read()
    local ok, failure = xpcall(function()
        while not self.closed do
            local data, close_payload = websocket.read(self.id)
            if data == false then
                self.close_code = #close_payload >= 2 and string.unpack(">I2", close_payload) or 1005
                self.closed = true
                return
            end
            local message_id, name, payload = self.protocol:decode_msg(data)
            self.events[#self.events + 1] = { name = name, message_id = message_id, payload = payload }
        end
    end, debug.traceback)
    if not ok and not self.closed then
        self.failure = tostring(failure)
        self.close_code = 1006
        self.closed = true
        if not websocket.is_close(self.id) then websocket.close(self.id) end
    end
end

function AgentSocket:connect()
    self.id = websocket.connect(self.url, nil, 500)
    skynet.fork(function() self:_read() end)
    return self
end

function AgentSocket:allocate_message_id()
    local id = assert(self.next_message_id, "Agent 消息 ID 已耗尽")
    self.next_message_id = id < 0xffffffff and id + 1 or nil
    return id
end

function AgentSocket:send_frame(data, format)
    assert(self.id and not self.closed, "Agent WebSocket 尚未连接或已经关闭")
    local mask = string.unpack(">I4", crypt.randomkey())
    websocket.write(self.id, data, format or "binary", mask)
end

function AgentSocket:send_request(id, name, args)
    self:send_frame(self.protocol:encode_msg(id, name, args or {}))
end

function AgentSocket:wait_for(predicate, timeout_ticks)
    return support.until_true(function()
        for index, event in ipairs(self.events) do
            if predicate(event) then return table.remove(self.events, index) end
        end
        assert(not self.closed, self.failure or "等待 Agent 响应时连接已经关闭")
    end, "等待 Agent 响应超时，未消费事件数=" .. #self.events, timeout_ticks or 500)
end

function AgentSocket:wait_for_close(timeout_ticks)
    support.until_true(function() return self.closed end, "等待 Agent WebSocket 关闭超时", timeout_ticks or 500)
    return self.close_code
end

function AgentSocket:close()
    if self.closed then return end
    self.closed = true
    self.close_code = 1000
    if self.id then websocket.close(self.id, 1000) end
end

function AgentSocket:request(name, args)
    local id = self:allocate_message_id()
    self:send_request(id, name, args)
    local response = name:gsub("Req$", "Res")
    return self:wait_for(function(event) return event.message_id == id and event.name == response end).payload
end

function AgentSocket:wait_run(run_id, timeout_ticks)
    return self:wait_for(function(event)
        if event.name ~= "SessionUpdatedNtf" then return false end
        local session = event.payload.chat_session.session
        return session.run_id == "" and session.messages[#session.messages].run_id == run_id
    end, timeout_ticks).payload.chat_session.session
end

function AgentSocket:send_message(session_id, text, timeout_ticks)
    local result = self:request("ChatReq", { session_id = session_id, text = text })
    support.equal(result.ret, 1, "发送消息失败")
    return self:wait_run(result.chat_session.session.run_id, timeout_ticks)
end

local M = { AgentSocket = AgentSocket }

function M.login(url, username)
    username = username or "probe-" .. crypt.hexencode(crypt.randomkey())
    local client = AgentSocket:new(url):connect()
    local ok, result = pcall(client.request, client, "LoginReq", { username = username })
    if not ok or result.ret ~= 1 then
        client:close()
        error(ok and "登录失败 ret=" .. tostring(result.ret) or result, 2)
    end
    return client, result.snapshot, username
end

return M
