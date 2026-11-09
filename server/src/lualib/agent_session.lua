local Agent = require("agent.agent")
local class = require("class")
local codes = require("enum.error_code")
local status = require("enum.message_status")
local skynet = require("skynet")
local Run = require("agent.run")
local models = require("agent.models")
local crypt = require("skynet.crypt")
local log = require("log")
local config = require("etc.cfg").agent

---@class agent_session.Message
---@field id string
---@field role integer
---@field content string
---@field created_at integer
---@field status integer
---@field run_id string?
---@field error table?
---@field ret integer?
---@field tool_calls agent.ToolCall[]?
---@field reasoning llm.ReasoningBlock[]?

---@class agent_session.AgentSession
---@field new fun(self: agent_session.AgentSession, owner: user.Chat, model_id: string): agent_session.AgentSession
---@field owner user.Chat
---@field id string
---@field title string
---@field updated_at integer
---@field revision integer
---@field messages agent_session.Message[]
---@field agent agent
---@field model_id string
---@field run agent.Run?
---@field pending_runs table<agent.Run, boolean>
local AgentSession = class()

local function make_id(prefix)
    return string.format("%s-%s-%s", prefix, crypt.hexencode(crypt.randomkey()), tostring(skynet.genid()))
end

local function now_ms()
    return os.time() * 1000
end

local function failure(code, message, retryable)
    log.info("agent_session", "request", "拒绝请求 code=%d reason=%s", code, message)
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

---@param owner user.Chat
---@param model_id string
function AgentSession:ctor(owner, model_id)
    self.owner = owner
    self.id = make_id("session")
    self.title = "新的会话"
    self.updated_at = now_ms()
    self.revision = 0
    self.messages = {}
    self.model_id = model_id
    self.run = nil
    self.pending_runs = owner.pending_runs
    self.agent = nil
    local workspace = require("agent.workspace").create(config.tools.workspace_root, owner.user.username, self.id)
    self.agent = Agent:new(models.resolve(config, model_id), owner.prompt_templates, {
        workspace = workspace, tools = config.tools,
        project_instructions_max_bytes = config.project_instructions_max_bytes,
        permission_llm = models.resolve(config, config.permission.model_id or model_id),
        permission = config.permission, owner = self, session_id = self.id,
    })
end

---@param text any
---@return boolean
function AgentSession.valid_text(text)
    return type(text) == "string" and text ~= "" and #text <= config.max_message_length and utf8.len(text) ~= nil
end

---@return table
function AgentSession:snapshot()
    return {
        session = {
            id = self.id, title = self.title, updated_at = self.updated_at, revision = self.revision,
            messages = table.deep_copy(self.messages), run_id = self.run and self.run.id or "",
            cancelling = self.run and self.run.cancelled or false,
        },
        model_id = self.model_id,
        permission_model_id = config.permission.model_id or self.model_id,
    }
end

function AgentSession:_publish()
    self.revision = self.revision + 1
    self.owner:publish("SessionUpdatedNtf", { chat_session = self:snapshot() })
end

---@param model_id string
---@return table
function AgentSession:set_model(model_id)
    local ok, main, permission = pcall(function()
        return models.resolve(config, model_id), models.resolve(config, config.permission.model_id or model_id)
    end)
    if not ok then return failure(codes.invalid_param, "模型不在可选清单中") end
    self.agent:set_llm(main, permission)
    self.model_id = model_id
    self:_publish()
    return { ret = codes.succ, chat_session = self:snapshot() }
end

function AgentSession:_on_reasoning(run, block, delta, tool_id)
    self.revision = self.revision + 1
    local update = table.copy(block)
    update.text = delta
    self.owner:publish("ReasoningDeltaNtf", { session_id = self.id,
        message_id = run.message_id, tool_call_id = tool_id or "", block = update, revision = self.revision })
end

---@param args table
---@return table
function AgentSession:send_message(args)
    local text = args.text
    if self.run then return failure(codes.server_busy, "该会话仍在生成", true) end
    local retry_id = args.retry_run_id or ""
    local previous = self.messages[#self.messages]
    if retry_id ~= "" then
        if not previous or previous.run_id ~= retry_id or previous.status ~= status.failed
            or not previous.error or not previous.error.retryable then
            return failure(codes.invalid_param, "该消息已不能重试")
        end
        text = self.messages[#self.messages - 1].content
    end
    if not self.valid_text(text) then
        return failure(codes.invalid_param, "消息格式无效或内容过长")
    end
    local run = Run:new()
    ---@cast run agent.Run
    run.id = make_id("run")
    run.owner = self
    run.session_id = self.id
    run.retry = retry_id ~= ""
    if retry_id == "" then
        self.messages[#self.messages + 1] = {
            id = make_id("message"), role = 1, content = text, created_at = now_ms(), status = status.completed,
        }
        run.assistant = { id = make_id("message"), role = 2, created_at = now_ms(), reasoning = {} }
        self.messages[#self.messages + 1] = run.assistant
    else
        run.assistant = previous
    end
    run.message_id = run.assistant.id
    run.assistant.content = ""
    run.assistant.status = status.streaming
    run.assistant.run_id = run.id
    run.assistant.error = nil
    run.assistant.ret = nil
    self.title = session_title(text)
    self.updated_at = now_ms()
    self.run = run
    self.pending_runs[run] = true
    self:_publish()
    local response = { ret = codes.succ, chat_session = self:snapshot() }
    skynet.fork(function() self:_run_request(run, text) end)
    return response
end

---@param run agent.Run
---@param delta string
function AgentSession:_on_delta(run, delta)
    if run.cancelled then error("用户已取消生成", 0) end
    run.assistant.content = run.assistant.content .. delta
    self.revision = self.revision + 1
    self.owner:publish("MessageDeltaNtf", {
        session_id = self.id, run_id = run.id, message_id = run.assistant.id,
        delta = delta, revision = self.revision,
    })
end

---@param message_id string
---@param record table
function AgentSession:_on_tool_update(message_id, record)
    self.revision = self.revision + 1
    self.owner:publish("ToolUpdatedNtf", { session_id = self.id, message_id = message_id,
        tool = table.deep_copy(record), revision = self.revision })
end

---@param run agent.Run
---@param text string
function AgentSession:_run_request(run, text)
    local ok, result, err = xpcall(function()
        return self.agent:chat(text, function(delta) self:_on_delta(run, delta) end, run)
    end, debug.traceback)
    -- 终态先释放占用，广播后到达的新请求才能立即开始下一轮。
    self.run = nil
    self.pending_runs[run] = nil
    local assistant = run.assistant
    if run.cancelled then
        assistant.status = status.cancelled
    elseif not ok or not result then
        skynet.error("[agent_session] _run_request session=" .. self.id .. " run=" .. run.id .. " error="
            .. tostring(ok and err or result))
        assistant.status = status.failed
        assistant.ret = codes.call_fail
        assistant.error = { message = "对话请求失败，请稍后重试", retryable = true }
    else
        assistant.status = status.completed
        assistant.content = result
    end
    self.updated_at = now_ms()
    self:_publish()
end

---@param args table
---@return table
function AgentSession:cancel_run(args)
    if type(args.run_id) ~= "string" or args.run_id == "" then
        return failure(codes.invalid_param, "生成任务 ID 无效")
    end
    local run = self.run
    if run and run.id == args.run_id and not run.cancelled then
        run.cancelled = true
        self:_publish()
        run:cancel()
    end
    return { ret = codes.succ }
end

function AgentSession:close()
    self.agent:close()
end

return AgentSession
