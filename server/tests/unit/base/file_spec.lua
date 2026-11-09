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
            assert.same({}, file.list_directories(directory))
        end)
    end)

    it("只返回第一层目录名称并按名称排序", function()
        with_temporary_directory(function(directory)
            assert(lfs.mkdir(directory .. "/zebra"))
            assert(lfs.mkdir(directory .. "/alpha"))
            assert(lfs.mkdir(directory .. "/alpha/deeper"))
            write_file(directory .. "/middle.lua", "普通文件")

            assert.same({ "alpha", "zebra" }, file.list_directories(directory))
        end)
    end)

    it("目录不存在时返回错误", function()
        local missing = os.tmpname()
        os.remove(missing)

        local filenames, err = file.list_files(missing)
        assert.is_nil(filenames)
        assert.is_not_nil(err)
        local directories, directory_error = file.list_directories(missing)
        assert.is_nil(directories)
        assert.is_string(directory_error)
        assert.is_not.equal("", directory_error)
    end)

    it("路径指向普通文件时返回读取错误", function()
        with_temporary_directory(function(directory)
            local path = directory .. "/plain.txt"
            write_file(path, "value")
            local directories, err = file.list_directories(path)
            assert.is_nil(directories)
            assert.is_string(err)
            assert.is_not.equal("", err)
        end)
    end)

    it("任一条目属性读取失败时返回错误，不接受不完整列表", function()
        with_temporary_directory(function(directory)
            write_file(directory .. "/value.lua", "value")
            assert(lfs.mkdir(directory .. "/visible"))
            local denied = directory .. "/denied"
            assert(lfs.mkdir(denied))
            local attributes = lfs.attributes
            lfs.attributes = function(path, ...)
                if path == denied then return nil, "权限错误" end
                return attributes(path, ...)
            end
            local ok, err = pcall(function()
                for _, name in ipairs({ "list_files", "list_directories" }) do
                    local entries, list_error = file[name](directory)
                    assert.is_nil(entries)
                    assert.is_string(list_error)
                    assert.is_not_nil(list_error:find("权限错误", 1, true))
                    assert.is_not_nil(list_error:find(denied, 1, true))
                end
            end)
            lfs.attributes = attributes
            if not ok then error(err, 0) end
        end)
    end)

    it("拒绝无效路径参数", function()
        assert.has_error(function()
            file.is_directory("")
        end, "文件路径必须是非空字符串")
        assert.has_error(function()
            file.list_files(nil)
        end, "目录路径必须是非空字符串")
        for _, invalid in ipairs({ "", false, 42 }) do
            assert.has_error(function()
                file.list_directories(invalid)
            end, "目录路径必须是非空字符串")
        end
        assert.has_error(function()
            file.list_directories(nil)
        end, "目录路径必须是非空字符串")
    end)
end)
