local Conversation = require("agent.conversation")
local class = require("class")
local error_code = require("enum.error_code")
local message_status = require("enum.message_status")
local skynet = require("skynet")
local request_class = require("llm.request")

local agent_config = require("etc.cfg").agent

local MESSAGE_ROLE_USER = 1
local MESSAGE_ROLE_ASSISTANT = 2

local UINT32_MASK = 0xffffffff

---@class client.ChatMessage
---@field id string
---@field role integer
---@field content string
---@field created_at integer

---@class client.Session
---@field id string
---@field title string
---@field updated_at integer
---@field messages client.ChatMessage[]
---@field conversation agent.Conversation

---@class client.Request: llm.Request
---@field message_id integer
---@field session_id string
---@field cancelled boolean

---@alias client.ResponseWriter fun(message_id: integer, name: string, args: table)

---@class client.Connection
---@field new fun(self: client.Connection, writer: client.ResponseWriter, pending: table?): client.Connection
---@field disconnect fun(self: client.Connection)
---@field response_writer client.ResponseWriter
---@field pending_requests table<client.Request, boolean>
---@field sessions table<string, client.Session>
---@field session_order string[]
---@field active_session_id string?
---@field active_request client.Request?
---@field closed boolean

local ClientConnection = class()

---@param prefix string
---@return string
local function make_id(prefix)
    return string.format("%s-%s", prefix, tostring(skynet.genid()))
end

---@return integer
local function now_ms()
    return os.time() * 1000
end

---@param text string
---@param max_chars integer
---@return string
local function truncate_utf8(text, max_chars)
    local length = utf8.len(text)
    if not length or length <= max_chars then
        return text
    end
    local end_offset = utf8.offset(text, max_chars + 1)
    return text:sub(1, (end_offset or #text + 1) - 1) .. "…"
end

---@param text string
---@param max_chars integer
---@return string
local function session_title(text, max_chars)
    local normalized = text:gsub("%s+", " "):match("^%s*(.-)%s*$")
    if normalized == "" then
        return "新的会话"
    end
    return truncate_utf8(normalized, max_chars)
end

---@param session client.Session
---@return table
local function session_summary(session)
    return {
        id = session.id,
        title = session.title,
        updated_at = session.updated_at,
    }
end

---@param message string
---@param retryable boolean
---@return table
local function error_info(message, retryable)
    return {
        message = message,
        retryable = retryable,
    }
end

---@param value unknown
---@return boolean
local function is_message_id(value)
    return type(value) == "number"
        and value % 1 == 0
        and value >= 1
        and value <= UINT32_MASK
end

---@param response_writer client.ResponseWriter
---@param pending_requests table<client.Request, boolean>?
function ClientConnection:ctor(response_writer, pending_requests)
    assert(type(response_writer) == "function", "ClientConnection response_writer 必须是函数")

    self.response_writer = response_writer
    self.pending_requests = pending_requests or {}
    self.sessions = {}
    self.session_order = {}
    self.active_session_id = nil
    self.active_request = nil
    self.closed = false
end

---@param message_id integer
---@param name string
---@param args table
function ClientConnection:_respond(message_id, name, args)
    if self.closed then
        return
    end
    self.response_writer(message_id, name, args)
end

---@return client.Session|nil
---@return string|nil
function ClientConnection:create_session()
    local current_llm_config = agent_config.llm
    if type(current_llm_config.api_key) ~= "string" or current_llm_config.api_key == "" then
        return nil, "模型配置未加载"
    end

    local ok, conversation = pcall(
        Conversation.new,
        Conversation,
        current_llm_config,
        agent_config.system_prompt
    )
    if not ok then
        return nil, "创建对话失败: " .. tostring(conversation)
    end

    local session = {
        id = make_id("session"),
        title = "新的会话",
        updated_at = now_ms(),
        messages = {},
        conversation = conversation,
    }
    self.sessions[session.id] = session
    table.insert(self.session_order, 1, session.id)
    self.active_session_id = session.id
    return session
end

---@return table|nil
function ClientConnection:snapshot()
    local summaries = {}
    for index, session_id in ipairs(self.session_order) do
        local session = self.sessions[session_id]
        if session then
            summaries[index] = session_summary(session)
        end
    end

    local active_session = self.active_session_id and self.sessions[self.active_session_id]
    if not active_session then
        return nil
    end

    return {
        sessions = summaries,
        active_session_id = active_session.id,
        messages = active_session.messages,
    }
end

---@param message_id integer
---@param args table
function ClientConnection:SessionCreateReq(message_id, args)
    if not is_message_id(message_id) then
        return
    end
    if self.active_request then
        self:_respond(message_id, "SessionCreateRes", {
            ret = error_code.server_busy,
            error = error_info("上一条消息仍在处理", true),
        })
        return
    end

    local session, err = self:create_session()
    if not session then
        skynet.error("[client.connection] 新建会话失败: " .. tostring(err))
        self:_respond(message_id, "SessionCreateRes", {
            ret = error_code.call_fail,
            error = error_info(tostring(err), true),
        })
        return
    end

    self:_respond(message_id, "SessionCreateRes", {
        ret = error_code.succ,
        session = session_summary(session),
        messages = {},
    })
end

---@param message_id integer
---@param args table
function ClientConnection:SessionSelectReq(message_id, args)
    if not is_message_id(message_id) then
        return
    end
    if self.active_request then
        self:_respond(message_id, "SessionSelectRes", {
            ret = error_code.server_busy,
            error = error_info("上一条消息仍在处理", true),
            session_id = tostring(args.session_id or ""),
        })
        return
    end

    local session_id = args.session_id
    local session = type(session_id) == "string" and self.sessions[session_id] or nil
    if not session then
        self:_respond(message_id, "SessionSelectRes", {
            ret = error_code.fail,
            error = error_info("会话不存在或已经失效", false),
            session_id = tostring(session_id or ""),
        })
        return
    end

    self.active_session_id = session.id
    self:_respond(message_id, "SessionSelectRes", {
        ret = error_code.succ,
        session_id = session.id,
        messages = session.messages,
    })
end

---@param message_id integer
---@param args table
function ClientConnection:MessageSendReq(message_id, args)
    local session_id = args.session_id
    local text = args.text
    if
        not is_message_id(message_id)
        or type(session_id) ~= "string"
        or type(text) ~= "string"
        or text == ""
        or #text > agent_config.max_message_length
    then
        self:_respond(message_id, "MessageSendRes", {
            ret = error_code.invalid_param,
            error = error_info("消息格式无效或内容过长", false),
            session_id = tostring(session_id or ""),
        })
        return
    end
    if self.active_request then
        self:_respond(message_id, "MessageSendRes", {
            ret = error_code.server_busy,
            error = error_info("上一条消息仍在处理", true),
            session_id = session_id,
        })
        return
    end

    local session = self.sessions[session_id]
    if not session then
        self:_respond(message_id, "MessageSendRes", {
            ret = error_code.fail,
            error = error_info("会话不存在或已经失效", false),
            session_id = session_id,
        })
        return
    end

    local timestamp = now_ms()
    local user_message = {
        id = make_id("message"),
        role = MESSAGE_ROLE_USER,
        content = text,
        created_at = timestamp,
    }
    session.messages[#session.messages + 1] = user_message
    session.title = session_title(text, agent_config.session_title_length)
    session.updated_at = timestamp

    local request = request_class:new()
    ---@cast request client.Request
    request.message_id = message_id
    request.session_id = session.id
    self.active_request = request
    self.pending_requests[request] = true
    skynet.fork(function()
        self:_run_request(request, text)
    end)
end

---@param message_id integer
---@param args table
function ClientConnection:MessageCancelReq(message_id, args)
    if not is_message_id(message_id) then
        return
    end
    local target_message_id = args.target_message_id
    if not is_message_id(target_message_id) then
        self:_respond(message_id, "MessageCancelRes", {
            ret = error_code.invalid_param,
            error = error_info("目标消息 ID 无效", false),
        })
        return
    end

    local request = self.active_request
    if not request or request.message_id ~= target_message_id or request.cancelled then
        self:_respond(message_id, "MessageCancelRes", { ret = error_code.succ })
        return
    end

    request.cancelled = true
    self:_respond(message_id, "MessageCancelRes", { ret = error_code.succ })
    request:cancel()
end

---@param request client.Request
---@param text string
function ClientConnection:_run_request(request, text)
    local ok, err = xpcall(function()
        self:_generate_reply(request, text)
    end, debug.traceback)
    if self.active_request == request then
        self.active_request = nil
    end
    self.pending_requests[request] = nil
    if not ok then
        skynet.error("[client.connection] 生成协程失败: " .. tostring(err))
    end
end

---@param request client.Request
---@param text string
function ClientConnection:_generate_reply(request, text)
    local session = self.sessions[request.session_id]
    if not session then
        return
    end

    local ok, completed_text, request_error = pcall(
        session.conversation.chat,
        session.conversation,
        text,
        function(delta)
            if request.cancelled then
                error("用户已取消生成", 0)
            end
            self:_respond(request.message_id, "MessageSendRes", {
                ret = error_code.succ,
                status = message_status.streaming,
                session_id = request.session_id,
                delta = delta,
            })
        end,
        request
    )

    -- 先释放占用，再发送终态；客户端收到终态即可安全开始下一轮。
    if self.active_request == request then
        self.active_request = nil
    end
    if request.cancelled then
        session.messages[#session.messages] = nil
        self:_respond(request.message_id, "MessageSendRes", {
            ret = error_code.succ,
            status = message_status.cancelled,
            session_id = request.session_id,
        })
    elseif not ok then
        skynet.error("[client.connection] 模型调用异常: " .. tostring(completed_text))
        session.messages[#session.messages] = nil
        self:_respond(request.message_id, "MessageSendRes", {
            ret = error_code.call_fail,
            error = error_info(
                "对话请求失败，请稍后重试",
                true
            ),
            session_id = request.session_id,
        })
    elseif not completed_text then
        skynet.error("[client.connection] 模型调用失败: " .. tostring(request_error))
        session.messages[#session.messages] = nil
        self:_respond(request.message_id, "MessageSendRes", {
            ret = error_code.call_fail,
            error = error_info(
                "对话请求失败，请稍后重试",
                true
            ),
            session_id = request.session_id,
        })
    else
        local timestamp = now_ms()
        local assistant_message = {
            id = make_id("message"),
            role = MESSAGE_ROLE_ASSISTANT,
            content = completed_text,
            created_at = timestamp,
        }
        session.messages[#session.messages + 1] = assistant_message
        session.updated_at = timestamp
        self:_respond(request.message_id, "MessageSendRes", {
            ret = error_code.succ,
            status = message_status.completed,
            session_id = request.session_id,
            message = assistant_message,
        })
    end

end

function ClientConnection:disconnect()
    self.closed = true
    if self.active_request then
        self.active_request:cancel()
    end
end

return ClientConnection
