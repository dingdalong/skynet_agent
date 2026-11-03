---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

describe("table 扩展", function()
    it("重复预加载保留标准库和扩展，原有方法仍可使用", function()
        local library, copy, sort = table, table.copy, table.sort
        dofile("src/lualib/base/preload.lua")
        dofile("src/lualib/base/preload.lua")
        luassert.are.equal(library, table)
        luassert.are.equal(copy, table.copy)
        luassert.are.equal(sort, table.sort)
        local values = table.copy({ 3, 1, 2 })
        table.sort(values)
        luassert.are.equal("1,2,3", table.concat(values, ","))
        luassert.same(table.pack(1, 2, 3), table.pack(table.unpack(values)))
    end)

    it("浅拷贝隔离第一层键值并共享嵌套值", function()
        local nested = { value = 1 }
        local source = {
            name = "source",
            nested = nested,
        }

        local copied = table.copy(source)

        luassert.are_not.equal(source, copied)
        luassert.are.equal("source", copied.name)
        luassert.are.equal(nested, copied.nested)
        copied.name = "copied"
        luassert.are.equal("source", source.name)
    end)

    it("深拷贝递归复制值并保留循环引用", function()
        local source = {
            nested = { value = 1 },
        }
        source.self = source
        source.nested.parent = source.nested

        local copied = table.deep_copy(source)

        luassert.are_not.equal(source, copied)
        luassert.are_not.equal(source.nested, copied.nested)
        luassert.are.equal(1, copied.nested.value)
        luassert.are.equal(copied, copied.self)
        luassert.are.equal(copied.nested, copied.nested.parent)
        copied.nested.value = 2
        luassert.are.equal(1, source.nested.value)
    end)

    it("深拷贝原样返回非 table 值", function()
        luassert.are.equal("value", table.deep_copy("value"))
        luassert.are.equal(42, table.deep_copy(42))
        luassert.is_nil(table.deep_copy(nil))
    end)

    it("复制时不保留源 table 的 metatable", function()
        local source = setmetatable({ value = 1 }, {})

        luassert.is_nil(getmetatable(table.copy(source)))
        luassert.is_nil(getmetatable(table.deep_copy(source)))
    end)

    it("浅拷贝拒绝非 table 参数", function()
        luassert.has_error(function()
            ---@diagnostic disable-next-line: param-type-mismatch
            table.copy(nil)
        end, "table copy 的 source 必须是 table")
    end)
end)
