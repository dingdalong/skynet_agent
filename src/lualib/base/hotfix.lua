---@class base.hotfix.Patch
---@field table table
---@field key any
---@field value function

---@class base.hotfix.PlanState
---@field patches base.hotfix.Patch[]
---@field visited table<table, table<table, boolean>>

local hotfix = {}

---@param path string
---@param key any
---@return string
local function field_path(path, key)
    if type(key) == "string" and key:match("^[%a_][%w_]*$") then
        return path .. "." .. key
    end
    return string.format("%s[%s]", path, tostring(key))
end

---@param old_value any
---@param new_value any
---@param path string
local function assert_unchanged(old_value, new_value, path)
    if old_value ~= new_value then
        error(string.format("热更新不能修改数据字段 %s", path), 0)
    end
end

---@param state base.hotfix.PlanState
---@param old_table table
---@param new_table table
---@param path string
local function collect_table_patches(state, old_table, new_table, path)
    if old_table == new_table then
        return
    end

    local by_new_table = state.visited[old_table]
    if by_new_table then
        if by_new_table[new_table] then
            return
        end
    else
        by_new_table = {}
        state.visited[old_table] = by_new_table
    end
    by_new_table[new_table] = true

    -- 热修只修改兼容的 Bug 实现，任何导出结构变化都要求重启。
    for key, old_value in pairs(old_table) do
        local new_value = rawget(new_table, key)
        if new_value == nil then
            error(string.format("热更新不能删除字段 %s", field_path(path, key)), 0)
        end
    end

    for key, new_value in pairs(new_table) do
        local old_value = rawget(old_table, key)
        local path_for_key = field_path(path, key)
        if old_value == nil then
            error(string.format("热更新不能新增字段 %s", path_for_key), 0)
        end

        local new_type = type(new_value)
        if new_type ~= type(old_value) then
            error(string.format("热更新不能修改字段类型 %s", path_for_key), 0)
        end

        if new_type == "function" then
            if new_value ~= old_value then
                state.patches[#state.patches + 1] = {
                    table = old_table,
                    key = key,
                    value = new_value,
                }
            end
        elseif new_type == "table" then
            if new_value ~= old_value then
                collect_table_patches(state, old_value, new_value, path_for_key)
            end
        else
            assert_unchanged(old_value, new_value, path_for_key)
        end
    end

    local old_metatable = debug.getmetatable(old_table)
    local new_metatable = debug.getmetatable(new_table)
    if type(old_metatable) ~= type(new_metatable) then
        error(string.format("热更新不能修改元表类型 %s", path), 0)
    end
    if type(old_metatable) == "table" then
        collect_table_patches(state, old_metatable, new_metatable, path .. "<metatable>")
    end
end

---@param module_name string
---@return table
local function load_candidate(module_name)
    local file_path, search_error = package.searchpath(module_name, package.path)
    if not file_path then
        error(string.format("查找热更新模块 %s 失败: %s", module_name, tostring(search_error)), 0)
    end

    local chunk, load_error = loadfile(file_path, "bt")
    if not chunk then
        error(string.format("加载热更新模块 %s 失败: %s", module_name, tostring(load_error)), 0)
    end

    local ok, candidate = pcall(chunk, module_name, file_path)
    if not ok then
        error(string.format("执行热更新模块 %s 失败: %s", module_name, tostring(candidate)), 0)
    end
    if type(candidate) ~= "table" then
        error(string.format("热更新模块 %s 必须返回 table", module_name), 0)
    end
    return candidate
end

local function clear_code_cache()
    -- Skynet 默认按文件名缓存编译结果，必须先清理再读取新文件。
    local ok, codecache = pcall(require, "skynet.codecache")
    if ok then
        codecache.clear()
    end
end

---@param module_names string[]
---@return boolean
---@return string|nil
function hotfix.reload(module_names)
    if type(module_names) ~= "table" then
        return false, "热更新模块列表必须是 table"
    end

    local unique_names = {}
    for index, module_name in ipairs(module_names) do
        if type(module_name) ~= "string" or module_name == "" then
            return false, string.format("热更新模块列表第 %d 项必须是非空字符串", index)
        end
        if module_name == "base.hotfix" then
            return false, "base.hotfix 不能热更新自身，请重启服务"
        end
        unique_names[module_name] = true
    end

    local ordered_names = {}
    for module_name in pairs(unique_names) do
        if package.loaded[module_name] ~= nil then
            ordered_names[#ordered_names + 1] = module_name
        end
    end
    table.sort(ordered_names)
    if #ordered_names == 0 then
        return true
    end

    local ok, err = xpcall(function()
        clear_code_cache()

        ---@type table<string, table>
        local candidates = {}
        for _, module_name in ipairs(ordered_names) do
            candidates[module_name] = load_candidate(module_name)
        end

        local state = {
            patches = {},
            visited = {},
        }
        for _, module_name in ipairs(ordered_names) do
            local old_module = package.loaded[module_name]
            if type(old_module) ~= "table" then
                error(string.format("已加载模块 %s 的导出值不是 table", module_name), 0)
            end
            collect_table_patches(state, old_module, candidates[module_name], module_name)
        end

        -- 全部候选校验完成后再写回，避免跨模块出现部分更新。
        for _, patch in ipairs(state.patches) do
            rawset(patch.table, patch.key, patch.value)
        end
    end, debug.traceback)
    if not ok then
        return false, tostring(err)
    end
    return true
end

---@param command_name string?
function hotfix.install_debug_command(command_name)
    command_name = command_name or "HOTFIX"
    local skynet = require("skynet")
    local skynet_debug = require("skynet.debug")

    skynet_debug.reg_debugcmd(command_name, function(...)
        local module_names = { ... }
        local module_labels = {}
        for index, module_name in ipairs(module_names) do
            module_labels[index] = tostring(module_name)
        end
        local module_text = table.concat(module_labels, ",")
        local call_ok, reloaded, reload_error = pcall(hotfix.reload, module_names)
        if call_ok and reloaded then
            skynet.error(string.format("[hotfix] 模块热更新完成 modules=%s", module_text))
            skynet.ret(skynet.pack(true))
            return
        end

        local err = call_ok and reload_error or reloaded
        skynet.error(string.format(
            "[hotfix] 模块热更新失败 modules=%s error=%s",
            module_text,
            tostring(err)
        ))
        skynet.ret(skynet.pack(false, tostring(err)))
    end)
end

return hotfix
