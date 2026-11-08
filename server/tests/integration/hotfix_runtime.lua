local skynet = require("skynet")
local hotfix = require("hotfix")

skynet.start(function()
    local ok, err = xpcall(function()
        local fixture = require("stateful_fixture")
        local object_class = fixture.Object
        local object = fixture.new("saved")
        local class_fixture = require("class_fixture")
        local first_class_object = class_fixture:new("first")

        package.path = "tests/fixtures/hotfix/v2/?.lua;" .. package.path
        local reloaded, reload_error =
            hotfix.reload({ "stateful_fixture", "class_fixture" })
        assert(reloaded, reload_error)
        assert(package.loaded.stateful_fixture == fixture)
        assert(fixture.Object == object_class)
        assert(object.value == "saved")
        assert(object:get_value() == "new")
        assert(object_class("value") == "new-call:value")
        assert(package.loaded.class_fixture == class_fixture)
        assert(first_class_object:get_value() == "v2:first")
        local second_class_object = class_fixture:new("second")
        assert(getmetatable(second_class_object) == class_fixture)
        assert(second_class_object.created_by == "v2")
        assert(second_class_object:get_value() == "v2:second")

        package.path = "tests/fixtures/hotfix/v3/?.lua;" .. package.path
        reloaded, reload_error = hotfix.reload({ "class_fixture" })
        assert(reloaded, reload_error)
        assert(first_class_object:get_value() == "v3:first")
        assert(second_class_object:get_value() == "v3:second")
        local third_class_object = class_fixture:new("third")
        assert(getmetatable(third_class_object) == class_fixture)
        assert(third_class_object.created_by == "v3")
        assert(third_class_object:get_value() == "v3:third")

        local Base = require("agent.llm.base")
        local Client, Request = Base.Client, Base.Request
        local config = { api_key = "hotfix-probe", base_url = "https://llm.example.com", model = "probe" }
        local model = Base:new(config, "main")
        local client = Client:new(config)
        local request = Request:new()
        model.client, client.current_request = client, request
        model.sequence = 7
        for _ = 1, 2 do
            local previous_stream, previous_http, previous_cancel = Base.stream, Client.get_http, Request.cancel
            reloaded, reload_error = hotfix.reload({ "agent.llm.base" })
            assert(reloaded, reload_error)
            assert(package.loaded["agent.llm.base"] == Base)
            assert(Base.Client == Client and Base.Request == Request)
            assert(getmetatable(model) == Base and getmetatable(client) == Client)
            assert(getmetatable(request) == Request)
            assert(model.client == client and client.current_request == request)
            assert(model.sequence == 7 and not request.cancelled)
            assert(Base.stream ~= previous_stream and Client.get_http ~= previous_http)
            assert(Request.cancel ~= previous_cancel)
            local next_model = Base:new(config, "permission")
            assert(getmetatable(next_model) == Base and next_model.purpose == "permission")
            assert(getmetatable(Base.Client:new(config)) == Client)
            assert(getmetatable(Base.Request:new()) == Request)
            assert(client.create_response == require("openai").OpenAI.__base.create_response)
        end
        assert(request:cancel() and request.cancelled)
        client.current_request = nil
        assert(type(client:get_http().request) == "function")
    end, debug.traceback)

    if ok then
        io.stderr:write("HOTFIX_RUNTIME_OK\n")
    else
        io.stderr:write("HOTFIX_RUNTIME_FAILED: " .. tostring(err) .. "\n")
    end
    io.stderr:flush()
    os.exit(ok and 0 or 1)
end)
