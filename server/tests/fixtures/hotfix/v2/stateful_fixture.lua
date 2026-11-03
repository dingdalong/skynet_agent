local Object = setmetatable({}, {
    __call = function(_, value)
        return "new-call:" .. value
    end,
})
Object.__index = Object

function Object:get_value()
    return "new"
end

function Object:get_after_wait()
    coroutine.yield("waiting")
    return "new-after-wait"
end

local module = {
    Object = Object,
}

function module.new(value)
    return setmetatable({
        value = value,
    }, Object)
end

return module
