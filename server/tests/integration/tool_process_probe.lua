local native = require("agent_process")
local sandbox = require("agent.sandbox")
local workspace = require("agent.workspace")
local cjson = require("cjson")
local lfs = require("lfs")
local skynet = require("skynet")
local Processes = require("agent.process")
local Run = require("agent.run")

skynet.start(function()
local ok, failure = xpcall(function()
local root = native.temporary_file("")
os.remove(root)
workspace.mkdir(root)
local directory = workspace.create(root, "probe", "session-probe")
local server = assert(native.realpath("."))

local processes = Processes:new(directory, { max_processes = 8, timeout_ms = 300000,
    max_output_bytes = 1048576 }, nil, "probe")
local function run(argv, mode, tty, input, dependencies, extra_env)
    local request = Run:new()
    request.message_id = "probe-message"
    local record = { output = "" }
    local process = processes:start(argv, directory, tty, mode, 5000, request, record, dependencies, extra_env)
    local result, output = processes:collect(process, 100, 16384, input), ""
    while true do
        output = output .. result.output
        if not result.session_id then break end
        result = processes:collect(process, 100, 16384)
    end
    return result.exit_code, output
end

local code, text = run({ "/bin/bash", "-c", "printf sandbox-ok > result; cat result" })
assert(code == 0 and text == "sandbox-ok", "沙盒正常执行失败: " .. text)
code, text = run({ "/bin/bash", "-c", "printf forbidden > ../outside" })
assert(code ~= 0 and not lfs.attributes(directory .. "/../outside"), "沙盒未阻止越界写入")
code, text = run({ "/bin/bash", "-c", "printf outside-ok > ../outside; cat ../outside" }, "require_escalated")
assert(code == 0 and text == "outside-ok", "沙盒外执行失败: " .. text)
code, text = run({ "/bin/bash", "-c", "cat ../outside" })
assert(code ~= 0 and not text:find("outside%-ok"), "沙盒未隔离其他目录读取")
code, text = run({ "/bin/bash", "-c", 'read -r value; printf "got:%s\n" "$value"' }, nil, true, "pty-input\n")
assert(code == 0 and text:find("got:pty%-input"), "PTY 输入失败: " .. text)
local request = native.temporary_file(cjson.encode({ workspace = directory,
    patch = "*** Begin Patch\n*** Add File: patched\n+patch-ok\n*** End Patch" }))
local lua = assert(native.realpath("3rd/skynet/3rd/lua/lua"))
code, text = run({ lua, "-e", string.format('require("agent.worker").main(%q)', request) }, nil, false, nil,
    { server .. "/src/lualib", server .. "/luaclib", lua, request },
    { "LUA_PATH=" .. server .. "/src/lualib/?.lua;" .. server .. "/src/lualib/?/init.lua",
        "LUA_CPATH=" .. server .. "/luaclib/?.so" })
assert(code == 0 and cjson.decode(text).ok, "沙盒补丁执行失败: " .. text)
os.remove(request)
local timed_run = Run:new()
timed_run.message_id = "timeout-message"
local record = { output = "" }
local timed_process = processes:start({ "/bin/bash", "-c", "sleep 10" }, directory,
    false, "use_default", 50, timed_run, record)
local result
repeat result = processes:collect(timed_process, 100, 4000) until not result.session_id
assert(result.exit_code ~= 0 and record.error == "命令执行超时", "执行超时未终止进程")
processes.config.max_processes = 1
local limit_process = processes:start({ "/bin/bash", "-c", "sleep 10" }, directory,
    false, "use_default", 5000, timed_run, { output = "" })
assert(not pcall(processes.start, processes, { "/bin/bash", "-c", "printf never" }, directory,
    false, "use_default", 5000, timed_run, { output = "" }), "运行进程数量限制失效")
timed_run:cancel()
repeat result = processes:collect(limit_process, 100, 4000) until not result.session_id
assert(result.exit_code ~= 0 and limit_process.record.status == "cancelled", "取消未终止进程")
processes.config.max_output_bytes = 4096
local output_process = processes:start({ "/bin/bash", "-c", "printf '%8192s' x" }, directory,
    false, "use_default", 5000, timed_run, { output = "" })
repeat result = processes:collect(output_process, 100, 4000) until not result.session_id
assert(result.truncated and #result.output <= 4096, "输出缓冲未按上限截断")
local function remove(path)
    if lfs.symlinkattributes(path, "mode") == "directory" then
        for name in lfs.dir(path) do if name ~= "." and name ~= ".." then remove(path .. "/" .. name) end end
        assert(lfs.rmdir(path))
    else assert(os.remove(path)) end
end
processes:close()
remove(root)
print("工具进程验证通过: " .. sandbox.platform() .. " / 沙盒 / 越界阻止 / 沙盒外 / PTY / apply_patch")
end, debug.traceback)
if not ok then io.stderr:write(tostring(failure), "\n") end
os.exit(ok and 0 or 1)
end)
