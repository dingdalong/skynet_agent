local skynet = require("skynet")
local hotfix = require("base.hotfix")

skynet.start(function()
    local ok, err = xpcall(function()
        local fixture = require("stateful_fixture")
        local object_class = fixture.Object
        local object = fixture.new("saved")

        package.path = "tests/fixtures/hotfix/v2/?.lua;" .. package.path
        local reloaded, reload_error = hotfix.reload({ "stateful_fixture" })
        assert(reloaded, reload_error)
        assert(package.loaded.stateful_fixture == fixture)
        assert(fixture.Object == object_class)
        assert(object.value == "saved")
        assert(object:get_value() == "new")
        assert(object_class("value") == "new-call:value")
    end, debug.traceback)

    if ok then
        io.stderr:write("HOTFIX_RUNTIME_OK\n")
    else
        io.stderr:write("HOTFIX_RUNTIME_FAILED: " .. tostring(err) .. "\n")
    end
    io.stderr:flush()
    os.exit(ok and 0 or 1)
end)
