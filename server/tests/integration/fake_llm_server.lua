local class = require("class")
local skynet = require("skynet")
local socket = require("skynet.socket")
local sockethelper = require("http.sockethelper")
local httpd = require("http.httpd")
local cjson = require("cjson")

---@class integration.FakeModel
---@field new fun(self: integration.FakeModel, port: integer): integration.FakeModel
---@field port integer
---@field listener? integer
---@field request_count integer
---@field active_requests integer
---@field cancelled_requests integer
local FakeModel = class()

---@param port integer
function FakeModel:ctor(port)
    self.port = port
    self.listener = nil
    self.request_count = 0
    self.active_requests = 0
    self.cancelled_requests = 0
end

local function json_response(id, status, value)
    assert(httpd.write_response(sockethelper.writefunc(id), status, cjson.encode(value), {
        ["content-type"] = "application/json; charset=utf-8",
        connection = "close",
    }))
end

local function text(message)
    if type(message.content) == "string" then return message.content end
    local parts = {}
    for _, part in ipairs(type(message.content) == "table" and message.content or {}) do
        parts[#parts + 1] = part.text or ""
    end
    return table.concat(parts)
end

local function last_input(input)
    for index = #input, 1, -1 do
        if input[index].role == "user" then return text(input[index]) end
    end
    return ""
end

local function has_history(input)
    local system, user, assistant = false, false, false
    for _, message in ipairs(input) do
        system = system or message.role == "system"
        user = user or message.role == "user" and text(message) == "[e2e:history-set]"
        assistant = assistant or message.role == "assistant" and text(message) == "E2E 历史已保存"
    end
    return system and user and assistant
end

local function event(request, value)
    local data = "data: " .. cjson.encode(value) .. "\n\n"
    assert(socket.write(request.id, string.format("%x\r\n%s\r\n", #data, data)))
end

local function delta(request, value)
    event(request, { type = "response.output_text.delta", delta = value })
end

local function complete(request, model)
    event(request, {
        type = "response.completed",
        response = {
            id = "response-e2e",
            status = "completed",
            model = model,
            usage = { input_tokens = 2048, input_tokens_details = { cached_tokens = 1024 }, output_tokens = 20 },
            output = cjson.empty_array,
        },
    })
    assert(socket.write(request.id, "0\r\n\r\n"))
    request.completed = true
end

function FakeModel:_finish(request)
    if request.finished or not request.counted then return end
    request.finished = true
    self.active_requests = self.active_requests - 1
    if not request.completed then self.cancelled_requests = self.cancelled_requests + 1 end
end

function FakeModel:_stream(request, payload)
    local prompt = last_input(payload.input)
    print(string.format("[fake-llm] request=%d prompt=%s", self.request_count, prompt))
    io.stdout:flush()
    if prompt == "[e2e:header-stall]" then return false end
    assert(httpd.write_response(sockethelper.writefunc(request.id), 200, nil, {
        ["content-type"] = "text/event-stream",
        ["cache-control"] = "no-cache",
        ["transfer-encoding"] = "chunked",
        connection = "close",
    }))
    if prompt == "[e2e:error]" then
        event(request, { type = "response.failed", response = {
            status = "failed", error = { message = "E2E 假模型失败" },
        } })
        assert(socket.write(request.id, "0\r\n\r\n"))
        request.completed = true
        return true
    end
    if prompt == "[e2e:stall]" then
        delta(request, "E2E 等待")
        return false
    end
    if prompt == "[e2e:slow]" then
        delta(request, "E2E ")
        skynet.sleep(50)
        delta(request, "慢速完成")
        skynet.sleep(20)
    else
        local answer = "E2E 成功"
        if prompt == "[e2e:history-set]" then
            answer = "E2E 历史已保存"
        elseif prompt == "[e2e:history-check]" then
            answer = has_history(payload.input) and "E2E 历史通过" or "E2E 历史缺失"
        end
        delta(request, answer:sub(1, 4))
        skynet.sleep(2)
        delta(request, answer:sub(5))
        skynet.sleep(2)
    end
    complete(request, payload.model)
    return true
end

function FakeModel:_handle(request)
    local id = request.id
    local status, url, method, headers, body =
        httpd.read_request(sockethelper.readfunc(id), 1024 * 1024)
    if status ~= 200 then
        if status then json_response(id, status, { error = "无效 HTTP 请求" }) end
        return
    end
    if method == "GET" and url == "/health" then
        json_response(id, 200, {
            status = "ok", requests = self.request_count,
            active_requests = self.active_requests, cancelled_requests = self.cancelled_requests,
        })
        return
    end
    if method ~= "POST" or url ~= "/responses" then
        json_response(id, 404, { error = "not found" })
        return
    end
    if not headers.authorization then
        json_response(id, 401, { error = { message = "缺少 Authorization" } })
        return
    end
    local ok, payload = pcall(cjson.decode, body)
    if not ok or type(payload) ~= "table" or payload.stream ~= true or type(payload.input) ~= "table" then
        json_response(id, 400, { error = { message = "仅支持 Responses 流式请求" } })
        return
    end
    self.request_count = self.request_count + 1
    self.active_requests = self.active_requests + 1
    request.counted = true
    if not self:_stream(request, payload) then
        -- 持有停顿中的请求，直到服务端取消或超时；EOF 由同一结算入口处理。
        while socket.read(id) do end
    end
end

function FakeModel:_accept(id)
    local request = { id = id, counted = false, completed = false, finished = false, peer_closed = false }
    socket.start(id)
    socket.onclose(id, function()
        request.peer_closed = true
        self:_finish(request)
    end)
    local ok, failure = xpcall(function() self:_handle(request) end, debug.traceback)
    if not ok and not request.peer_closed then
        io.stderr:write("[fake-llm] request failed: ", tostring(failure), "\n")
    end
    self:_finish(request)
    socket.close(id)
end

function FakeModel:serve()
    self.listener = assert(socket.listen("127.0.0.1", self.port))
    socket.start(self.listener, function(id)
        skynet.fork(function() self:_accept(id) end)
    end)
    print("FAKE_LLM_READY port=" .. self.port)
    io.stdout:flush()
    skynet.wait()
end

local M = { FakeModel = FakeModel }

function M.run(config)
    FakeModel:new(config.model_port):serve()
end

return M
