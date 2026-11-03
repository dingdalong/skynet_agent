local class = require("class")

describe("class", function()
    it("通过调用 factory 创建稳定类表并调用 ctor", function()
        local Example = class()

        function Example:ctor(value)
            self.value = value
        end

        function Example:get_value()
            return self.value
        end

        local instance = Example:new("saved")

        assert.are.equal(Example, getmetatable(instance))
        assert.are.equal("saved", instance.value)
        assert.are.equal("saved", instance:get_value())
    end)

    it("所有类共享构造方法，避免热修后捕获候选类表", function()
        local First = class()
        local Second = class()

        assert.are.equal(First.new, Second.new)
    end)

    it("类未定义 ctor 时明确失败", function()
        local Invalid = class()
        local ok, err = pcall(Invalid.new, Invalid)

        assert.is_false(ok)
        assert.matches("class 必须定义 ctor", tostring(err))
    end)
end)
