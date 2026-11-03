local cjson = require("cjson")
local class = require("class")

local MODULE_NAME = "openai.sse"

---@class openai.sse.Event
---@field type? string
---@field delta? string
---@field response? table
---@field error? string|table
---@field message? string

---@class openai.sse.Parser
---@field on_event fun(event: openai.sse.Event)
---@field buffer string
---@field data_lines string[]
---@field event_name string?
---@field finished boolean

local sse = {
    Parser = class(),
}

---@param parser openai.sse.Parser
local function dispatch(parser)
    if #parser.data_lines == 0 then
        parser.event_name = nil
        return
    end

    local data = table.concat(parser.data_lines, "\n")
    parser.data_lines = {}

    if data ~= "[DONE]" then
        local ok, event = pcall(cjson.decode, data)
        if not ok then
            error("SSE data 不是合法 JSON: " .. tostring(event), 0)
        end
        if type(event) ~= "table" then
            error("SSE data 必须是 JSON 对象", 0)
        end
        if event.type == nil and parser.event_name then
            event.type = parser.event_name
        end
        parser.on_event(event)
    end
    -- SSE 的 [DONE] 只表示传输结束，不是 Responses API 的业务事件。
    parser.event_name = nil
end

---@param parser openai.sse.Parser
---@param line string
local function process_line(parser, line)
    if line == "" then
        -- 空行表示一个完整 SSE 事件已经到齐。
        dispatch(parser)
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
        parser.data_lines[#parser.data_lines + 1] = value
    elseif field == "event" then
        parser.event_name = value
    end
end

---@param parser openai.sse.Parser
local function consume_lines(parser)
    -- CR 和 LF 可能分处两个网络 chunk，行尾不完整时留到下一次 feed 再处理。
    while #parser.buffer > 0 do
        local line_end = parser.buffer:find("[\r\n]")
        if not line_end then
            return
        end
        if parser.buffer:sub(line_end, line_end) == "\r" and line_end == #parser.buffer then
            return
        end

        local line = parser.buffer:sub(1, line_end - 1)
        local next_position = line_end + 1
        if parser.buffer:sub(line_end, line_end) == "\r"
            and parser.buffer:sub(line_end + 1, line_end + 1) == "\n" then
            next_position = line_end + 2
        end
        parser.buffer = parser.buffer:sub(next_position)
        process_line(parser, line)
    end
end

---@param chunk string?
---@param err string?
---@return string?
function sse.Parser:feed(chunk, err)
    if err then
        error("SSE 流读取失败: " .. tostring(err), 0)
    end
    if self.finished then
        return chunk
    end
    if chunk then
        self.buffer = self.buffer .. chunk
        consume_lines(self)
    else
        self.finished = true
        if self.buffer:sub(-1) == "\r" then
            self.buffer = self.buffer:sub(1, -2)
        end
        if self.buffer ~= "" then
            process_line(self, self.buffer)
            self.buffer = ""
        end
        dispatch(self)
    end
    return chunk
end

---@param on_event fun(event: openai.sse.Event)
function sse.Parser:ctor(on_event)
    assert(type(on_event) == "function", "on_event 必须是函数")
    self.on_event = on_event
    self.buffer = ""
    self.data_lines = {}
    self.event_name = nil
    self.finished = false
end

---@param on_event fun(event: openai.sse.Event)
---@return openai.ltn12.Filter
function sse.create_stream_filter(on_event)
    local loaded = package.loaded[MODULE_NAME]
    assert(type(loaded) == "table", "openai.sse 尚未加载")
    local parser = loaded.Parser:new(on_event)
    return function(chunk, err)
        return parser:feed(chunk, err)
    end
end

return sse
