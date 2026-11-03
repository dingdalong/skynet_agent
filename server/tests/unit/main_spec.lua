local Scope = require("tests.support.modules")

describe("main", function()
    local scope, startup, instance, calls, events, config
    before_each(function()
        startup, calls, events = nil, {}, {}
        config = {
            protocol = { agent_gateway_schema_dir = "schema" },
            agent_gateway = { instance = { client = 2, logind = 1, websocket = 3 } },
        }
        scope = Scope.new({
            node = { init = function(callback) startup = callback end },
            ["helper.protobuf"] = { load = function(path) events[#events + 1] = { "schema", path } end },
            ["etc.cfg"] = config,
        })
        local next_address = 10
        instance = { launch = function(_, name, count, params, registered_name)
            events[#events + 1] = { "launch", name }
            calls[#calls + 1] = { name = name, count = count, params = params, registered_name = registered_name }
            local addresses = {}
            for index = 1, count do
                next_address = next_address + 1
                addresses[index] = next_address
            end
            return addresses
        end }
        dofile("src/main.lua")
    end)
    after_each(function() scope:restore() end)

    it("在节点启动回调中加载业务 schema 并按依赖启动服务", function()
        startup(instance)
        assert.same({ { "schema", "schema" }, { "launch", "client" }, { "launch", "logind" },
            { "launch", "websocket" }, { "launch", "gateway" } }, events)
        assert.same({
            { name = "client", count = 2 },
            { name = "logind", count = 1, params = { client_services = { 11, 12 } } },
            { name = "websocket", count = 3 },
            { name = "gateway", count = 1, params = { loginds = { 13 }, websockets = { 14, 15, 16 } },
                registered_name = ".gateway" },
        }, calls)
    end)
    it("服务数量由 main 的业务配置决定，包括空服务池", function()
        config.agent_gateway.instance = { client = 0, logind = 2, websocket = 0 }
        startup(instance)
        assert.same({
            { name = "client", count = 0 },
            { name = "logind", count = 2, params = { client_services = {} } },
            { name = "websocket", count = 0 },
            { name = "gateway", count = 1, params = { loginds = { 11, 12 }, websockets = {} },
                registered_name = ".gateway" },
        }, calls)
    end)
    it("业务 schema 加载异常交由节点启动流程处理", function()
        package.loaded["helper.protobuf"].load = function() error("schema failed", 0) end
        assert.has_error(function() startup(instance) end, "schema failed")
    end)
end)
