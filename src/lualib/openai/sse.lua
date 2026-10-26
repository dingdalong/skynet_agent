local cjson = require("cjson")

local function new_parser(on_event)
    assert(type(on_event) == "function", "on_event 必须是函数")

    local buffer = ""
    local data_lines = {}
    local event_name
    local finished = false

    local function dispatch()
        if #data_lines == 0 then
            event_name = nil
            return
        end

        local data = table.concat(data_lines, "\n")
        data_lines = {}

        if data ~= "[DONE]" then
            local ok, event = pcall(cjson.decode, data)
            if not ok then
                error("SSE data 不是合法 JSON: " .. tostring(event), 0)
            end
            if type(event) ~= "table" then
                error("SSE data 必须是 JSON 对象", 0)
            end
            if event.type == nil and event_name then
                event.type = event_name
            end
            on_event(event)
        end
        event_name = nil
    end

    local function process_line(line)
        if line == "" then
            dispatch()
            return
        end
        if line:sub(1, 1) == ":" then
            return
        end

        local field, value = line:match("^([^:]+):(.*)$")
        if not field then
            field = line
            value = ""
        end
        if value:sub(1, 1) == " " then
            value = value:sub(2)
        end

        if field == "data" then
            data_lines[#data_lines + 1] = value
        elseif field == "event" then
            event_name = value
        end
    end

    local function consume_lines()
        while #buffer > 0 do
            local line_end = buffer:find("[\r\n]")
            if not line_end then
                return
            end
            if buffer:sub(line_end, line_end) == "\r" and line_end == #buffer then
                return
            end

            local line = buffer:sub(1, line_end - 1)
            local next_position = line_end + 1
            if buffer:sub(line_end, line_end) == "\r"
                and buffer:sub(line_end + 1, line_end + 1) == "\n" then
                next_position = line_end + 2
            end
            buffer = buffer:sub(next_position)
            process_line(line)
        end
    end

    local parser = {}

    function parser:feed(chunk, err)
        if err then
            error("SSE 流读取失败: " .. tostring(err), 0)
        end
        if finished then
            return chunk
        end
        if chunk then
            buffer = buffer .. chunk
            consume_lines()
        else
            finished = true
            if buffer:sub(-1) == "\r" then
                buffer = buffer:sub(1, -2)
            end
            if buffer ~= "" then
                process_line(buffer)
                buffer = ""
            end
            dispatch()
        end
        return chunk
    end

    return parser
end

local function create_stream_filter(on_event)
    local parser = new_parser(on_event)
    return function(chunk, err)
        return parser:feed(chunk, err)
    end
end

return {
    new_parser = new_parser,
    create_stream_filter = create_stream_filter,
}
