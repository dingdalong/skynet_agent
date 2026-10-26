local parse_url = require("socket.url").parse
local cjson = require("cjson")

local Provider = {}
Provider.__index = Provider

local function read_source(source)
    if not source then
        return nil
    end

    local chunks = {}
    while true do
        local chunk, err = source()
        if err then
            return nil, err
        end
        if chunk == nil then
            break
        end
        chunks[#chunks + 1] = chunk
    end
    return table.concat(chunks)
end

function Provider:request(options)
    assert(type(options) == "table", "HTTP request options 必须是 table")

    local parsed, parse_error = parse_url(options.url)
    if not parsed then
        return nil, parse_error
    end

    local body, source_error = read_source(options.source)
    if source_error then
        return nil, "读取请求体失败: " .. tostring(source_error)
    end

    local headers = {}
    for name, value in pairs(options.headers or {}) do
        local lower_name = name:lower()
        if lower_name ~= "content-length" and lower_name ~= "host" then
            headers[name] = value
        end
    end
    headers.Host = parsed.authority
    if body then
        local decoded_ok, decoded = pcall(cjson.decode, body)
        if decoded_ok and type(decoded) == "table" and decoded.stream == true then
            headers.Accept = "text/event-stream"
        end
    end

    local path = parsed.path
    if parsed.query then
        path = path .. "?" .. parsed.query
    end
    local target = parsed.scheme .. "://" .. parsed.authority

    local ok, stream = pcall(
        self.httpc.request_stream,
        options.method,
        target,
        path,
        nil,
        headers,
        body
    )
    if not ok then
        return nil, stream
    end
    if not stream then
        return nil, "Skynet httpc 没有返回响应流"
    end

    local status = stream.status
    local response_headers = stream.header or {}
    local stream_ok, stream_error = xpcall(function()
        for chunk in stream do
            if chunk and chunk ~= "" and options.sink then
                options.sink(chunk)
            end
        end
        if options.sink then
            options.sink(nil)
        end
    end, debug.traceback)

    pcall(stream.close, stream)
    if not stream_ok then
        return nil, stream_error
    end

    return 1, status, response_headers
end

local module = {}

function module.new(httpc)
    assert(type(httpc) == "table", "httpc 必须是 table")
    return setmetatable({
        httpc = httpc,
    }, Provider)
end

function module.request(options)
    return module.new(require("http.httpc")):request(options)
end

return module
