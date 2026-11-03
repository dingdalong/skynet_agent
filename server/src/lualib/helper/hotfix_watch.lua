local class = require("class")
local lfs = require("lfs")
local skynet = require("skynet")
local log = require("log")

local POLL_TICKS = 50
local SETTLE_TICKS = 20

---@class helper.HotfixWatch
---@field new fun(self: helper.HotfixWatch, node: base.Node, root: string?): helper.HotfixWatch
---@field node base.Node
---@field root string
---@field snapshot table<string, string>
---@field candidate table<string, string>?
---@field changed_at integer?
---@field pending table<integer, table<string, string>> 模块名到相对文件路径
---@field closing boolean
---@field running boolean
---@field last_error string?
local HotfixWatch = class()

---@param path string
---@return string|nil
local function module_name(path)
    if path == "lualib/base/hotfix.lua" or path == "lualib/base/preload.lua"
        or path == "lualib/helper/hotfix_watch.lua" or path:match("^lualib/base/hotfix/")
        or path:match("^lualib/luaext/") then
        return nil
    end
    local name = path:match("^lualib/base/(.+)%.lua$") or path:match("^lualib/(.+)%.lua$")
    if name then
        return (name:gsub("/init$", ""):gsub("/", "."))
    end
    local service, file = path:match("^service/([^/]+)/([^/]+)%.lua$")
    if service == file then
        return service
    end
end

---@param directory string
---@param relative string
---@param result table<string, string>
local function read_directory(directory, relative, result)
    for entry in lfs.dir(directory) do
        if entry ~= "." and entry ~= ".." then
            local path = directory .. "/" .. entry
            local name = relative .. entry
            local mode = assert(lfs.symlinkattributes(path, "mode"), "无法读取文件属性: " .. path)
            if mode == "directory" then
                read_directory(path, name .. "/", result)
            elseif mode == "file" and module_name(name) then
                local handle = assert(io.open(path, "rb"))
                local content, err = handle:read("a")
                handle:close()
                result[name] = assert(content, err)
            end
        end
    end
end

---@param first table<string, string>
---@param second table<string, string>
---@return boolean
local function equal(first, second)
    for path, content in pairs(first) do
        if second[path] ~= content then return false end
    end
    for path in pairs(second) do
        if first[path] == nil then return false end
    end
    return true
end

---@param set table<string, any>
---@return string[]
local function sorted_names(set)
    local names = {}
    for name in pairs(set) do names[#names + 1] = name end
    table.sort(names)
    return names
end

---@param node base.Node
---@param root string?
function HotfixWatch:ctor(node, root)
    self.node = node
    self.root = root or "src"
    self.snapshot = {}
    self.pending = {}
    self.closing = false
    self.running = false
end

---@return table<string, string>
function HotfixWatch:_snapshot()
    local snapshot = {}
    read_directory(self.root, "", snapshot)
    return snapshot
end

function HotfixWatch:start()
    assert(not self.running and not self.closing, "热修监听不能重复启动")
    self.snapshot = self:_snapshot()
    self.running = true
    log.info("hotfix_watch", "start", "监听源码 root=%s poll_ticks=%d settle_ticks=%d",
        self.root, POLL_TICKS, SETTLE_TICKS)
    skynet.fork(function() self:_run() end)
end

---@param modules table<string, string>
function HotfixWatch:_reload(modules)
    local targets = { { name = ".main", address = skynet.self() } }
    for _, service in ipairs(self.node.services) do
        if service.ready and not service.closed then targets[#targets + 1] = service end
    end
    local candidates = {}
    for _, target in ipairs(targets) do
        local pending = self.pending[target.address] or {}
        self.pending[target.address] = pending
        for name, path in pairs(modules) do pending[name] = path end
        for name, path in pairs(pending) do candidates[name] = path end
    end
    local errors = {}
    for _, name in ipairs(sorted_names(candidates)) do
        local path = candidates[name]
        local content = self.snapshot[path]
        local file = self.root .. "/" .. path
        if content == nil then
            errors[#errors + 1] = "源码不存在 file=" .. file
        else
            -- 只编译当前快照，不执行候选代码，也不经过 Skynet 的 loadfile 缓存。
            local chunk, err = load(content, "@" .. file, "t")
            if not chunk then errors[#errors + 1] = err end
        end
    end
    if #errors > 0 then
        log.failure("hotfix_watch", "reload", "预检查失败 errors=" .. table.concat(errors, "; "))
        return
    end
    local requests = skynet.request()
    for _, target in ipairs(targets) do
        local pending = self.pending[target.address]
        requests:add(table.pack(target.address, "debug", "HOTFIX", table.unpack(sorted_names(pending))))
    end
    local responses = {}
    for request, response in requests:select(300) do
        responses[request[1]] = response
    end
    local updated = {}
    for _, target in ipairs(targets) do
        local response = responses[target.address]
        local report = response and response[3]
        if response and response[1] == true and type(report) == "table" then
            local pending = self.pending[target.address]
            for _, name in ipairs(report.updated) do
                updated[self.root .. "/" .. pending[name]] = true
            end
            self.pending[target.address] = nil
        else
            local err = tostring(response and response[2] or "热修响应失败或超时"):match("^[^\r\n]*")
            errors[#errors + 1] = target.name .. ": " .. err
        end
    end
    local files = table.concat(sorted_names(updated), ",")
    if #errors > 0 then
        local result = next(updated) and "部分更新" or "热修失败"
        log.failure("hotfix_watch", "reload", result .. " files=" .. files .. " errors=" .. table.concat(errors, "; "))
    elseif next(updated) then
        log.info("hotfix_watch", "reload", "已更新 files=%s", files)
    end
end

function HotfixWatch:poll()
    if self.closing or self.node.closing then return end
    local current = self:_snapshot()
    if equal(self.snapshot, current) then
        self.candidate = nil
        return
    end
    if not self.candidate or not equal(self.candidate, current) then
        self.candidate = current
        self.changed_at = skynet.now()
        return
    end
    if skynet.now() - self.changed_at < SETTLE_TICKS then return end
    local modules = {}
    for path, content in pairs(current) do
        if self.snapshot[path] == nil then
            log.failure("hotfix_watch", "poll", "新增文件需重启生效 path=" .. path)
        elseif self.snapshot[path] ~= content then
            modules[module_name(path)] = path
        end
    end
    for path in pairs(self.snapshot) do
        if current[path] == nil then
            log.failure("hotfix_watch", "poll", "删除文件需重启生效 path=" .. path)
        end
    end
    self.snapshot = current
    self.candidate = nil
    if next(modules) then self:_reload(modules) end
end

function HotfixWatch:_run()
    while not self.closing and not self.node.closing do
        skynet.sleep(POLL_TICKS, self)
        if not self.closing and not self.node.closing then
            local ok, err = xpcall(function() self:poll() end, debug.traceback)
            if not ok and err ~= self.last_error then log.failure("hotfix_watch", "poll", err) end
            self.last_error = not ok and err or nil
        end
    end
    self.running = false
end

function HotfixWatch:close()
    self.closing = true
    skynet.wakeup(self)
    while self.running do skynet.sleep(1) end
end

return HotfixWatch
