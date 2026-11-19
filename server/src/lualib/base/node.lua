local class = require("class")
local skynet = require("skynet.manager")
local Service = require("service")
local hotfix = require("hotfix")
local rpc = require("rpc")
local log = require("log")
local error_code = require("enum.error_code")
local config = require("etc.cfg")
local HotfixWatch = require("helper.hotfix_watch")

---@class base.Node
---@field new fun(self: base.Node): base.Node
---@field services {name: string, address: integer, ready: boolean?, closed: boolean?}[]
---@field app_center integer?
---@field app_groups table<string, table[]>
---@field changing_app boolean
---@field hotfix_watch helper.HotfixWatch?
---@field closing boolean
---@field close_started boolean
---@field close_done boolean
---@field close_succeeded boolean
---@field shutdown_started boolean
---@field force_shutdown_started boolean
local Node = class()

Node.commands = { shutdown = "shutdown", force_shutdown = "force_shutdown", set_instances = "set_instances" }
Node.initializing_commands = { force_shutdown = true, set_instances = true }

function Node:ctor()
    self.services = {}
    self.app_center = nil
    self.app_groups = {}
    self.changing_app = false
    self.hotfix_watch = nil
    self.closing = false
    self.close_started = false
    self.close_done = false
    self.close_succeeded = false
    self.shutdown_started = false
    self.force_shutdown_started = false
end

---@param name string
---@param count integer
---@param params table?
---@param registered_name string? 单实例可指定注册名
---@param group table[]? 由应用中心统一上下线的实例
---@return integer[]
function Node:launch(name, count, params, registered_name, group)
    assert(registered_name == nil or count == 1, "显式服务名仅支持单实例")
    local addresses = {}
    local position = #self.services + 1
    if group and self.app_center then
        for index, service in ipairs(self.services) do
            if service.address == self.app_center then position = index + 1; break end
        end
    end
    for index = 1, count do
        assert(not self.closing, "服务启动已取消")
        local address = skynet.newservice(name)
        local registered = registered_name or string.format(".%s_%d", name, index)
        local service = { name = registered, address = address }
        table.insert(self.services, position + index - 1, service)
        if group then group[#group + 1] = service end
        skynet.name(registered, address)
        if group then assert(skynet.localname(registered) == address, "服务名已被占用: " .. registered) end
        local code = rpc.call_no_timeout(address, "init", params or {})
        assert(code == error_code.succ, "初始化服务失败: " .. registered)
        service.ready = true
        addresses[index] = address
    end
    return addresses
end

function Node:_retire(group, rollback)
    local requests, waiting = skynet.request(), {}
    for _, service in ipairs(group) do
        service.ready = false
        if not service.closed then
            waiting[service.address] = service
            requests:add(table.pack(service.address, "lua", "close", true))
        end
    end
    for request, response in requests:select() do
        if response and response[1] == error_code.succ and response[2] == true then
            waiting[request[1]].closed = true
            waiting[request[1]] = nil
        end
    end
    for _, service in pairs(waiting) do log.failure(SERVICE_NAME, "retire", "清理失败 name=" .. service.name) end
    assert(not next(waiting) or rollback, "应用实例未完成清理")
    for index = #group, 1, -1 do
        local service = group[index]
        skynet.kill(service.address)
        assert(skynet.localname(service.name) ~= service.address, "旧服务名尚未释放: " .. service.name)
        service.closed = true
        if self.hotfix_watch then self.hotfix_watch.pending[service.address] = nil end
        for position, record in ipairs(self.services) do
            if record == service then table.remove(self.services, position); break end
        end
        table.remove(group, index)
    end
end

---@param context base.CommandContext
---@param name string
---@param count integer
---@return integer[]
function Node:set_instances(context, name, count)
    assert(context.source == skynet.localname(".app_center"), "应用生命周期来源无效")
    assert(not self.closing and not self.changing_app, "节点正在关闭或变更服务")
    local group = self.app_groups[name] or {}
    self.app_groups[name] = group
    self.changing_app = true
    local ok, result = pcall(function()
        if count == 0 then
            self:_retire(group, false)
            return {}
        end
        assert(#group == 0, "现有服务尚未下线")
        local started, addresses = pcall(self.launch, self, name, count, nil, nil, group)
        if not started or self.closing then
            self:_retire(group, true)
            error(started and "节点正在关闭" or addresses)
        end
        return addresses
    end)
    self.changing_app = false
    assert(ok, result)
    return result
end

---@param start_services fun(instance: base.Node)
function Node:init(start_services)
    skynet.register(".main")
    -- 控制台先就绪，业务服务初始化卡住时仍可显式强制结束进程。
    local console = skynet.newservice("debug_console", "127.0.0.1", config.runtime.control_port)
    self.services[#self.services + 1] = { name = "debug_console", address = console }
    start_services(self)
    if config.channel == "develop" then
        self.hotfix_watch = HotfixWatch:new(self)
        self.hotfix_watch:start()
    end
    log.info(SERVICE_NAME, "init", "启动完成 channel=%s services=%d", config.channel, #self.services)
end

---@return string
function Node:status()
    local requests = skynet.request()
    for _, service in ipairs(self.services) do
        if service.name ~= "debug_console" then
            requests:add(table.pack(service.address, "lua", "status"))
        end
    end
    local states = {}
    for request, response in requests:select(300) do
        states[request[1]] = response and response[1] == error_code.succ and response[2] or "failed"
    end
    local lines = {}
    for _, service in ipairs(self.services) do
        if service.name ~= "debug_console" then
            lines[#lines + 1] = string.format(
                "%s %s %s", service.name, skynet.address(service.address), states[service.address] or "unavailable"
            )
        end
    end
    return table.concat(lines, "\n")
end

---@param code integer
function Node:_exit(code)
    -- 让已提交的控制台响应和日志先获得调度机会。
    skynet.sleep(1)
    os.exit(self.force_shutdown_started and 1 or code)
end

---@return boolean
function Node:close()
    if self.close_started then
        while not self.close_done do
            skynet.sleep(1)
        end
        return self.close_succeeded
    end
    self.close_started = true
    self.closing = true
    if self.app_center then
        rpc.call_no_timeout(self.app_center, "freeze")
    end
    while self.changing_app do skynet.sleep(1) end
    if self.hotfix_watch then
        self.hotfix_watch:close()
    end
    local started = skynet.now()
    local succeeded = true
    for index = #self.services, 1, -1 do
        local service = self.services[index]
        if service.name ~= "debug_console" then
            local code, closed = rpc.call_no_timeout(service.address, "close")
            service.closed = code == error_code.succ and closed == true
            if not service.closed then
                succeeded = false
                log.failure(SERVICE_NAME, "close", string.format(
                    "name=%s address=%s code=%s elapsed_ticks=%s",
                    service.name, skynet.address(service.address), code, skynet.now() - started
                ))
            end
        end
    end
    self.close_succeeded = succeeded
    self.close_done = true
    log.info(SERVICE_NAME, "close", "清理完成 succeeded=%s elapsed_ticks=%s", succeeded, skynet.now() - started)
    return succeeded
end

---@param _ base.CommandContext
---@return boolean
function Node:shutdown(_)
    if self.shutdown_started then
        return true
    end
    self.shutdown_started = true
    self.closing = true
    skynet.fork(function()
        local succeeded = self:close()
        -- 节点拥有整个进程；业务资源回收后直接退出，避免 ABORT 并发销毁 VM 和 C 模块。
        self:_exit(succeeded and 0 or 1)
    end)
    return true
end

---@param _ base.CommandContext
---@return boolean
function Node:force_shutdown(_)
    if self.force_shutdown_started then
        return true
    end
    self.force_shutdown_started = true
    self.shutdown_started = true
    self.closing = true
    log.failure(SERVICE_NAME, "force_shutdown", "收到显式强制关闭命令，跳过清理并结束进程")
    skynet.fork(function()
        self:_exit(1)
    end)
    return true
end

local node = { Node = Node }

---@param start_services fun(instance: base.Node)
function node.init(start_services)
    assert(type(start_services) == "function", "节点启动回调必须是 function")
    skynet.start(function()
        local instance = require("node").Node:new()
        local runtime = Service:new(instance)
        hotfix.install_debug_command()
        skynet.dispatch("lua", function(...)
            runtime:dispatch(...)
        end)
        local ok, err = xpcall(function()
            runtime:invoke({ source = skynet.self(), session = 0 }, "init", start_services)
        end, debug.traceback)
        if not ok then
            log.failure(SERVICE_NAME, "init", err)
            pcall(instance.close, instance)
            os.exit(1)
        end
    end)
end

return node
