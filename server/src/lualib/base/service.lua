local class = require("class")
local skynet = require("skynet")
local error_code = require("enum.error_code")
local hotfix = require("hotfix")
local log = require("log")

---@class base.CommandContext
---@field source integer
---@field session integer

---@class base.Service
---@field new fun(self: base.Service, instance: table): base.Service
---@field instance table
---@field state string
---@field owner integer?
---@field active_commands integer
---@field close_started boolean
---@field close_done boolean
---@field close_succeeded boolean
local Service = class()

---@param instance table
function Service:ctor(instance)
    self.instance = instance
    self.owner = nil
    self.state = "created"
    self.active_commands = 0
    self.close_started = false
    self.close_done = false
    self.close_succeeded = false
end

---计数覆盖让出期间，异常也必须释放占用。
---@param method string
---@param ... any
---@return any ...
function Service:_invoke(method, ...)
    self.active_commands = self.active_commands + 1
    local result = table.pack(pcall(self.instance[method], self.instance, ...))
    self.active_commands = self.active_commands - 1
    if not result[1] then
        error(result[2], 0)
    end
    return table.unpack(result, 2, result.n)
end

---@param context base.CommandContext
---@param command string
---@param ... any
---@return error_code
---@return any ...
function Service:invoke(context, command, ...)
    if command == "status" then
        return error_code.succ,
            self.state == "ready" and self.instance.status and self.instance:status() or self.state
    end
    if command == "init" then
        if self.state ~= "created" then
            return error_code.invalid_command
        end
        self.owner = context.source
        self.state = "initializing"
        if self.instance.init then
            assert(self:_invoke("init", ...) ~= false, "服务初始化失败")
        end
        assert(self.state == "initializing", "服务初始化被关闭中断")
        self.state = "ready"
        log.info(SERVICE_NAME, "init", "服务就绪")
        return error_code.succ, true
    end
    if command == "close" then
        if context.source ~= self.owner then
            return error_code.invalid_command
        end
        if self.close_started then
            while not self.close_done do
                skynet.sleep(1)
            end
            return self.close_succeeded and error_code.succ or error_code.call_fail, self.close_succeeded
        end
        self.close_started = true
        self.state = "closing"
        local ok, result = true, true
        if self.instance.close then
            ok, result = pcall(self.instance.close, self.instance)
        end
        while self.active_commands > 0 do
            skynet.sleep(1)
        end
        self.close_succeeded = ok and result ~= false
        self.state = self.close_succeeded and "closed" or "failed"
        self.close_done = true
        if not self.close_succeeded then
            log.failure(SERVICE_NAME, "close", ok and "清理返回失败" or result)
        end
        return self.close_succeeded and error_code.succ or error_code.call_fail, self.close_succeeded
    end
    local method = self.instance.commands[command]
    local initializing = self.state == "initializing" and self.instance.initializing_commands
        and self.instance.initializing_commands[command]
    local cleanup = self.close_started and self.instance.closing_commands
        and self.instance.closing_commands[command]
    if not method or (self.state ~= "ready" and not initializing and not cleanup) then
        log.info(SERVICE_NAME, "dispatch", "拒绝命令 command=%s state=%s", tostring(command), self.state)
        return error_code.invalid_command
    end
    return error_code.succ, self:_invoke(method, context, ...)
end

---@param session integer
---@param source integer
---@param command string
---@param ... any
function Service:dispatch(session, source, command, ...)
    local result = table.pack(xpcall(function(...)
        return self:invoke({ source = source, session = session }, command, ...)
    end, debug.traceback, ...))
    if not result[1] then
        if command == "init" and self.state == "initializing" then
            self.state = "failed"
        end
        log.failure(SERVICE_NAME, tostring(command), result[2])
        if session ~= 0 then
            skynet.retpack(error_code.call_fail)
        end
        return
    end
    if session ~= 0 then
        skynet.retpack(table.unpack(result, 2, result.n))
    end
end

---@param module_name string
function Service.start(module_name)
    skynet.start(function()
        local service_class = require(module_name)
        local runtime = require("service"):new(service_class:new())
        hotfix.install_debug_command()
        skynet.dispatch("lua", function(...)
            runtime:dispatch(...)
        end)
    end)
end

return Service
