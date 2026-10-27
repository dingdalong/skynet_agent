-- lua-openai 只依赖 ltn12 的 source/sink 链，保留最小兼容实现即可避免引入 LuaSocket。
---@alias ltn12.Source fun(): string?, string?
---@alias ltn12.Filter fun(chunk: string?, err: string?): string?, string?
---@alias ltn12.Sink fun(chunk: string?, err: string?): integer?, string?

local source = {}
local sink = {}

---@param value string
---@return ltn12.Source
function source.string(value)
    local sent = false
    return function()
        if sent then
            return nil
        end
        sent = true
        return value
    end
end

---@param target string[]
---@return ltn12.Sink
function sink.table(target)
    return function(chunk, err)
        if err then
            return nil, err
        end
        if chunk then
            target[#target + 1] = chunk
        end
        return 1
    end
end

---@param filter ltn12.Filter
---@param final_sink ltn12.Sink
---@return ltn12.Sink
function sink.chain(filter, final_sink)
    return function(chunk, err)
        local filtered, filter_error = filter(chunk, err)
        if filter_error then
            return nil, filter_error
        end
        return final_sink(filtered, filter_error)
    end
end

return {
    source = source,
    sink = sink,
}
