local Conversation = require("agent.conversation")
local class = require("class")
local codes = require("enum.error_code")
local status = require("enum.message_status")
local skynet = require("skynet")
local Request = require("llm.request")
local crypt = require("skynet.crypt")
local log = require("log")
local config = require("etc.cfg").agent

---@class user.Message
---@field id string
---@field role integer
---@field content string
---@field created_at integer
---@field status integer
---@field run_id string?
---@field error table?
---@field ret integer?

---@class user.Session
---@field id string
---@field title string
---@field updated_at integer
---@field revision integer
---@field messages user.Message[]
---@field conversation agent.Conversation
---@field request user.Request?

---@class user.Request: llm.Request
---@field id string
---@field session_id string
---@field assistant user.Message

---@class user.User
---@field new fun(self: user.User, username: string, owner: client.Service): user.User
---@field id string
---@field username string
---@field owner client.Service
---@field sessions table<string, user.Session>
---@field session_order string[]
local User = class()

local function make_id(prefix)
    return string.format("%s-%s-%s", prefix, crypt.hexencode(crypt.randomkey()), tostring(skynet.genid()))
end

local function now_ms()
    return os.time() * 1000
end

local function failure(code, message, retryable)
    log.info("user", "request", "拒绝请求 code=%d reason=%s", code, message)
    return { ret = code, error = { message = message, retryable = retryable or false } }
end

local function session_title(text)
    local normalized = text:gsub("%s+", " "):match("^%s*(.-)%s*$")
    local length = utf8.len(normalized)
    if length and length > config.session_title_length then
        return normalized:sub(1, utf8.offset(normalized, config.session_title_length + 1) - 1) .. "…"
    end
    return normalized
end

---@param username string
---@param owner client.Service
function User:ctor(username, owner)
    self.id = make_id("user")
    self.username = username
    self.owner = owner
    self.sessions = {}
    self.session_order = {}
end

---@param session user.Session
---@return table
function User:session_snapshot(session)
    return {
        id = session.id,
        title = session.title,
        updated_at = session.updated_at,
        revision = session.revision,
        messages = table.deep_copy(session.messages),
        run_id = session.request and session.request.id or "",
        cancelling = session.request and session.request.cancelled or false,
    }
end

---@return table
function User:snapshot()
    local sessions = {}
    for _, id in ipairs(self.session_order) do
        sessions[#sessions + 1] = self:session_snapshot(self.sessions[id])
    end
    return { user_id = self.id, username = self.username, sessions = sessions }
end

---@param session user.Session
function User:_publish(session)
    session.revision = session.revision + 1
    self.owner:publish(self, "SessionUpdatedNtf", { session = self:session_snapshot(session) })
end

---@return table
function User:SessionCreateReq()
    if type(config.llm.api_key) ~= "string" or config.llm.api_key == "" then
        return failure(codes.call_fail, "模型配置未加载", true)
    end
    local ok, conversation = pcall(Conversation.new, Conversation, config.llm, config.system_prompt)
    if not ok then
        skynet.error("[user] SessionCreateReq 创建对话失败: " .. tostring(conversation))
        return failure(codes.call_fail, "创建对话失败", true)
    end
    local session = {
        id = make_id("session"), title = "新的会话", updated_at = now_ms(),
        revision = 0, messages = {}, conversation = conversation,
    }
    self.sessions[session.id] = session
    table.insert(self.session_order, 1, session.id)
    self:_publish(session)
    return { ret = codes.succ, session = self:session_snapshot(session) }
end

---@return table
function User:UserSnapshotReq()
    return { ret = codes.succ, snapshot = self:snapshot() }
end

---@param args table
---@return table
function User:MessageSendReq(args)
    local session = self.sessions[args.session_id]
    local text = args.text
    if not session then return failure(codes.fail, "会话不存在或已经失效") end
    if session.request then return failure(codes.server_busy, "该会话仍在生成", true) end
    local retry_id = args.retry_run_id or ""
    local previous = session.messages[#session.messages]
    if retry_id ~= "" then
        if not previous or previous.run_id ~= retry_id or previous.status ~= status.failed
            or not previous.error or not previous.error.retryable then
            return failure(codes.invalid_param, "该消息已不能重试")
        end
        text = session.messages[#session.messages - 1].content
    end
    if type(text) ~= "string" or text == "" or #text > config.max_message_length or not utf8.len(text) then
        return failure(codes.invalid_param, "消息格式无效或内容过长")
    end
    local request = Request:new()
    ---@cast request user.Request
    request.id = make_id("run")
    request.session_id = session.id
    if retry_id == "" then
        session.messages[#session.messages + 1] = {
            id = make_id("message"), role = 1, content = text, created_at = now_ms(), status = status.completed,
        }
        request.assistant = { id = make_id("message"), role = 2, created_at = now_ms() }
        session.messages[#session.messages + 1] = request.assistant
    else
        request.assistant = previous
    end
    request.assistant.content = ""
    request.assistant.status = status.streaming
    request.assistant.run_id = request.id
    request.assistant.error = nil
    request.assistant.ret = nil
    session.title = session_title(text)
    session.updated_at = now_ms()
    session.request = request
    self.owner.pending_requests[request] = true
    self:_publish(session)
    local response = { ret = codes.succ, session = self:session_snapshot(session) }
    skynet.fork(function() self:_run_request(request, text) end)
    return response
end

---@param request user.Request
---@param delta string
function User:_on_delta(request, delta)
    if request.cancelled then error("用户已取消生成", 0) end
    local session = self.sessions[request.session_id]
    request.assistant.content = request.assistant.content .. delta
    session.revision = session.revision + 1
    self.owner:publish(self, "MessageDeltaNtf", {
        session_id = session.id, run_id = request.id, message_id = request.assistant.id,
        delta = delta, revision = session.revision,
    })
end

---@param request user.Request
---@param text string
function User:_run_request(request, text)
    local session = self.sessions[request.session_id]
    local ok, result, err = xpcall(function()
        return session.conversation:chat(text, function(delta) self:_on_delta(request, delta) end, request)
    end, debug.traceback)
    -- 终态先释放占用，广播后到达的新请求才能立即开始下一轮。
    session.request = nil
    self.owner.pending_requests[request] = nil
    local assistant = request.assistant
    if request.cancelled then
        assistant.status = status.cancelled
    elseif not ok or not result then
        skynet.error("[user] _run_request user=" .. self.id .. " run=" .. request.id .. " error="
            .. tostring(ok and err or result))
        assistant.status = status.failed
        assistant.ret = codes.call_fail
        assistant.error = { message = "对话请求失败，请稍后重试", retryable = true }
    else
        assistant.status = status.completed
        assistant.content = result
    end
    session.updated_at = now_ms()
    self:_publish(session)
end

---@param args table
---@return table
function User:MessageCancelReq(args)
    local session = self.sessions[args.session_id]
    if not session then return failure(codes.fail, "会话不存在或已经失效") end
    if type(args.run_id) ~= "string" or args.run_id == "" then
        return failure(codes.invalid_param, "生成任务 ID 无效")
    end
    local request = session.request
    if request and request.id == args.run_id and not request.cancelled then
        request.cancelled = true
        self:_publish(session)
        request:cancel()
    end
    return { ret = codes.succ }
end

return User
