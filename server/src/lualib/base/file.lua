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
---@return string[]|nil
---@return string|nil
function M.list_files(directory)
    assert(type(directory) == "string" and directory ~= "", "目录路径必须是非空字符串")

    local ok, result = pcall(function()
        local filenames = {}
        for entry in lfs.dir(directory) do
            if entry ~= "." and entry ~= ".." then
                local path = directory .. "/" .. entry
                local attributes = lfs.attributes(path)
                if attributes and attributes.mode == "file" then
                    filenames[#filenames + 1] = entry
                end
            end
        end
        table.sort(filenames)
        return filenames
    end)
    if not ok then
        return nil, tostring(result)
    end
    return result
end

return M
