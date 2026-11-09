local User = require("user")
local class = require("class")
local rpc = require("rpc")
local log = require("log")
local codes = require("enum.error_code")
local skynet = require("skynet")
local username = require("helper.username")
local Prompts = require("agent.prompts")
local file = require("file")

---@return table[]
---@return integer
local function load_request_handlers()
    local handler_path = assert(package.searchpath("user.handler", package.path))
    local user_directory = assert(handler_path:match("^(.*)[/\\]handler%.lua$"), "无法定位 User 模块目录")
    local mods_directory = user_directory .. "/mods"
    local directories, list_error = file.list_directories(mods_directory)
    assert(directories, "读取 User 模块目录失败 dir=" .. mods_directory .. ": " .. tostring(list_error))
    local module_names = { "user.handler" }
    for _, name in ipairs(directories) do
        local directory = mods_directory .. "/" .. name
        local filenames, read_error = file.list_files(directory)
        assert(filenames, "读取 User 模块目录失败 dir=" .. directory .. ": " .. tostring(read_error))
        for _, filename in ipairs(filenames) do
            if filename == "handler.lua" then
                module_names[#module_names + 1] = "user.mods." .. name .. ".handler"
            end
        end
    end
    local handlers, registered, count = {}, {}, 0
    for _, module_name in ipairs(module_names) do
        local handler = require(module_name)
        assert(type(handler) == "table" and type(handler.REQUEST) == "table",
            "客户端请求 handler 必须导出 REQUEST 表: " .. module_name)
        local requests = handler.REQUEST
        for name in pairs(requests) do
            assert(not registered[name], "客户端请求重复注册: " .. name)
            registered[name] = true
            count = count + 1
        end
        handlers[#handlers + 1] = requests
    end
    return handlers, count
end

---@class client.ConnectionState
---@field user user.User
---@field websocket_address integer

---@class client.Service
---@field new fun(self: client.Service): client.Service
---@field users table<string, user.User>
---@field connections table<string, client.ConnectionState>
---@field pending_runs table<agent.Run, boolean>
---@field prompt_templates agent.PromptTemplates?
---@field request_handlers table<string, function>[]
local ClientService = class()

ClientService.commands = { open = "open", handle_request = "handle_request", disconnect = "disconnect" }
ClientService.closing_commands = { disconnect = true }

function ClientService:ctor()
    self.users = {}
    self.connections = {}
    self.pending_runs = {}
    self.prompt_templates = nil
    self.request_handlers = {}
end

function ClientService:init()
    assert(not self.prompt_templates, "Agent 提示词模板已经加载")
    local handlers, count = load_request_handlers()
    local templates = Prompts.load_templates()
    self.request_handlers = handlers
    self.prompt_templates = templates
    log.info("client", "init", "客户端请求已注册 count=%d，Agent 提示词模板已加载", count)
end

---@param user user.User
---@param name string
---@param args table
function ClientService:publish(user, name, args)
    for id, state in pairs(self.connections) do
        if state.user == user then
            local code = rpc.send(state.websocket_address, "send_response", id, 0, name, args)
            if code ~= codes.succ then log.failure("client", "publish connection=" .. id, code) end
        end
    end
end

---@param _ base.CommandContext
---@param id string
---@param websocket_address integer
---@param name string
---@return table|nil
function ClientService:open(_, id, websocket_address, name)
    assert(not self.connections[id], "连接已经绑定 client 服务")
    if not name or not username.normalize(name) or username.normalize(name) ~= name then return nil end
    local user = self.users[name]
    if not user then
        user = User:new(name, self)
        self.users[name] = user
        log.info("client", "open", "创建用户 user=%s", user.id)
    end
    self.connections[id] = { user = user, websocket_address = websocket_address }
    return user:snapshot()
end

---@param context base.CommandContext
---@param id string
---@param message_id integer
---@param name string
---@param args table
function ClientService:handle_request(context, id, message_id, name, args)
    local state = self.connections[id]
    if not state or context.source ~= state.websocket_address then
        log.info("client", "handle_request", "连接来源无效 connection=%s source=%s", id, context.source)
        return
    end
    local method
    for _, requests in ipairs(self.request_handlers) do
        method = requests[name]
        if method ~= nil then break end
    end
    if type(method) ~= "function" then
        log.info("client", "handle_request", "未知请求 connection=%s name=%s", id, name)
        rpc.send(state.websocket_address, "close_connection", id, codes.websocket_policy_violation, "未知请求")
        return
    end
    local ok, response = xpcall(function() return method(state.user, args) end, debug.traceback)
    if not ok then
        log.failure("client", "handle_request connection=" .. id, response)
        rpc.send(state.websocket_address, "close_connection", id, codes.websocket_internal_error, "请求处理失败")
        return
    end
    rpc.send(state.websocket_address, "send_response", id, message_id, name:gsub("Req$", "Res"), response)
end

---@param _ base.CommandContext?
---@param id string
function ClientService:disconnect(_, id)
    self.connections[id] = nil
end

function ClientService:close()
    local succeeded, runs = true, {}
    for run in pairs(self.pending_runs) do runs[#runs + 1] = run end
    for _, run in ipairs(runs) do
        if not run:cancel() then succeeded = false end
    end
    self.connections = {}
    while next(self.pending_runs) do skynet.sleep(1) end
    for _, run in ipairs(runs) do
        if run.close_error then
            succeeded = false
            log.failure("client", "close", run.close_error)
        end
    end
    for _, user in pairs(self.users) do user:close() end
    return succeeded
end

return ClientService
