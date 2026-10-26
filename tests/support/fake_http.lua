local FakeHttp = {}
FakeHttp.__index = FakeHttp

function FakeHttp.new(config)
    return setmetatable({
        status = config.status or 200,
        headers = config.headers or {},
        chunks = config.chunks or {},
        read_error = config.read_error,
        requests = {},
        closed = false,
    }, FakeHttp)
end

function FakeHttp:read_source(source)
    if not source then
        return nil
    end

    local chunks = {}
    while true do
        local chunk, err = source()
        if err then
            error(err)
        end
        if chunk == nil then
            break
        end
        chunks[#chunks + 1] = chunk
    end
    return table.concat(chunks)
end

function FakeHttp:request(options)
    self.request_options = options
    self.request_body = self:read_source(options.source)
    for _, chunk in ipairs(self.chunks) do
        options.sink(chunk)
    end
    options.sink(nil)
    return 1, self.status, self.headers
end

function FakeHttp:as_provider()
    return {
        request = function(options)
            return self:request(options)
        end,
    }
end

function FakeHttp:as_httpc()
    return {
        request_stream = function(...)
            return self:request_stream(...)
        end,
    }
end

function FakeHttp:request_stream(method, target, path, recv_headers, headers, body)
    self.requests[#self.requests + 1] = {
        method = method,
        target = target,
        path = path,
        recv_headers = recv_headers,
        headers = headers,
        body = body,
    }

    local index = 1
    local stream = {
        status = self.status,
        header = self.headers,
    }

    function stream:close()
        self.closed = true
        self.owner.closed = true
    end

    stream.owner = self
    setmetatable(stream, {
        __call = function(current_stream)
            if current_stream.closed then
                return nil
            end
            if self.read_error then
                error(self.read_error)
            end

            local chunk = self.chunks[index]
            index = index + 1
            if chunk == nil then
                return nil
            end
            return chunk, current_stream
        end,
    })

    return stream
end

return FakeHttp
