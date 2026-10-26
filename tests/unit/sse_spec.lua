local cjson = require("cjson")
local sse = require("openai.sse")
---@type luassert
---@diagnostic disable-next-line: assign-type-mismatch
local luassert = assert

local function event_data(event)
    return "data: " .. cjson.encode(event) .. "\n\n"
end

describe("openai.sse", function()
    it("处理跨 chunk、CRLF 和连续事件", function()
        local events = {}
        local filter = sse.create_stream_filter(function(event)
            events[#events + 1] = event
        end)

        filter(": keep-alive\r\ndata: " .. cjson.encode({ type = "first", value = "你" }):sub(1, 12))
        filter(cjson.encode({ type = "first", value = "你" }):sub(13) .. "\r\n\r")
        filter("\ndata: " .. cjson.encode({ type = "second" }) .. "\r\n\r\n")
        filter(nil)

        luassert.are.same({
            { type = "first", value = "你" },
            { type = "second" },
        }, events)
    end)

    it("拼接多行 data 并在 EOF 派发未闭合事件", function()
        local events = {}
        local filter = sse.create_stream_filter(function(event)
            events[#events + 1] = event
        end)

        filter('data: {"type":"delta",\ndata: "delta":"A"}')
        filter(nil)

        luassert.are.same({
            { type = "delta", delta = "A" },
        }, events)
    end)

    it("使用 event 字段补全缺失的事件类型", function()
        local event
        local filter = sse.create_stream_filter(function(value)
            event = value
        end)

        filter("event: response.completed\ndata: {}\n\n")

        luassert.are.same({ type = "response.completed" }, event)
    end)

    it("忽略注释、未知字段和 [DONE]", function()
        local events = {}
        local filter = sse.create_stream_filter(function(event)
            events[#events + 1] = event
        end)

        filter(": comment\nid: 1\ndata: [DONE]\n\n")
        filter(nil)

        luassert.are.same({}, events)
    end)

    it("非法 JSON 会终止解析", function()
        local filter = sse.create_stream_filter(function()
        end)

        local ok, err = pcall(filter, "data: {invalid}\n\n")
        luassert.is_false(ok)
        luassert.matches("SSE data 不是合法 JSON", assert(err))
    end)

    it("可解析 completed 事件的常用载荷", function()
        local completed
        local filter = sse.create_stream_filter(function(event)
            completed = event
        end)

        filter(event_data({
            type = "response.completed",
            response = {
                id = "resp_1",
                status = "completed",
            },
        }))
        filter(nil)

        luassert.are.equal("resp_1", completed.response.id)
    end)
end)
