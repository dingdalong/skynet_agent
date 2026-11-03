local class = require("class")
local skynet = require("skynet")

local Worker = class()
Worker.commands = {
    echo = "echo",
    wait = "wait",
    failure = "failure",
    version = "version",
    prepare_update = "prepare_update",
}

function Worker:ctor()
    self.value = 0
end

function Worker:echo(context, ...)
    local values = table.deep_copy(table.pack(context.source, ...))
    return table.unpack(values, 1, values.n)
end

function Worker:wait(_, ticks)
    skynet.sleep(ticks)
    self.value = self.value + 1
    return self.value
end

function Worker:failure()
    error("test failure")
end

function Worker:version()
    return "v1", self.value,
        tostring(getmetatable(self)), getmetatable(self) == require("runtime_worker")
end

function Worker:prepare_update()
    package.path = "tests/fixtures/runtime/v2/service/?/?.lua;" .. package.path
    return true
end

return Worker
