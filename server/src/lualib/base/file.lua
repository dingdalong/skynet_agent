local lfs = require("lfs")

local M = {}

---@param path string
---@param mode string
---@return boolean
local function has_mode(path, mode)
    assert(type(path) == "string" and path ~= "", "文件路径必须是非空字符串")
    local attributes = lfs.attributes(path)
    return attributes ~= nil and attributes.mode == mode
end

---@param path string
---@return boolean
function M.is_directory(path)
    return has_mode(path, "directory")
end

---@param path string
---@return boolean
function M.is_file(path)
    return has_mode(path, "file")
end

---@param directory string
---@param mode string
---@return string[]|nil
---@return string|nil
local function list_entries(directory, mode)
    assert(type(directory) == "string" and directory ~= "", "目录路径必须是非空字符串")

    local ok, result = pcall(function()
        local entries = {}
        for entry in lfs.dir(directory) do
            if entry ~= "." and entry ~= ".." then
                local path = directory .. "/" .. entry
                local attributes, attribute_error = lfs.attributes(path)
                assert(attributes, "读取目录条目属性失败 path=" .. path .. ": " .. tostring(attribute_error))
                if attributes.mode == mode then
                    entries[#entries + 1] = entry
                end
            end
        end
        table.sort(entries)
        return entries
    end)
    if not ok then
        return nil, tostring(result)
    end
    return result
end

---@param directory string
---@return string[]|nil
---@return string|nil
function M.list_files(directory)
    return list_entries(directory, "file")
end

---@param directory string
---@return string[]|nil
---@return string|nil
function M.list_directories(directory)
    return list_entries(directory, "directory")
end

return M
