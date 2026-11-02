local ltn12 = require("openai.ltn12")
local url = require("openai.url")

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

function module.install()
    package.loaded["ltn12"] = ltn12
    package.loaded["socket.url"] = url
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

---@param sink openai.ltn12.Sink
---@return integer|nil
---@return string|nil
local function write_sink(sink)
    local ok, err = sink(nil)
    if ok == nil then
        return nil, err or "HTTP response sink 结束失败"
    end
    return ok
end

---@param options openai.skynet_compat.RequestOptions
---@return integer|nil
---@return any
---@return table<string, string>|nil
function module.request(options)
    assert(type(options) == "table", "HTTP request options 必须是 table")
    assert(type(options.url) == "string" and options.url ~= "", "HTTP request URL 不能为空")
    assert(type(options.method) == "string" and options.method ~= "", "HTTP request method 不能为空")

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
    local httpc = require("http.httpc")

    local request_ok, stream = pcall(
        httpc.request_stream,
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

    local status = stream.status
    local response_headers = stream.header or {}
    local stream_ok, stream_error = xpcall(function()
        for chunk in stream do
            if chunk and chunk ~= "" and options.sink then
                local sink_ok, sink_error = options.sink(chunk)
                if sink_ok == nil then
                    error(sink_error or "HTTP response sink 写入失败", 0)
                end
            end
        end
        if options.sink then
            local final_ok, final_error = write_sink(options.sink)
            if final_ok == nil then
                error(final_error or "HTTP response sink 结束失败", 0)
            end
        end
    end, debug.traceback)

    pcall(stream.close, stream)
    if not stream_ok then
        return nil, "读取 Skynet HTTP 响应失败: " .. tostring(stream_error)
    end

    return 1, status, response_headers
end

return module
