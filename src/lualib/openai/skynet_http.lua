local parse_url = require("socket.url").parse
local cjson = require("cjson")

---@alias openai.skynet_http.Headers table<string, string|number>

---@class openai.skynet_http.RequestOptions
---@field url string
---@field method string
---@field headers? openai.skynet_http.Headers
---@field source? ltn12.Source
---@field sink? ltn12.Sink

---@class openai.skynet_http.ResponseStream
---@field status integer
---@field header? table<string, string>
---@field close fun(self: openai.skynet_http.ResponseStream)

---@class openai.skynet_http.Httpc
---@field request_stream fun(self: openai.skynet_http.Httpc, method: string, target: string, path: string, recv_headers: openai.skynet_http.Headers?, headers: openai.skynet_http.Headers, body: string?): openai.skynet_http.ResponseStream|nil

---@class openai.skynet_http.Provider
---@field httpc openai.skynet_http.Httpc
---@field request fun(self: openai.skynet_http.Provider, options: openai.skynet_http.RequestOptions): integer?, any, table<string, string>|nil

local Provider = {}
Provider.__index = Provider

---@param source ltn12.Source?
---@return string|nil
---@return string|nil
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

---@param options openai.skynet_http.RequestOptions
---@return 1|nil status_code
---@return any status_or_error 成功时为 HTTP 状态码，失败时为错误字符串
---@return table<string, string>|nil headers
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
        -- Host 和 Content-Length 由 Skynet httpc 根据实际请求重算。
        if lower_name ~= "content-length" and lower_name ~= "host" then
            headers[name] = value
        end
    end
    headers.Host = parsed.authority
    if body then
        local decoded_ok, decoded = pcall(cjson.decode, body)
        -- SSE 请求必须显式声明 Accept，否则部分网关会缓冲完整响应。
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

---@param httpc openai.skynet_http.Httpc
---@return openai.skynet_http.Provider
function module.new(httpc)
    assert(type(httpc) == "table", "httpc 必须是 table")
    return setmetatable({
        httpc = httpc,
    }, Provider)
end

---@param options openai.skynet_http.RequestOptions
---@return 1|nil status_code
---@return any status_or_error 成功时为 HTTP 状态码，失败时为错误字符串
---@return table<string, string>|nil headers
function module.request(options)
    -- 默认 Provider 直接复用 Skynet 自带的 httpc，不引入 LuaSocket。
    return module.new(require("http.httpc")):request(options)
end

return module
