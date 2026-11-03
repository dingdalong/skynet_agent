local class = require("class")
local skynet = require("skynet")

local Worker = class()
Worker.commands = { open = "open" }

function Worker:ctor()
    self.mode = "normal"
end

function Worker:init(params)
    self.mode = params.mode or os.getenv("SHUTDOWN_TEST_MODE") or "normal"
    self.observer = params.observer
    if not params.loginds and (self.mode == "startup_slow" or self.mode == "startup_wait") then
        io.stderr:write("SHUTDOWN_FIXTURE_INIT_WAITING\n")
        io.stderr:flush()
        if self.mode == "startup_wait" then
            while true do skynet.sleep(1000) end
        end
        skynet.sleep(350)
        io.stderr:write("SHUTDOWN_FIXTURE_INIT_FINISHED\n")
        io.stderr:flush()
    end
end

function Worker:open()
    skynet.send(self.observer, "lua", "login_started")
    skynet.sleep(3)
    return {}
end

function Worker:close()
    if self.mode == "failure" then
        error("SHUTDOWN_FIXTURE_CLOSE_FAILED")
    end
    if self.mode == "slow_close" then
        skynet.sleep(350)
    end
    if self.mode == "closing_wait" then
        io.stderr:write("SHUTDOWN_FIXTURE_CLOSE_WAITING\n")
        io.stderr:flush()
        while true do skynet.sleep(1000) end
    end
    skynet.error("SHUTDOWN_FIXTURE_CLOSED " .. self.mode)
end

return Worker
