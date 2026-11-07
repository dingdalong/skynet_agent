local username = require("helper.username")

describe("用户名", function()
    it("去除首尾 ASCII 空白、区分大小写并按 Unicode 字符计数", function()
        assert.are.equal("用户", username.normalize(" \t用户\n"))
        assert.are.equal("Alice", username.normalize("Alice"))
        assert.are.equal("alice", username.normalize("alice"))
        assert.are.equal(string.rep("😀", 32), username.normalize(string.rep("😀", 32)))
    end)
    it("拒绝空名、超长、控制字符与无效 UTF-8", function()
        for _, name in ipairs({ "", " \n", string.rep("😀", 33), "a\nb", "a\0b", "\255" }) do
            assert.is_nil(username.normalize(name))
        end
        assert.is_nil(username.normalize(nil))
        assert.is_nil(username.normalize({}))
    end)
end)
