local skynet = require("skynet")
local socket = require("skynet.socket")
local httpc = require("http.httpc")
local cjson = require("cjson")

local M = {}

function M.equal(actual, expected, message)
    assert(actual == expected, (message or "值不一致") ..
        " expected=" .. tostring(expected) .. " actual=" .. tostring(actual))
end

function M.same(actual, expected, message)
    if type(actual) ~= "table" or type(expected) ~= "table" then
        return M.equal(actual, expected, message)
    end
    for key, value in pairs(expected) do M.same(actual[key], value, (message or "结构不一致") .. "." .. key) end
    for key in pairs(actual) do assert(expected[key] ~= nil, "出现额外字段: " .. tostring(key)) end
end

function M.contains(value, expected)
    assert(value:find(expected, 1, true), "未找到 " .. expected .. ":\n" .. value)
end

function M.excludes(value, unexpected)
    assert(not value:find(unexpected, 1, true), "出现意外内容 " .. unexpected .. ":\n" .. value)
end

---@param predicate fun(): any
---@param message string
---@param timeout_ticks? integer
---@return any
function M.until_true(predicate, message, timeout_ticks)
    local deadline = skynet.now() + (timeout_ticks or 1500)
    repeat
        local result = predicate()
        if result then return result end
        skynet.sleep(1)
    until skynet.now() >= deadline
    error(message, 2)
end

function M.read(path)
    local handle = assert(io.open(path, "rb"))
    local content = assert(handle:read("*a"))
    assert(handle:close())
    return content
end

function M.write(path, content)
    local handle = assert(io.open(path, "wb"))
    assert(handle:write(content))
    assert(handle:close())
end

function M.health(base_url)
    httpc.timeout = 500
    local status, body = httpc.get(base_url, "/health")
    M.equal(status, 200, "假模型健康检查失败")
    return cjson.decode(body)
end

function M.console(port, command)
    local id = assert(socket.open("127.0.0.1", port))
    local done = false
    skynet.timeout(500, function()
        if not done then socket.shutdown(id) end
    end)
    local ok, output = xpcall(function()
        assert(socket.write(id, command .. "\n"))
        local lines = {}
        while true do
            local line = socket.readline(id)
            assert(line, "控制台在命令完成前断开")
            lines[#lines + 1] = line
            assert(not line:find("<CMD Error>", 1, true), table.concat(lines, "\n"))
            if line:find("<CMD OK>", 1, true) then return table.concat(lines, "\n") end
        end
    end, debug.traceback)
    done = true
    socket.close(id)
    assert(ok, output)
    return output
end

---通过现有原生进程桥执行实际控制脚本，同时让出测试服务以接收 WebSocket 关闭事件。
---@param config table
---@param command string
---@param timeout_ticks? integer
---@return string
function M.control(config, command, timeout_ticks)
    local native = require("agent_process")
    local filesystem = require("agent_filesystem")
    local handle = native.spawn(assert(filesystem.realpath("bin/process_launcher")), ".",
        { "/bin/sh", "./control.sh", command, tostring(config.control_port) },
        { "PATH=" .. config.command_path, "LC_ALL=C" }, false)
    local output, readers, ids = {}, 0, {}
    local function attach(fd)
        if not fd then return end
        local id = socket.bind(fd)
        ids[#ids + 1] = id
        readers = readers + 1
        skynet.fork(function()
            local ok, failure = pcall(function()
                while true do
                    local chunk = socket.read(id)
                    if not chunk then break end
                    output[#output + 1] = chunk
                end
            end)
            if not ok then output[#output + 1] = tostring(failure) end
            socket.close(id)
            readers = readers - 1
        end)
    end
    local ok, failure = xpcall(function()
        local stdout, stderr = handle:fds()
        attach(stdout)
        attach(stderr)
        local code = M.until_true(function()
            local value = handle:poll()
            if value ~= nil then return { value } end
        end, "控制脚本执行超时: " .. command, timeout_ticks or 1500)[1]
        M.until_true(function() return readers == 0 end, "控制脚本输出未关闭", 100)
        M.equal(code, 0, "控制脚本失败:\n" .. table.concat(output))
    end, debug.traceback)
    if not ok then handle:terminate() end
    for _, id in ipairs(ids) do
        if not socket.invalid(id) then socket.shutdown(id) end
    end
    handle:close()
    assert(ok, failure)
    return table.concat(output)
end

return M
