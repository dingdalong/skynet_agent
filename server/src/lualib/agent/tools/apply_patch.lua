local lfs = require("lfs")
local workspace = require("agent.workspace")
local native = require("agent_process")
local Patch = {}

Patch.spec = { type = "function", name = "apply_patch", description =
    "使用 *** Begin Patch / *** End Patch 格式增删改文件，支持 *** Move to:。"
        .. "相对路径基于会话工作目录。",
    parameters = { type = "object", properties = {
        patch = { type = "string" }, sandbox_permissions = { type = "string",
            enum = { "use_default", "require_escalated" } }, justification = { type = "string" },
    }, required = { "patch" }, additionalProperties = false } }

local function lines(text)
    local result = {}
    for line in (text .. "\n"):gmatch("(.-)\n") do result[#result + 1] = line:gsub("\r$", "") end
    if result[#result] == "" then table.remove(result) end
    return result
end

---@param text string
---@return table[]
function Patch.parse(text)
    assert(type(text) == "string" and #text <= 262144 and not text:find("%z"), "补丁过大或格式无效")
    local input, operations, current, chunk = lines(text), {}
    assert(input[1] == "*** Begin Patch" and input[#input] == "*** End Patch", "缺少补丁边界")
    for index = 2, #input - 1 do
        local line = input[index]
        local action, path = line:match("^%*%*%* (%a+) File: (.+)$")
        if action then
            assert(action == "Add" or action == "Delete" or action == "Update", "未知补丁操作")
            current = { action = action, path = path, chunks = {}, added = {} }
            operations[#operations + 1] = current
            chunk = nil
        elseif line:match("^%*%*%* Move to: ") then
            assert(current and current.action == "Update" and not current.move, "移动文件格式无效")
            current.move = line:sub(14)
        elseif line == "@@" or line:sub(1, 3) == "@@ " then
            assert(current and current.action == "Update", "补丁段没有目标文件")
            chunk = { context = line:sub(4), entries = {} }
            current.chunks[#current.chunks + 1] = chunk
        elseif line == "*** End of File" then
            assert(chunk, "文件结束标记没有补丁段")
            chunk.eof = true
        else
            assert(current, "补丁没有文件操作")
            if current.action == "Add" then
                assert(line:sub(1, 1) == "+", "新增文件行必须以 + 开始")
                current.added[#current.added + 1] = line:sub(2)
            else
                assert(current.action == "Update" and chunk, "补丁修改缺少 @@ 标记")
                assert(line:match("^[ +%-]"), "补丁修改行格式无效")
                assert(not chunk.eof, "文件结束标记后仍有内容")
                chunk.entries[#chunk.entries + 1] = line
            end
        end
    end
    assert(#operations > 0, "补丁没有文件操作")
    return operations
end

local function read(path)
    local file = assert(io.open(path, "rb"))
    local content = file:read(2097153)
    file:close()
    assert(#content <= 2097152 and not content:find("%z"), "补丁仅支持不超过 2 MiB 的文本文件")
    return content
end

local function modify(content, chunks)
    local original, ending = {}, content:find("\r\n", 1, true) and "\r\n" or "\n"
    local position = 1
    while position <= #content do
        local boundary = content:find("\n", position, true)
        local raw = content:sub(position, boundary or #content)
        original[#original + 1] = { text = raw:gsub("\r?\n$", ""), raw = raw }
        position = boundary and boundary + 1 or #content + 1
    end
    local cursor = 1
    for _, chunk in ipairs(chunks) do
        if chunk.context ~= "" then
            local found
            for i = cursor, #original do
                if original[i].text == chunk.context then found = i + 1; break end
            end
            assert(found, "找不到补丁段上下文: " .. chunk.context)
            cursor = found
        end
        local old = {}
        for _, entry in ipairs(chunk.entries) do
            if entry:sub(1, 1) ~= "+" then old[#old + 1] = entry:sub(2) end
        end
        local start
        for trim = 0, 2 do
            local function normalize(value)
                if trim == 1 then return value:gsub("%s+$", "") end
                if trim == 2 then return value:match("^%s*(.-)%s*$") end
                return value
            end
            for i = cursor, #original - #old + 1 do
                local matches = not chunk.eof or i + #old - 1 == #original
                for j, text in ipairs(old) do
                    if normalize(original[i + j - 1].text) ~= normalize(text) then matches = false; break end
                end
                if matches then start = i; break end
            end
            if start then break end
        end
        if #old == 0 then start = #original + 1 end
        assert(start, "补丁上下文不匹配")
        local replacement, source = {}, start
        for _, entry in ipairs(chunk.entries) do
            local kind, text = entry:sub(1, 1), entry:sub(2)
            if kind == " " then replacement[#replacement + 1] = original[source] end
            if kind == "+" then replacement[#replacement + 1] = { text = text, raw = text .. ending } end
            if kind ~= "+" then source = source + 1 end
        end
        for _ = 1, #old do table.remove(original, start) end
        for i = #replacement, 1, -1 do table.insert(original, start, replacement[i]) end
        cursor = start + #replacement
    end
    local result = {}
    for _, entry in ipairs(original) do result[#result + 1] = entry.raw end
    return table.concat(result)
end

---@param text string
---@param root string
---@param mode string?
---@return table[]
function Patch.prepare(text, root, mode)
    local operations, touched = Patch.parse(text), {}
    local function target(path)
        local resolved = workspace.resolve(path, root)
        assert(mode == "require_escalated" or workspace.inside(resolved, root), "补丁目标超出会话工作目录")
        assert(not touched[resolved], "补丁目标重复: " .. path)
        assert(lfs.symlinkattributes(resolved, "mode") ~= "link", "补丁目标不能是符号链接")
        touched[resolved] = true
        return resolved
    end
    for _, operation in ipairs(operations) do
        operation.target = target(operation.path)
        local exists = lfs.attributes(operation.target, "mode")
        if operation.action == "Add" then
            assert(not exists, "新增文件已经存在: " .. operation.path)
            operation.content = table.concat(operation.added, "\n") .. "\n"
        else
            assert(exists == "file", "目标不是文本文件: " .. operation.path)
            local content = read(operation.target)
            if operation.action == "Update" then operation.content = modify(content, operation.chunks) end
        end
        if operation.move then operation.destination = target(operation.move)
            assert(not lfs.attributes(operation.destination), "移动目标已经存在") end
    end
    return operations
end

---@param text string
---@param root string
---@param mode string?
---@return table
function Patch.apply(text, root, mode)
    local changed = {}
    local ok, err = pcall(function()
        local operations = Patch.prepare(text, root, mode)
        for _, operation in ipairs(operations) do
            local path = operation.destination or operation.target
            if operation.action == "Delete" then native.remove_file(path) else
                workspace.mkdir(assert(path:match("^(.*)/[^/]+$")))
                native.atomic_write(path, operation.content, operation.action == "Add" or operation.destination ~= nil)
                changed[#changed + 1] = path
                if operation.destination then
                    native.remove_file(operation.target)
                    changed[#changed + 1] = operation.target
                end
            end
            if operation.action == "Delete" then changed[#changed + 1] = path end
        end
    end)
    return { ok = ok, changed_files = changed, error = not ok and tostring(err) or nil }
end

return Patch
