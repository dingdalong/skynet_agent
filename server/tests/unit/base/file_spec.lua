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

    it("只返回第一层普通文件并按名称排序", function()
        with_temporary_directory(function(directory)
            write_file(directory .. "/b.proto", "b")
            write_file(directory .. "/a.txt", "a")
            write_file(directory .. "/c.lua", "c")
            assert(lfs.mkdir(directory .. "/nested"))
            write_file(directory .. "/nested/ignored.proto", "ignored")

            assert.same({
                "a.txt",
                "b.proto",
                "c.lua",
            }, file.list_files(directory))
        end)
    end)

    it("空目录返回空列表", function()
        with_temporary_directory(function(directory)
            assert.same({}, file.list_files(directory))
        end)
    end)

    it("目录不存在时返回错误", function()
        local missing = os.tmpname()
        os.remove(missing)

        local filenames, err = file.list_files(missing)
        assert.is_nil(filenames)
        assert.is_not_nil(err)
    end)

    it("拒绝无效路径参数", function()
        assert.has_error(function()
            file.is_directory("")
        end, "文件路径必须是非空字符串")
        assert.has_error(function()
            file.list_files(nil)
        end, "目录路径必须是非空字符串")
    end)
end)
