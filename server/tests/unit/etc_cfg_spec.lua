local loader = require("etc.cfg.loader")

---@param value any
---@return any
local function deep_copy(value)
    if type(value) ~= "table" then
        return value
    end
    local copied = {}
    for key, item in pairs(value) do
        copied[key] = deep_copy(item)
    end
    return copied
end

---@return table
local function common_config()
    return {
        worker_thread = 8,
        runtime = {
            control_port = 18000,
        },
        protocol = {
            agent_gateway_schema_dir = "../common/proto",
        },
        agent_gateway = {
            socket = {
                host = "127.0.0.1",
                path = "/agent",
            },
            login_timeout_ticks = 1000,
        },
        agent = {
            system_prompt = "测试系统提示",
            max_message_length = 20000,
            session_title_length = 24,
            llm = {
                api_key = "test-api-key",
                request_timeout_ticks = 12000,
            },
        },
    }
end

---@return table
local function channel_config()
    return {
        agent_gateway = {
            socket = {
                port = 18791,
            },
            instance = {
                client = 2,
                logind = 2,
                websocket = 2,
            },
        },
        agent = {
            llm = {
                base_url = "http://127.0.0.1:18792",
                model = "e2e-test-model",
            },
        },
    }
end

---@param build fun(common: table, channel: table, name: string)
---@param mutate fun(common: table, channel: table)
---@param expected string
local function assert_build_error(build, mutate, expected)
    local common = common_config()
    local channel = channel_config()
    mutate(common, channel)
    local ok, err = pcall(build, common, channel, "test")
    assert.is_false(ok)
    assert.matches(expected, tostring(err))
end

describe("etc.cfg", function()
    local original_skynet

    before_each(function()
        original_skynet = package.loaded.skynet
        package.loaded.skynet = {
            getenv = function(name)
                if name == "thread" then
                    return "8"
                end
            end,
        }
        package.loaded["etc.cfg.common"] = nil
        package.loaded["etc.cfg.channel.test"] = nil
    end)

    after_each(function()
        package.loaded.skynet = original_skynet
        package.loaded["etc.cfg.common"] = nil
        package.loaded["etc.cfg.channel.test"] = nil
    end)

    it("加载测试渠道并覆盖公共配置", function()
        local config = loader.build(
            common_config(),
            require("etc.cfg.channel.test"),
            "test"
        )

        assert.are.equal("test", config.channel)
        assert.are.equal(8, config.worker_thread)
        assert.are.equal("127.0.0.1", config.agent_gateway.socket.host)
        assert.are.equal(18791, config.agent_gateway.socket.port)
        assert.are.equal(2, config.agent_gateway.instance.client)
        assert.are.equal(2, config.agent_gateway.instance.logind)
        assert.are.equal(2, config.agent_gateway.instance.websocket)
        assert.are.equal("test-api-key", config.agent.llm.api_key)
        assert.are.equal("e2e-test-model", config.agent.llm.model)
    end)

    it("允许未配置 API Key", function()
        local common = common_config()
        local channel = channel_config()
        common.agent.llm.api_key = nil

        local config = loader.build(common, channel, "test")

        assert.is_nil(config.agent.llm.api_key)
    end)

    it("未覆盖实例数时使用 Skynet 工作线程数", function()
        local common = common_config()
        local channel = channel_config()
        channel.agent_gateway.instance = nil

        local config = loader.build(common, channel, "test")

        assert.are.equal(8, config.agent_gateway.instance.client)
        assert.are.equal(8, config.agent_gateway.instance.logind)
        assert.are.equal(8, config.agent_gateway.instance.websocket)
    end)

    it("渠道配置不能覆盖 Skynet 工作线程数", function()
        local common = common_config()
        local channel = channel_config()
        channel.worker_thread = 2

        local config = loader.build(common, channel, "test")

        assert.are.equal(8, config.worker_thread)
    end)

    it("深度合并时不修改公共配置和渠道配置", function()
        local common = common_config()
        local channel = channel_config()
        local original_common = deep_copy(common)
        local original_channel = deep_copy(channel)

        loader.build(common, channel, "test")

        assert.are.same(original_common, common)
        assert.are.same(original_channel, channel)
    end)

    it("拒绝无效的工作线程数和实例数", function()
        assert_build_error(loader.build, function(common)
            common.worker_thread = 0
        end, "worker_thread")
        assert_build_error(loader.build, function(_, channel)
            channel.agent_gateway.instance.client = 33
        end, "agent_gateway.instance.client")
        assert_build_error(loader.build, function(_, channel)
            channel.agent_gateway.instance.logind = 0
        end, "agent_gateway.instance.logind")
        assert_build_error(loader.build, function(_, channel)
            channel.agent_gateway.instance.websocket = 1.5
        end, "agent_gateway.instance.websocket")
    end)

    it("拒绝无效的监听配置", function()
        assert_build_error(loader.build, function(common)
            common.agent_gateway.socket = "127.0.0.1:18791"
        end, "agent_gateway.socket")
        assert_build_error(loader.build, function(_, channel)
            channel.agent_gateway.socket.port = 0
        end, "agent_gateway.socket.port")
        assert_build_error(loader.build, function(_, channel)
            channel.agent_gateway.socket.path = "agent"
        end, "agent_gateway.socket.path")
        assert_build_error(loader.build, function(common)
            common.agent_gateway.login_timeout_ticks = 0
        end, "agent_gateway.login_timeout_ticks")
    end)

    it("拒绝无效的 Agent 配置", function()
        assert_build_error(loader.build, function(common)
            common.agent.system_prompt = ""
        end, "agent.system_prompt")
        assert_build_error(loader.build, function(common)
            common.agent.max_message_length = 0
        end, "agent.max_message_length")
        assert_build_error(loader.build, function(common)
            common.agent.session_title_length = 0
        end, "agent.session_title_length")
        assert_build_error(loader.build, function(_, channel)
            channel.agent.llm.base_url = ""
        end, "agent.llm.base_url")
        assert_build_error(loader.build, function(_, channel)
            channel.agent.llm.model = ""
        end, "agent.llm.model")
        assert_build_error(loader.build, function(common)
            common.agent.llm.api_key = ""
        end, "agent.llm.api_key")
    end)
end)
