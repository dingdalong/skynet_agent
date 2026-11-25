-- 从 server 目录运行。文件名以 NUL 分隔从 Git 传递到格式检查入口。
package.cpath = "./luaclib/?.so;" .. package.cpath
local lfs = require("lfs")
local root = assert(lfs.currentdir():match("^(.*)/server$"))
local function quote(value)
    return "'" .. value:gsub("'", "'\\''") .. "'"
end

local function capture(command)
    local pipe = assert(io.popen(command))
    local result = assert(pipe:read("a"))
    assert(pipe:close(), "命令执行失败: " .. command)
    return result
end

local function read(path)
    local file <close> = assert(io.open(path, "rb"))
    return assert(file:read("a"))
end

local function source_files(scope)
    local found = {}
    local function collect(options, include)
        local names = capture("git -C " .. quote(root) .. " " .. options ..
            " -z -- '*.lua' '*.proto' ':(exclude,glob)server/3rd/**' ':(exclude,glob).agents/skills/**'")
        for name in names:gmatch("([^%z]+)%z") do found[name] = include end
    end
    if scope == "all" then
        collect("ls-files --cached --others --exclude-standard", true)
    else
        collect("diff --cached --name-only --no-renames --diff-filter=AMT", true)
        collect("ls-files --modified --others --exclude-standard", true)
    end
    collect("ls-files --cached --ignored --exclude-per-directory=.gitignore", nil)
    local paths = {}
    for name in pairs(found) do
        local path = root .. "/" .. name
        if lfs.symlinkattributes(path, "mode") == "file" then
            local directory = root
            local linked = false
            for part in name:gmatch("([^/]+)/") do
                directory = directory .. "/" .. part
                if lfs.symlinkattributes(directory, "mode") == "link" then
                    linked = true; break
                end
            end
            if not linked then paths[#paths + 1] = path end
        end
    end
    table.sort(paths)
    return paths
end

local function uri(path)
    return "file://" .. path:gsub("[^%w%-%._~/]", function(byte) return string.format("%%%02X", byte:byte()) end)
end

local function lua_server()
    local override = os.getenv("LUA_LANGUAGE_SERVER")
    if override and override ~= "" then return override end
    local dir = assert(os.getenv("HOME")) .. "/.vscode/extensions/"
    if lfs.attributes(dir .. "extensions.json", "mode") == "file" then
        for _, entry in ipairs(require("cjson").decode(read(dir .. "extensions.json"))) do
            if entry.identifier.id:lower() == "sumneko.lua" then
                return dir .. entry.relativeLocation .. "/server/bin/lua-language-server"
            end
        end
    end
    error("找不到 sumneko.lua，请安装 VS Code 的 Lua 扩展或设置 LUA_LANGUAGE_SERVER")
end

local function lua_command(binary, path, scope)
    local args = { quote(binary), "tools/format_lua.lua", quote(uri(path)), scope }
    local dir = path:match("^(.*)/")
    while true do
        local config = dir .. "/.editorconfig"
        if lfs.attributes(config, "mode") == "file" then
            args[#args + 1] = quote(uri(dir))
            args[#args + 1] = quote(config)
        end
        if dir == root then break end
        dir = dir:match("^(.*)/")
    end
    return table.concat(args, " ")
end

local function proto_command()
    local binary = os.getenv("CLANG_FORMAT")
    if binary and binary ~= "" then return quote(binary) end
    if os.execute("command -v clang-format >/dev/null") then return "clang-format" end
    if capture("uname -s") == "Darwin\n" then return "xcrun clang-format" end
    error("找不到 clang-format，请安装或设置 CLANG_FORMAT")
end

local scope, list = "changed", false
local i = 1
while i <= #arg do
    if arg[i] == "--list0" then
        list = true
    elseif arg[i] == "--scope" then
        i = i + 1
        scope = arg[i]
        assert(scope == "all" or scope == "changed", "无效的格式化范围")
    else
        error("未知选项 " .. arg[i])
    end
    i = i + 1
end

local lua, proto
for _, path in ipairs(source_files(scope)) do
    if list then
        io.write(path, "\0")
    else
        local command
        if path:match("%.lua$") then
            lua = lua or lua_server()
            command = lua_command(lua, path, scope)
        else
            proto = proto or proto_command()
            local style =
            "{BasedOnStyle: Google, IndentWidth: 2, SortIncludes: Never, LineEnding: LF, InsertNewlineAtEOF: true}"
            command = proto ..
                " --fail-on-incomplete-format --style=" .. quote(style) .. " --assume-filename=" .. quote(path)
        end
        local formatted = capture(command .. " < " .. quote(path))
        if formatted ~= read(path) then
            local file <close> = assert(io.open(path, "wb"))
            assert(file:write(formatted))
            print("已格式化 " .. path:sub(#root + 2))
        end
    end
end
