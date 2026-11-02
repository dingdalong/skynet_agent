local hotfix = require("base.hotfix")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local fixture_root = "tests/fixtures/hotfix/"
local original_package_path = package.path
local original_skynet = package.loaded.skynet
local original_skynet_debug = package.loaded["skynet.debug"]
local original_skynet_codecache = package.loaded["skynet.codecache"]
local fixture_modules = {
    "stateful_fixture",
    "added_method_fixture",
    "independent_fixture",
    "invalid_fixture",
    "data_change_fixture",
    "removed_method_fixture",
}

---@param version string
local function use_fixture_version(version)
    package.path = fixture_root .. version .. "/?.lua;" .. original_package_path
end

---@param module_name string
---@return table
local function load_fixture(module_name)
    package.loaded[module_name] = nil
    return require(module_name)
end

local function clear_fixture_modules()
    for _, module_name in ipairs(fixture_modules) do
        package.loaded[module_name] = nil
    end
end

describe("base.hotfix", function()
    before_each(function()
        clear_fixture_modules()
        use_fixture_version("v1")
    end)

    after_each(function()
        clear_fixture_modules()
        package.path = original_package_path
        package.loaded.skynet = original_skynet
        package.loaded["skynet.debug"] = original_skynet_debug
        package.loaded["skynet.codecache"] = original_skynet_codecache
    end)

    it("原位替换方法并保留已有对象的数据和类表身份", function()
        local module = load_fixture("stateful_fixture")
        local object_class = module.Object
        local object = module.new("saved")

        use_fixture_version("v2")
        local ok, err = hotfix.reload({ "stateful_fixture" })

        luassert.is_nil(err)
        luassert.is_true(ok)
        luassert.are.equal(module, package.loaded.stateful_fixture)
        luassert.are.equal(object_class, module.Object)
        luassert.are.equal("saved", object.value)
        luassert.are.equal("new", object:get_value())
        luassert.are.equal("new-call:value", object_class("value"))
    end)

    it("执行中的旧方法在恢复后继续旧实现，下一次调用使用新方法", function()
        local module = load_fixture("stateful_fixture")
        local object = module.new("saved")
        local old_call = coroutine.create(function()
            return object:get_after_wait()
        end)

        local resumed, waiting = coroutine.resume(old_call)
        luassert.is_true(resumed)
        luassert.are.equal("waiting", waiting)

        use_fixture_version("v2")
        luassert.is_true(hotfix.reload({ "stateful_fixture" }))

        resumed, waiting = coroutine.resume(old_call)
        luassert.is_true(resumed)
        luassert.are.equal("old-after-wait", waiting)

        local new_call = coroutine.create(function()
            return object:get_after_wait()
        end)
        resumed, waiting = coroutine.resume(new_call)
        luassert.is_true(resumed)
        luassert.are.equal("waiting", waiting)
        resumed, waiting = coroutine.resume(new_call)
        luassert.is_true(resumed)
        luassert.are.equal("new-after-wait", waiting)
    end)

    it("拒绝新增公开方法", function()
        local module = load_fixture("added_method_fixture")
        use_fixture_version("v2")

        local ok, err = hotfix.reload({ "added_method_fixture" })

        luassert.is_false(ok)
        luassert.matches("不能新增字段", assert(err))
        luassert.are.equal("old", module.get_value())
    end)

    it("拒绝删除公开方法", function()
        local module = load_fixture("removed_method_fixture")
        use_fixture_version("v2")

        local ok, err = hotfix.reload({ "removed_method_fixture" })

        luassert.is_false(ok)
        luassert.matches("不能删除字段", assert(err))
        luassert.are.equal("old", module.get_value())
        luassert.are.equal("old-removed", module.removed_method())
    end)

    it("任一模块校验失败时整批不更新", function()
        local independent_module = load_fixture("independent_fixture")
        load_fixture("added_method_fixture")
        use_fixture_version("v2")

        local ok = hotfix.reload({
            "independent_fixture",
            "added_method_fixture",
        })

        luassert.is_false(ok)
        luassert.are.equal("old", independent_module.get_value())
    end)

    it("语法错误时不更新已有方法", function()
        local module = load_fixture("invalid_fixture")
        local invalid_path = assert(os.tmpname())
        local invalid_file = assert(io.open(invalid_path, "wb"))
        invalid_file:write("local module = {\n")
        invalid_file:close()
        package.path = invalid_path .. ";" .. original_package_path

        local ok, err = hotfix.reload({ "invalid_fixture" })
        os.remove(invalid_path)

        luassert.is_false(ok)
        luassert.matches("加载热更新模块", assert(err))
        luassert.are.equal("old", module.get_value())
    end)

    it("拒绝通过热更新修改模块数据字段", function()
        local module = load_fixture("data_change_fixture")
        use_fixture_version("v2")

        local ok, err = hotfix.reload({ "data_change_fixture" })

        luassert.is_false(ok)
        luassert.matches("不能修改数据字段", assert(err))
        luassert.are.equal("old", module.label)
        luassert.are.equal("old", module.get_value())
    end)

    it("跳过尚未加载的模块", function()
        package.loaded.not_loaded_fixture = nil

        luassert.is_true(hotfix.reload({ "not_loaded_fixture" }))
    end)

    it("拒绝无效模块列表", function()
        local ok, err = hotfix.reload("stateful_fixture")
        luassert.is_false(ok)
        luassert.matches("必须是 table", assert(err))

        ok, err = hotfix.reload({ "" })
        luassert.is_false(ok)
        luassert.matches("必须是非空字符串", assert(err))

        ok, err = hotfix.reload({ "base.hotfix" })
        luassert.is_false(ok)
        luassert.matches("不能热更新自身", assert(err))
    end)

    it("调试命令返回热修结果", function()
        local command_name
        local command_handler
        local packed_result
        package.loaded.skynet = {
            error = function()
            end,
            pack = table.pack,
            ret = function(value)
                packed_result = value
            end,
        }
        package.loaded["skynet.debug"] = {
            reg_debugcmd = function(name, handler)
                command_name = name
                command_handler = handler
            end,
        }
        hotfix.install_debug_command()
        luassert.are.equal("HOTFIX", command_name)

        load_fixture("stateful_fixture")
        use_fixture_version("v2")
        command_handler("stateful_fixture")
        luassert.is_true(packed_result[1])

        command_handler("")
        luassert.is_false(packed_result[1])
        luassert.matches("必须是非空字符串", tostring(packed_result[2]))
    end)

    it("加载候选模块前清理代码缓存", function()
        local clear_count = 0
        package.loaded["skynet.codecache"] = {
            clear = function()
                clear_count = clear_count + 1
            end,
        }
        load_fixture("stateful_fixture")
        use_fixture_version("v2")

        luassert.is_true(hotfix.reload({ "stateful_fixture" }))
        luassert.are.equal(1, clear_count)
    end)
end)
