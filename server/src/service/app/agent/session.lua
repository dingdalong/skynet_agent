local Agent = require("agent.agent")
local class = require("class")
local codes = require("enum.error_code")
local status = require("agent.message_status")
local skynet = require("skynet")
local Run = require("agent.run")
local models = require("agent.models")
local crypt = require("skynet.crypt")
local log = require("log")
local config = require("etc.cfg").agent

---@class agent.session.Message
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

---@class agent.session.AgentSession
---@field new fun(self: agent.session.AgentSession, owner: agent.Chat, model_id: string): agent.session.AgentSession
---@field owner agent.Chat
---@field id string
---@field title string
---@field updated_at integer
---@field revision integer
---@field messages agent.session.Message[]
---@field agent agent
---@field model_id string
---@field run agent.Run?
---@field pending_runs table<agent.Run, boolean>
---@field execution_target table?
local AgentSession = class()

local function make_id(prefix)
    return string.format("%s-%s-%s", prefix, crypt.hexencode(crypt.randomkey()), tostring(skynet.genid()))
end

local function now_ms()
    return os.time() * 1000
end

local function failure(code, message, retryable)
    log.info("agent.session", "request", "拒绝请求 code=%d reason=%s", code, message)
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

---@param owner agent.Chat
---@param model_id string
function AgentSession:ctor(owner, model_id, target, existing_id)
    self.owner = owner
    self.id = existing_id or make_id("session")
    self.sequence = 0
    self.restored = existing_id ~= nil
    self.write_lock = require("skynet.queue")()
    self.recovery_notice = nil
    self.read_only = false
    self.saved_context = {}
    self.background_tools = {}
    self.storage_failed = false
    self.title = "新的会话"
    self.updated_at = now_ms()
    self.revision = 0
    self.messages = {}
    self.model_id = model_id
    self.run = nil
    self.pending_runs = owner.pending_runs
    self.agent = nil
    self.execution_target = target
    if not existing_id then self:open_agent() end
end

function AgentSession:open_agent()
    local target, owner, model_id = self.execution_target, self.owner, self.model_id
    local directories = require("agent.workspace")
    local workspace = target and target.directory or (self.restored and directories.existing or directories.create)(
        config.tools.workspace_root, owner.app.identity.username, self.id)
    self.agent = Agent:new(models.resolve(config, model_id), owner.prompt_templates, {
        execution_target = target,
        workspace = workspace,
        tools = config.tools,
        tool_registry = owner.app.tool_registry,
        project_instructions_max_bytes = config.project_instructions_max_bytes,
        permission_llm = models.resolve(config, config.permission.model_id or model_id),
        permission = config.permission,
        owner = self,
        session_id = self.id,
    })
    self.agent.project_instructions = self.saved_project
    for _, item in ipairs(self.saved_context) do self.agent.messages[#self.agent.messages + 1] = item end
end

function AgentSession:record(kind, data)
    if type(data.tool) == "table" then
        -- 执行器仍会更新同一条工具记录，先冻结本次已完成的部分。
        local tool = table.copy(data.tool)
        tool.reasoning = {}
        for _, block in ipairs(data.tool.reasoning or {}) do
            if block.status == "completed" then table.insert(tool.reasoning, table.copy(block)) end
        end
        data.tool = tool
        if kind == "result" and tool.status == "running" then self.background_tools[tool.id] = true end
    end
    return self.write_lock(require("agent.persistence").append, self, kind, data)
end

---@param text any
---@return boolean
function AgentSession.valid_text(text)
    return type(text) == "string" and text ~= "" and #text <= config.max_message_length and utf8.len(text) ~= nil
end

---@return table
function AgentSession:snapshot(start, finish)
    finish = finish or #self.messages
    start = start or math.max(0, finish - 2)
    local messages = {}
    for i = start + 1, finish do messages[#messages + 1] = table.deep_copy(self.messages[i]) end
    local notice = self.recovery_notice
    if not notice and not pcall(models.resolve, config, self.model_id) then
        notice = "原模型不可用，请重新选择"
    end
    if not notice and self.needs_workspace then notice = "原工作目录不可用，请重新选择工作目录" end
    return {
        needs_workspace = self.needs_workspace,
        session = {
            id = self.id,
            title = self.title,
            updated_at = self.updated_at,
            revision = self.revision,
            message_start = start,
            messages = messages,
            run_id = self.run and self.run.id or "",
            cancelling = self.run and self.run.cancelled or false,
        },
        recovery_notice = notice,
        read_only = self.read_only or self.storage_failed,
        execution_target = self.execution_target,
        model_id = self.model_id,
        permission_model_id = config.permission.model_id or self.model_id,
    }
end

-- A large individual message occupies a page of its own.
function AgentSession:history(before)
    local finish = before == 0 and #self.messages or before
    if finish > #self.messages then
        return failure(codes.invalid_param, "历史位置已变化，请重新打开会话")
    end
    local start, bytes = finish, 0
    local protobuf = require("helper.protobuf")
    protobuf.attach()
    while start > 0 and finish - start < 20 do
        local size = #protobuf.encode("skynet.agent.v1.ChatMessage", self.messages[start]) + 6
        if start < finish and bytes + size > 128 * 1024 then break end
        bytes, start = bytes + size, start - 1
    end
    return { ret = codes.succ, chat_session = self:snapshot(start, finish) }
end

function AgentSession:_publish()
    self.revision = self.revision + 1
    self.owner:publish("AgentSessionUpdatedNtf", { chat_session = self:snapshot() })
end

---@param model_id string
---@return table
function AgentSession:set_model(model_id)
    local ok, main, permission = pcall(function()
        return models.resolve(config, model_id), models.resolve(config, config.permission.model_id or model_id)
    end)
    if not ok then return failure(codes.invalid_param, "模型不在可选清单中") end
    if self.read_only or self.storage_failed then return failure(codes.fail, "会话仅可阅读") end
    self:record("model", { model_id = model_id })
    if self.agent then self.agent:set_llm(main, permission) end
    self.model_id = model_id
    self:_publish()
    return { ret = codes.succ, chat_session = self:snapshot() }
end

function AgentSession:_on_reasoning(run, block, delta, tool_id)
    self.revision = self.revision + 1
    local update = table.copy(block)
    update.text = delta
    self.owner:publish("AgentReasoningDeltaNtf", {
        session_id = self.id,
        message_id = run.message_id,
        tool_call_id = tool_id or "",
        block = update,
        revision = self.revision
    })
end

---@param args table
---@return table
function AgentSession:send_message(args, connection)
    if self.read_only or self.storage_failed then return failure(codes.fail, "历史不完整，请另开会话") end
    if self.needs_workspace or not self.agent and not pcall(self.open_agent, self) then
        return failure(codes.fail, "请重新选择可用的模型或工作目录")
    end
    local text = args.text
    if self.run then return failure(codes.server_busy, "该会话仍在生成", true) end
    if self.execution_target then
        local ok, err = pcall(self.owner.app.execution.available, self.owner.app.execution,
            self.execution_target, connection and connection.device_id)
        if not ok then return failure(codes.fail, tostring(err), true) end
    end
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
    run.source_device = connection and connection.device_id or ""
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
    local saved = pcall(self.record, self, "ask", {
        run = run.id,
        message = run.message_id,
        text = text,
        user_message = self.messages[#self.messages - 1].id,
        time = self.updated_at,
        model_id = self.model_id,
        target = self.execution_target,
        title = self.title,
        retry = run.retry
    })
    if not saved then
        self.run = nil
        self.pending_runs[run] = nil
        return failure(codes.call_fail, "提问未确认，请重新同步会话", true)
    end
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
    self.owner:publish("AgentMessageDeltaNtf", {
        session_id = self.id,
        run_id = run.id,
        message_id = run.assistant.id,
        delta = delta,
        revision = self.revision,
    })
end

---@param message_id string
---@param record table
function AgentSession:_on_tool_update(message_id, record)
    if self.background_tools[record.id] and record.status ~= "running" then
        self.background_tools[record.id] = nil
        self:record("tool_end", { run = record.run_id, id = record.id, tool = record })
    end
    self.revision = self.revision + 1
    self.owner:publish("AgentToolUpdatedNtf", {
        session_id = self.id,
        message_id = message_id,
        tool = table.deep_copy(record),
        revision = self.revision
    })
end

---@param run agent.Run
---@param text string
function AgentSession:_run_request(run, text)
    local ok, result = xpcall(function()
        return self.agent:chat(text, function(delta) self:_on_delta(run, delta) end, run)
    end, debug.traceback)
    -- 终态先释放占用，广播后到达的新请求才能立即开始下一轮。
    local assistant = run.assistant
    if run.cancelled then
        assistant.status = status.cancelled
    elseif not ok or not result then
        log.info("agent.session", "run", "session=%s run=%s 请求失败", self.id, run.id)
        assistant.status = status.failed
        assistant.ret = codes.call_fail
        assistant.error = { message = "对话请求失败，请稍后重试", retryable = true }
    else
        assistant.status = status.completed
        assistant.content = result
    end
    self.updated_at = now_ms()
    local saved = pcall(self.record, self, "finish", {
        status = assistant.status,
        run = run.id,
        time = self.updated_at,
        content = assistant.status == status.completed and assistant.content or nil,
        error = assistant.error
    })
    self.run = nil
    self.pending_runs[run] = nil
    if not saved then
        assistant.status = status.failed
        assistant.error = { message = "保存结果未确认，请重新同步", retryable = false }
    end
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

function AgentSession:stop_remote()
    if self.run and self.run.source_device ~= self.execution_target.device_id then self.run:cancel() end
    local tools = self.agent and self.agent.tools
    if tools then tools:stop_remote(self.execution_target.device_id) end
end

function AgentSession:set_execution(target, connection)
    assert(not self.run, "请先停止当前任务再切换执行目标")
    assert(not self.read_only and not self.storage_failed, "会话仅可阅读")
    local tools = self.agent and self.agent.tools
    assert(not tools or not tools:has_active(), "请先停止后台进程")
    target = self.owner.app.execution:validate_target(target, connection)
    local workspace = target and target.directory or require("agent.workspace").create(
        config.tools.workspace_root, self.owner.app.identity.username, self.id)
    if not pcall(self.record, self, "target", { target = target, workspace = workspace }) then
        return failure(codes.call_fail, "工作目录保存未确认，请重新同步", true)
    end
    self.needs_workspace = false
    if not self.agent then
        self.execution_target = target
        table.insert(self.saved_context, {
            role = "developer",
            source = "environment",
            content = "执行环境已切换到 " .. workspace
        })
        self:_publish()
        return { ret = codes.succ, chat_session = self:snapshot() }
    end
    self.agent:close()
    self.agent.options.workspace, self.agent.options.execution_target = workspace, target
    self.execution_target = target
    self.agent.turn = nil
    local previous = self.messages[#self.messages]
    if previous and previous.error then previous.error.retryable = false end
    self.agent.messages[#self.agent.messages + 1] = {
        role = "developer",
        source = "environment",
        content = "执行环境已切换，后续工具仅作用于新目标；"
            .. "此前目录文件不会自动同步。工作目录: "
            .. workspace .. "；操作系统: " .. (target and target.platform or require("agent.sandbox").platform())
    }
    self:_publish()
    return { ret = codes.succ, chat_session = self:snapshot() }
end

function AgentSession:close()
    if not self.agent then return end
    self.agent:close()
end

return AgentSession
