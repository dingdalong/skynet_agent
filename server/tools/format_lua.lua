-- 由 Sumneko 插件随附的 LuaLS 执行，与“格式化文档”共用 code_format。
local formatter = require("code_format")
local uri = arg[1]
for i = 3, #arg, 2 do
    assert(formatter.update_config(1, arg[i], arg[i + 1]))
end

local source = io.read("a")
-- 嵌套函数的换行可能改变下一轮排版。全量整理时等布局稳定再写入文件。
local full_run = arg[2] == "all"
for _ = 1, 8 do
    local ok, formatted = formatter.format(uri, source, {})
    assert(ok, formatted or ("Lua 格式化失败: " .. uri))
    if not full_run or formatted == source then
        io.write(formatted)
        return
    end
    source = formatted
end
error("Lua 格式化多轮后仍有差异: " .. uri)
