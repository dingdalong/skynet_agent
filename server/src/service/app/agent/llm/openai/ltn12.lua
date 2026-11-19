---@alias agent.llm.openai.ltn12.Source fun(): string?, string?
---@alias agent.llm.openai.ltn12.Filter fun(chunk: string?, err: string?): string?, string?
---@alias agent.llm.openai.ltn12.Sink fun(chunk: string?, err: string?): integer?, string?

local source = {}
local sink = {}

---@param value string
---@return agent.llm.openai.ltn12.Source
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
---@return agent.llm.openai.ltn12.Sink
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

---@param filter agent.llm.openai.ltn12.Filter
---@param final_sink agent.llm.openai.ltn12.Sink
---@return agent.llm.openai.ltn12.Sink
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
