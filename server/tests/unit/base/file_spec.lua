local file = require("file")
local lfs = require("lfs")

---@return string
local function temporary_directory()
    local path = os.tmpname()
    os.remove(path)
    assert(lfs.mkdir(path))
    return path
end

---@param path string
---@param content string
local function write_file(path, content)
    local handle = assert(io.open(path, "wb"))
    assert(handle:write(content))
    handle:close()
end

---@param directory string
local function remove_tree(directory)
    for entry in lfs.dir(directory) do
        if entry ~= "." and entry ~= ".." then
            local path = directory .. "/" .. entry
            local attributes = assert(lfs.attributes(path))
            if attributes.mode == "directory" then
                remove_tree(path)
            else
                assert(os.remove(path))
            end
        end
    end
    assert(lfs.rmdir(directory))
end

---@param callback fun(directory: string)
local function with_temporary_directory(callback)
    local directory = temporary_directory()
    local ok, callback_error = pcall(callback, directory)
    remove_tree(directory)
    if not ok then
        error(callback_error, 0)
    end
end

describe("file", function()
    it("判断目录和普通文件", function()
        with_temporary_directory(function(directory)
            local file_path = directory .. "/value.txt"
            write_file(file_path, "value")

            assert.is_true(file.is_directory(directory))
            assert.is_false(file.is_file(directory))
            assert.is_true(file.is_file(file_path))
            assert.is_false(file.is_directory(file_path))
            assert.is_false(file.is_file(directory .. "/missing"))
            assert.is_false(file.is_directory(directory .. "/missing"))
        end)
    end)

    it("拒绝无效路径参数", function()
        for _, check in ipairs({ file.is_directory, file.is_file }) do
            assert.has_error(function() check("") end, "文件路径必须是非空字符串")
            assert.has_error(function() check(nil) end, "文件路径必须是非空字符串")
        end
    end)
end)
