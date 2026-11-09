local FakeLlm = require("tests.support.fake_llm")
local lfs = require("lfs")
local filesystem = require("agent_filesystem")
local Patch = require("agent.tools.apply_patch")
local workspace = require("agent.workspace")
local rules = require("agent.permission.rules")
local Scope = require("tests.support.modules")

describe("Agent 工作区与补丁", function()
    local root
    before_each(function()
        root = os.tmpname()
        os.remove(root)
        workspace.mkdir(root)
        root = assert(filesystem.realpath(root))
    end)
    after_each(function()
        local function remove(path)
            if lfs.symlinkattributes(path, "mode") == "directory" then
                for name in lfs.dir(path) do if name ~= "." and name ~= ".." then remove(path .. "/" .. name) end end
                assert(lfs.rmdir(path))
            else assert(os.remove(path)) end
        end
        remove(root)
    end)
    local function read(path)
        local file = assert(io.open(path, "rb"))
        local text = file:read("a")
        file:close()
        return text
    end

    it("用户名和会话路径隔离，目录跨大小写及分隔符不冲突", function()
        local a = workspace.create(root, "a/../b", "session-a")
        local b = workspace.create(root, "A/../b", "session-a")
        assert.is_true(workspace.inside(a, root))
        assert.are_not.equal(a:lower(), b:lower())
        assert.is_true(workspace.inside(a .. "/x", a))
        assert.is_false(workspace.inside(a .. "-other", a))
    end)

    it("支持多文件增改移动删除与 CRLF 保留", function()
        filesystem.atomic_write(root .. "/first", "a\r\nb\r\n", true)
        local result = Patch.apply("*** Begin Patch\n*** Update File: first\n*** Move to: moved\n@@\n a\n-b\n+c\n"
            .. "*** Add File: added\n+新增文件\n*** End Patch\n", root)
        assert.is_true(result.ok)
        assert.are.equal("a\r\nc\r\n", read(root .. "/moved"))
        assert.are.equal("新增文件\n", read(root .. "/added"))
        result = Patch.apply("*** Begin Patch\n*** Delete File: moved\n*** Delete File: added\n*** End Patch", root)
        assert.is_true(result.ok)
        assert.are.equal(2, #result.changed_files)
    end)

    it("整批预检先于写入，冲突不产生前面文件", function()
        local result = Patch.apply("*** Begin Patch\n*** Add File: first\n+hello\n"
            .. "*** Update File: missing\n@@\n-old\n+new\n*** End Patch", root)
        assert.is_false(result.ok)
        assert.is_nil(lfs.attributes(root .. "/first"))
        assert.are.equal(0, #result.changed_files)
    end)

    it("拒绝越界、重复路径及覆盖新增文件", function()
        for _, text in ipairs({
            "*** Begin Patch\n*** Add File: ../outside\n+no\n*** End Patch",
            "*** Begin Patch\n*** Add File: a\n+one\n*** Add File: a\n+two\n*** End Patch",
        }) do assert.is_false(Patch.apply(text, root).ok) end
        filesystem.atomic_write(root .. "/a", "original", true)
        assert.is_false(Patch.apply("*** Begin Patch\n*** Add File: a\n+overwrite\n*** End Patch", root).ok)
        assert.are.equal("original", read(root .. "/a"))
    end)

    it("原生落盘拒绝符号链接且新增不会覆盖", function()
        filesystem.atomic_write(root .. "/a", "original", true)
        assert(lfs.link(root .. "/a", root .. "/link", true))
        assert.has_error(function() filesystem.atomic_write(root .. "/link", "bad", false) end)
        assert.has_error(function() filesystem.atomic_write(root .. "/a", "bad", true) end)
        assert.are.equal("original", read(root .. "/a"))
    end)

    it("沙盒外补丁也必须显式声明权限模式", function()
        local nested = workspace.create(root, "user", "session-a")
        local text = "*** Begin Patch\n*** Add File: " .. root .. "/allowed\n+outside\n*** End Patch"
        assert.is_false(Patch.apply(text, nested).ok)
        assert.is_true(Patch.apply(text, nested, "require_escalated").ok)
    end)
end)

describe("Agent 权限判断", function()
    local templates
    before_each(function()
        templates = require("agent.prompts").load_templates()
    end)

    for _, enabled in ipairs({ true, false }) do
        it("规则通过后一律调用 LLM，rules_enabled=" .. tostring(enabled), function()
            local calls = 0
            local arguments = '{ "cmd": "printf hello", "tty": false }'
            local scope = Scope.new({ ["agent.executor"] = false,
                log = { info = function() end, failure = function() end },
                ["agent.process"] = { new = function() return {} end },
                ["agent.permission.llm_judge"] = { new = function(_, _, _, prompt_templates)
                    assert.are.equal(templates, prompt_templates)
                    return { decide = function(_, action)
                        calls = calls + 1
                        assert.are.equal(arguments, action.arguments)
                        return false, "LLM 拒绝"
                    end }
                end }, skynet = {} })
            local executor = require("agent.executor"):new({ workspace = "/", tools = { timeout_ms = 300000 },
                permission = { rules_enabled = enabled }, prompt_templates = templates }, {})
            local result = executor:execute({ name = "exec_command", arguments = arguments },
                {}, { cancelled = false }, { output = "" })
            scope:restore()
            assert.are.equal(1, calls)
            assert.is_false(result.ok)
            assert.are.equal("LLM 拒绝", result.error)
        end)
    end

    it("规则阻止时不调用 LLM 或启动进程", function()
        local scope = Scope.new({ ["agent.executor"] = false,
                log = { info = function() end, failure = function() end },
            ["agent.process"] = { new = function() return {} end },
            ["agent.permission.llm_judge"] = { new = function()
                return { decide = function() error("规则阻止后不能调用模型") end }
            end }, skynet = {} })
        local executor = require("agent.executor"):new({ workspace = "/", tools = { timeout_ms = 300000 },
            permission = { rules_enabled = true }, prompt_templates = templates }, {})
        local result = executor:execute({ name = "exec_command", arguments = '{"cmd":"reboot now"}' },
            {}, { cancelled = false }, { output = "" })
        scope:restore()
        assert.is_false(result.ok)
        assert.matches("禁止命令规则", result.error)
    end)

    it("规则只有阻止与继续，支持停用", function()
        local action = { name = "exec_command", args = { cmd = "reboot now" } }
        assert.is_false(rules.check(action, { rules_enabled = true }))
        assert.is_true(rules.check(action, { rules_enabled = false }))
        assert.is_true(rules.check({ name = "exec_command", args = { cmd = "printf hello" } },
            { rules_enabled = true }))
    end)

    it("权限提示保留历史前缀、内容块和完整执行范围，原始参数只追加", function()
        local captured = {}
        local fake_llm, scope = FakeLlm.new({ ["agent.permission.llm_judge"] = false })
        fake_llm.response_handler = function(_, input)
            assert.are.equal("system", input[1].role)
            assert.are.equal("user", input[2].role)
            captured[#captured + 1] = input[2].content
            return '{"decision":"allow","reason":"任务已授权"}'
        end
        local arguments = [[{ "tty": false, "cmd": "printf \"中文\"\n" }]]
        local action = { name = "exec_command", arguments = arguments, workspace = "/workspace",
            cwd = "/workspace/sub", mode = "require_escalated", paths = { "/workspace/a", "/workspace/b" },
            launch_argv = { "/bin/bash", "-c", 'printf "中文"\n' }, timeout = 1000,
            wait_ms = 100, max_tokens = 4000 }
        local history = {
            { role = "system", source = "app", content = "原始规则" },
            { role = "user", source = "project", content = "项目规则" },
            { role = "user", source = "user", content = "第一行\n引号\"和反斜线\\" },
            { type = "reasoning", content = { { type = "reasoning_text", text = "思考正文" } },
                summary = { { type = "summary_text", text = "思考摘要" } } },
            { role = "assistant", content = { { type = "output_text", text = "助手正文" },
                { type = "refusal", refusal = "拒绝正文" } } },
            { type = "function_call", call_id = "call-1", name = "exec_command", arguments = arguments },
            { type = "function_call_output", call_id = "call-1", output = '{"output":"已执行"}' },
        }
        local original = table.deep_copy(history)
        local judge = require("agent.permission.llm_judge"):new({ model = "main" }, { timeout_ticks = 10 }, templates)
        local context = { user_input = "当前任务", history = history }
        assert.is_true(judge:decide(action, context, require("agent.run"):new()))
        assert.are.same(original, history)
        local history_end = assert(captured[1]:find("当前用户目标:\n", 1, true)) - 1
        history[#history + 1] = { role = "user", source = "user", content = "追加消息" }
        assert.is_true(judge:decide(action, context, require("agent.run"):new()))
        assert.are.equal(captured[1]:sub(1, history_end), captured[2]:sub(1, history_end))
        for _, text in ipairs({ "source:\napp\n", "source:\nproject\n", "source:\nuser\n", "项目规则",
            "第一行\n引号\"和反斜线\\", "思考正文", "思考摘要", "助手正文",
            "拒绝正文", "call-1", '{"output":"已执行"}', "工作区:\n/workspace\n",
            "实际工作目录:\n/workspace/sub\n", "权限模式:\nrequire_escalated\n",
            "目标路径:\n/workspace/a\n", "目标路径:\n/workspace/b\n",
            "已有进程参数:\n/bin/bash\n", '已有进程参数:\nprintf "中文"\n\n',
            "执行超时毫秒:\n1000\n", "等待毫秒:\n100\n", "输出 token 上限:\n4000\n" }) do
            assert.is_not_nil(captured[1]:find(text, 1, true), text)
        end
        assert.are.equal(arguments .. "\n", captured[2]:sub(-#arguments - 1))
        -- 同样的字段以不同顺序写入 table，提示文本保持不变。
        history[#history] = { content = "追加消息", source = "user", role = "user" }
        assert.is_true(judge:decide(action, context, require("agent.run"):new()))
        assert.are.equal(captured[2], captured[3])
        scope:restore()
    end)

    for _, scenario in ipairs({ "allow", "deny", "invalid", "error", "cancelled" }) do
        it("独立模型判断: " .. scenario, function()
            local run = require("agent.run"):new()
            local fake_llm, scope = FakeLlm.new({ ["agent.permission.llm_judge"] = false })
            fake_llm.response_handler = function(client, _, _, options)
                assert.is_nil(options.tools)
                assert.are.equal(client.current_request, run.permission_request)
                if scenario == "error" then return nil, "HTTP timeout" end
                if scenario == "invalid" then return "allow everything" end
                if scenario == "cancelled" then run.cancelled = true end
                return '{"decision":"' .. (scenario == "allow" and "allow" or "deny")
                    .. '","reason":"判断原因"}'
            end
            local judge = require("agent.permission.llm_judge"):new({ model = "main" },
                { timeout_ticks = 10 }, templates)
            local allowed, reason = judge:decide({ name = "exec_command" }, { user_input = "任务" }, run)
            scope:restore()
            assert.are.equal(scenario == "allow", allowed)
            assert.is_string(reason)
            assert.is_nil(run.permission_request)
        end)
    end
end)
