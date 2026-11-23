local json = require("cjson").new()
json.decode_array_with_array_mt(true)
local rpc = require("rpc")
local codes = require("enum.error_code")
local log = require("log")
local Session = require("agent.session")
local config = require("etc.cfg").agent
local Store = {}

-- 两次尝试共 1.8 秒，给网关的 3 秒业务请求留出返回错误的时间。
local attempt_ticks = 90

local function database(command, collection, ...)
    local code, result = rpc.call_timeout(attempt_ticks, ".database", command, collection, ...)
    if code ~= codes.succ then
        code, result = rpc.call_timeout(attempt_ticks, ".database", command, collection, ...)
    end
    assert(code == codes.succ, "数据库操作未确认")
    return result
end

function Store.append(session, kind, data)
    assert(not session.read_only and not session.storage_failed, "会话不可写")
    local user = session.owner.app.identity.user_id
    local seq = session.sequence + 1
    local doc = { _id = user .. "/" .. session.id .. "/" .. seq, user_id = user, session_id = session.id,
        seq = seq, schema_version = 1, kind = kind, payload = json.encode(data) }
    session.sequence = seq
    if seq == 1 then doc.session_schema_version = 1 end
    local ok, n = pcall(database, "append_once", "history", doc)
    if not ok or n ~= 1 then
        session.storage_failed = true
        session.recovery_notice = "数据库写入未确认，请重新同步"
        error("数据库写入未确认", 0)
    end
end

local function valid_target(target)
    return type(target) == "table" and type(target.device_id) == "string" and target.device_id ~= ""
        and type(target.workspace_id) == "string" and target.workspace_id ~= ""
        and type(target.directory) == "string" and target.directory:sub(1, 1) == "/" and not target.directory:find("%z")
        and (target.platform == "macos" or target.platform == "linux")
end

local function warn(s, reason, lock)
    if s.recovery_notice ~= "当前版本无法完整读取" then s.recovery_notice = reason end
    if lock then s.read_only = true end
end

local function interrupted()
    return "工具执行中断，结果未知，可能已产生副作用。请先核查当前状态。"
end

local function settle(s, state)
    local missing = false
    for _, tool in ipairs(state.calls) do
        if not state.results[tool.id] then
            missing = true
            tool.status, tool.error = "interrupted", tool.error or interrupted()
            table.insert(s.saved_context, { type = "function_call_output", call_id = tool.id,
                output = json.encode({ error = interrupted() }), source = "tool" })
        end
    end
    if missing then
        table.insert(s.saved_context, { role = "developer", source = "environment",
            content = "工具结果未确认，继续前先核查副作用，避免重复执行。" })
    end
    state.calls, state.results = {}, {}
end

local function close_question(s, state)
    if state.message and not state.has_response and not state.finished then
        table.insert(s.saved_context, { role = "user", content = state.text, source = "user" })
    end
end

local function restore_tool(tool, record)
    assert(record.id == tool.id and record.name == tool.name and record.arguments == tool.arguments)
    require("helper.protobuf").attach()
    local pb = require("pb")
    local public = pb.decode("skynet.agent.v1.ToolCall", pb.encode("skynet.agent.v1.ToolCall", record))
    for k, v in pairs(public) do tool[k] = v end
end

local function apply(s, state, kind, d)
    if kind == "ask" then
        assert(type(d.text) == "string" and type(d.run) == "string" and type(d.message) == "string")
        assert(type(d.user_message) == "string" and type(d.model_id) == "string")
        if not d.retry then close_question(s, state) end
        settle(s, state)
        s.model_id = d.model_id
        assert(not d.target or valid_target(d.target))
        s.execution_target = d.target
        s.updated_at = math.tointeger(d.time) or 0
        s.title = type(d.title) == "string" and d.title or d.text:match("^[^\n]+") or "会话"
        local previous = state.message
        if d.retry then
            assert(previous and previous.id == d.message)
            for i, message in ipairs(s.messages) do
                if message == previous then table.remove(s.messages, i); break end
            end
        else
            table.insert(s.messages, { id = d.user_message, role = 1, status = 2, content = d.text,
                created_at = s.updated_at })
        end
        state.message = { id = d.message, role = 2, status = 4, created_at = s.updated_at, run_id = d.run,
            content = "", tool_calls = {}, reasoning = {},
            error = { message = "服务中断，可发送消息继续" } }
        table.insert(s.messages, state.message)
        if d.retry then
            state.message.tool_calls, state.message.reasoning = previous.tool_calls, previous.reasoning
        else
            state.prefix, state.has_response = "", false
        end
        state.text, state.finished = d.text, false
    elseif kind == "tool_end" then
        local tool = assert(state.seen[d.id])
        assert(tool.run_id == d.run and state.resolved[d.id])
        restore_tool(tool, d.tool)
        tool.error = d.tool.error
    elseif kind == "model" then
        assert(type(d.model_id) == "string")
        s.model_id = d.model_id
    elseif kind == "target" then
        assert(not d.target or valid_target(d.target))
        s.execution_target = d.target
        table.insert(s.saved_context, { role = "developer", source = "environment",
            content = "执行环境已切换到 " .. assert(d.workspace) })
    else
        local msg = assert(state.message)
        assert(d.run == msg.run_id)
        if kind == "response" then
            settle(s, state)
            assert(type(d.items) == "table" and type(d.calls) == "table" and type(d.text) == "string")
            assert(#d.items > 0, "缺少模型上下文")
            local calls, has_question, has_output = {}, state.has_response, false
            assert(not d.project or type(d.project) == "table" and type(d.project.workspace) == "string"
                and (not d.project.text or type(d.project.text) == "string" and type(d.project.path) == "string"))
            for _, item in ipairs(d.items) do
                assert(type(item) == "table" and (type(item.role) == "string" or type(item.type) == "string"))
                if item.role then
                    assert((item.role == "assistant" or item.role == "user" or item.role == "developer")
                        and (type(item.content) == "string" or type(item.content) == "table"))
                end
                if item.role == "user" and item.content == state.text then has_question = true end
                if item.role == "assistant" or item.type == "function_call" then has_output = true end
                if item.role == "assistant" and type(item.content) == "table" then
                    for _, part in ipairs(item.content) do
                        assert(type(part) == "table" and type(part.type) == "string"
                            and (type(part.text) == "string" or type(part.refusal) == "string"))
                    end
                end
                if item.type == "function_call" then
                    assert(type(item.call_id) == "string" and not calls[item.call_id])
                    calls[item.call_id] = item
                end
                table.insert(s.saved_context, item)
            end
            for _, call in ipairs(d.calls) do
                assert(type(call.call_id) == "string" and type(call.name) == "string"
                    and type(call.arguments) == "string" and not state.seen[call.call_id])
                local item = assert(calls[call.call_id])
                assert(item.name == call.name and item.arguments == call.arguments)
                calls[call.call_id] = nil
                local tool = { id = call.call_id, name = call.name, arguments = call.arguments,
                    status = "interrupted", run_id = d.run, error = interrupted() }
                table.insert(msg.tool_calls, tool)
                table.insert(state.calls, tool)
                state.seen[call.call_id] = tool
            end
            assert(not next(calls) and has_question and has_output, "缺少模型上下文")
            s.saved_project = d.project
            state.prefix = state.prefix .. d.text
            msg.content = state.prefix
            state.has_response = true
        elseif kind == "result" then
            local tool = assert(state.seen[d.id])
            assert(tool.run_id == d.run and not state.resolved[d.id] and type(d.result) == "table"
                and (type(d.result.ok) == "boolean" or type(d.result.output) == "string"
                    or type(d.result.exit_code) == "number" or type(d.result.session_id) == "string")
                and (not d.result.error or type(d.result.error) == "string"))
            if d.tool then restore_tool(tool, d.tool) end
            tool.error = d.result.error
            if tool.status == "interrupted" then tool.status = d.result.ok == false and "failed" or "completed" end
            if tool.status == "running" then tool.status, tool.error = "interrupted", interrupted() end
            state.results[d.id], state.resolved[d.id] = true, true
            table.insert(s.saved_context, { type = "function_call_output", call_id = d.id,
                output = json.encode(d.result), source = "tool" })
        elseif kind == "block" then
            assert(type(d.text) == "string" and type(d.id) == "string")
            if d.reasoning then
                local target = d.tool and assert(state.seen[d.tool]) or msg
                target.reasoning = target.reasoning or {}
                table.insert(target.reasoning, { id = d.id, run_id = d.run,
                    model_id = type(d.model_id) == "string" and d.model_id or s.model_id,
                    text = d.text, status = "completed" })
            else
                msg.content = msg.content .. d.text
            end
        elseif kind == "finish" then
            assert(d.status == 2 or d.status == 3 or d.status == 4)
            assert(not d.content or type(d.content) == "string")
            if d.status == 2 then assert(state.has_response, "缺少模型上下文") end
            state.finished = true
            msg.content, msg.status = d.content or msg.content, d.status
            msg.error = d.error and { message = tostring(d.error.message or "请求失败"), retryable = false } or nil
            s.updated_at = math.tointeger(d.time) or s.updated_at
        else
            error("不支持的历史事件")
        end
    end
end

local function restore_session(chat, id, rows)
    local s = Session:new(chat, config.default_model_id, nil, id)
    s.updated_at = 0
    local state = { calls = {}, results = {}, resolved = {}, seen = {} }
    table.sort(rows, function(a, b)
        return a.seq < b.seq or a.seq == b.seq and tostring(a._id) < tostring(b._id)
    end)
    for _, doc in ipairs(rows) do
        local expected = s.owner.app.identity.user_id .. "/" .. id .. "/" .. doc.seq
        local version = doc.schema_version
        local gap = doc.seq ~= s.sequence + 1 or doc._id ~= expected
        s.sequence = doc.seq
        local ok = pcall(function()
            assert(doc._id == expected and doc.seq > 0)
            assert((version == 1 or version == nil)
                and (not doc.session_schema_version or doc.session_schema_version == 1))
            local d = json.decode(doc.payload)
            assert(type(d) == "table")
            apply(s, state, doc.kind, d)
        end)
        if gap or not ok then
            if not ok and doc.kind == "result" then
                local decoded, result = pcall(json.decode, doc.payload)
                local tool = decoded and type(result) == "table" and state.seen[result.id]
                if tool then
                    tool.status, tool.error, tool.output = "interrupted", "执行中断，结果无法确认", ""
                    tool.changed_files, tool.exit_code = {}, nil
                end
            end
            table.insert(s.messages, { id = "gap-" .. doc.seq, role = 2, status = 0,
                content = "部分历史未能恢复", created_at = s.updated_at })
            local reason = gap and "sequence" or doc.kind == "result" and "invalid_result" or "invalid_record"
            log.info("agent.persistence", "restore", "document=%s version=%s reason=%s",
                expected, tostring(version), reason)
            local unsupported = version and version ~= 1
                or doc.session_schema_version and doc.session_schema_version ~= 1
            warn(s, unsupported and "当前版本无法完整读取" or "部分历史未能恢复",
                gap or doc.kind ~= "block" or version ~= 1)
        end
    end
    settle(s, state)
    close_question(s, state)
    if not state.message then warn(s, "当前版本无法完整读取", true) end
    if not s.execution_target and not s.read_only then
        s.needs_workspace = not pcall(require("agent.workspace").existing, config.tools.workspace_root,
            chat.app.identity.username, id)
    end
    s.revision = s.sequence
    return s
end

function Store.settings(app, key, fields)
    assert(not app.blocked_settings[key], "当前版本无法修改该设置")
    local id = app.identity.user_id
    local filter = { _id = id .. "/" .. key, user_id = id, schema_version = 1 }
    if app.legacy_settings[key] then
        filter.schema_version = nil
        filter["$or"] = { { schema_version = { ["$exists"] = false } }, { schema_version = 1 } }
        fields.schema_version = 1
    end
    assert(database("store_fields", "settings", filter, fields) == 1, "设置写入未确认")
    app.legacy_settings[key] = nil
end

function Store.restore(app)
    local user = app.identity.user_id
    local settings = database("find", "settings", { user_id = user })
    local history = database("find", "history", { user_id = user })
    for _, doc in ipairs(settings) do
        if doc.user_id == user and type(doc._id) == "string" and doc._id:sub(1, #user + 1) == user .. "/" then
            local key = doc._id:sub(#user + 2)
            local device = key:match("^device/([%w_-]+)$")
            local known = key == "model" and type(doc.model_id) == "string"
                or device and type(doc.name) == "string"
            if known and doc.schema_version == nil then app.legacy_settings[key] = true end
            if not known or doc.schema_version ~= 1 and not app.legacy_settings[key] then
                app.blocked_settings[key] = true
            elseif key == "model" and type(doc.model_id) == "string" then app.default_model = doc.model_id
            elseif key:sub(1, 7) == "device/" and type(doc.name) == "string" then
                local id = key:sub(8)
                app.execution.devices[id] = { id = id, name = doc.name, remote_enabled = doc.remote_enabled == true }
                if valid_target(doc.target) and doc.target.device_id == id then app.targets[id] = doc.target end
            end
        end
    end
    local groups, damaged = {}, {}
    for _, doc in ipairs(history) do
        local id = doc.session_id
        if doc.user_id == user and type(id) == "string" and #id <= 128 and id:match("^[%w_-]+$") then
            groups[id] = groups[id] or {}
            if math.type(doc.seq) == "integer" and doc.seq > 0 and doc.seq < 0xffffffff then
                table.insert(groups[id], doc)
            else
                damaged[id] = true
            end
        end
    end
    for id, rows in pairs(groups) do
        app.chat.sessions[id] = restore_session(app.chat, id, rows)
        table.insert(app.chat.session_order, id)
        if damaged[id] then warn(app.chat.sessions[id], "部分历史未能恢复", true) end
    end
    table.sort(app.chat.session_order, function(a, b)
        local x, y = app.chat.sessions[a].updated_at, app.chat.sessions[b].updated_at
        return x > y or x == y and a < b
    end)
end

---写入超时后从库中重建该会话，其他会话的活动任务继续使用原对象。
function Store.reload(app, old)
    local rows = database("find", "history", { user_id = app.identity.user_id, session_id = old.id })
    local chat = app.chat
    if #rows == 0 then
        old:close()
        chat.sessions[old.id] = nil
        for i, id in ipairs(chat.session_order) do
            if id == old.id then table.remove(chat.session_order, i); break end
        end
        return
    end
    local valid, damaged = {}, false
    for _, row in ipairs(rows) do
        if row.user_id == app.identity.user_id and row.session_id == old.id then
            if math.type(row.seq) == "integer" and row.seq > 0 then table.insert(valid, row)
            else damaged = true end
        end
    end
    local restored = restore_session(chat, old.id, valid)
    if damaged then warn(restored, "部分历史未能恢复", true) end
    restored.revision = math.max(restored.revision, old.revision + 1)
    old:close()
    chat.sessions[old.id] = restored
end

return Store
