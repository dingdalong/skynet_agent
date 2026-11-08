local ltn12 = require("openai.ltn12")
local url = require("openai.url")
local httpc = require("http.httpc")
local skynet = require("skynet")

---@alias openai.skynet_compat.Headers table<string, string|number>

---@class openai.skynet_compat.RequestOptions
---@field url string
---@field method string
---@field headers? openai.skynet_compat.Headers
---@field source? openai.ltn12.Source
---@field sink? openai.ltn12.Sink

---@class openai.skynet_compat.ResponseStream
---@field status integer
---@field header? table<string, string>
---@field close fun(self: openai.skynet_compat.ResponseStream)

local module = {}

---@param timeout_ticks integer?
function module.install(timeout_ticks)
    httpc.timeout = timeout_ticks or 12000
    package.loaded["ltn12"] = ltn12
    package.loaded["socket.url"] = url
end

---@param timeout_ticks integer?
---@return table
function module.new_http_client(timeout_ticks)
    -- httpc captures its timeout through a module upvalue. A request-local module
    -- keeps independent Agent and permission deadlines without changing Skynet.
    local path = assert(package.searchpath("http.httpc", package.path))
    local client = assert(loadfile(path))()
    client.timeout = timeout_ticks or 12000
    return client
end

---@param source openai.ltn12.Source?
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

---@param headers openai.skynet_compat.Headers?
---@return openai.skynet_compat.Headers
local function request_headers(headers)
    local result = {}
    for name, value in pairs(headers or {}) do
        local lower_name = name:lower()
        -- Host 和 Content-Length 必须由 Skynet 根据实际请求重算。
        if lower_name ~= "host" and lower_name ~= "content-length" then
            result[name] = value
        end
    end
    return result
end

---@param options openai.skynet_compat.RequestOptions
---@param request llm.Request?
---@return integer|nil
---@return any
---@return table<string, string>|nil
function module.request(options, request, client)
    assert(type(options) == "table", "HTTP request options 必须是 table")
    assert(type(options.url) == "string" and options.url ~= "", "HTTP request URL 不能为空")
    assert(type(options.method) == "string" and options.method ~= "", "HTTP request method 不能为空")
    if request and request.cancelled then
        return nil, "用户已取消生成"
    end

    local parsed, parse_error = url.parse(options.url)
    if not parsed then
        return nil, "解析 HTTP URL 失败: " .. tostring(parse_error)
    end

    local body, source_error = read_source(options.source)
    if source_error then
        return nil, "读取 HTTP 请求体失败: " .. tostring(source_error)
    end
    local headers = request_headers(options.headers)
    headers.Host = parsed.authority

    local path = parsed.path
    if parsed.query then
        path = path .. "?" .. parsed.query
    end
    local target = parsed.scheme .. "://" .. parsed.authority
    client = client or httpc
    local deadline = skynet.now() + (client.timeout or 12000)
    local request_ok, stream = pcall(
        client.request_stream,
        options.method,
        target,
        path,
        nil,
        headers,
        body
    )
    if not request_ok then
        return nil, "Skynet HTTP 请求失败: " .. tostring(stream)
    end
    if not stream then
        return nil, "Skynet HTTP 没有返回响应流"
    end

    -- request_stream 仅限制响应头等待；流读取使用同一个总截止时间。
    -- 请求内装饰 close，先置位再调用，防止定时器与读取协程同时释放 socket。
    local original_close = stream.close
    local closed = false
    local close_error
    local timed_out = false
    function stream:close()
        if close_error then
            error(close_error, 0)
        end
        if not closed then
            closed = true
            local ok, err = pcall(original_close, self)
            if not ok then
                close_error = err
                error(err, 0)
            end
        end
    end
    if request then
        request.stream = stream
    end
    skynet.timeout(math.max(1, deadline - skynet.now()), function()
        if not closed then
            timed_out = true
            pcall(stream.close, stream)
        end
    end)

    local status = stream.status
    local response_headers = stream.header or {}
    local stream_ok, stream_error = xpcall(function()
        if request and request.cancelled then
            return
        end
        for chunk in stream do
            if request and request.cancelled then
                break
            end
            if chunk and chunk ~= "" and options.sink then
                local sink_ok, sink_error = options.sink(chunk)
                if sink_ok == nil then
                    error(sink_error or "HTTP response sink 写入失败", 0)
                end
            end
        end
        if options.sink then
            local final_ok, final_error = options.sink(nil)
            if final_ok == nil then
                error(final_error or "HTTP response sink 结束失败", 0)
            end
        end
    end, debug.traceback)

    local close_ok, close_err = pcall(stream.close, stream)
    if request and not close_ok then
        request.close_error = tostring(close_err)
    end
    if request and request.stream == stream then
        request.stream = nil
    end
    if request and request.cancelled then
        return nil, "用户已取消生成"
    end
    if not close_ok then
        return nil, "关闭 HTTP 响应流失败: " .. tostring(close_err)
    end
    if timed_out then
        return nil, "LLM 请求超时"
    end
    if not stream_ok then
        return nil, "读取 Skynet HTTP 响应失败: " .. tostring(stream_error)
    end

    return 1, status, response_headers
end

return module
