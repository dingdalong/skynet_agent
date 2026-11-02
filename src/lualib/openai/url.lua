---@class openai.url.ParsedUrl
---@field scheme string
---@field host string
---@field port integer
---@field path string
---@field query? string
---@field authority string

local default_ports = {
    http = 80,
    https = 443,
}

local url = {}

---@param value string
---@return openai.url.ParsedUrl|nil
---@return string|nil
function url._parse(value)
    if type(value) ~= "string" then
        return nil, "URL 必须是字符串"
    end

    local scheme, remainder = value:match("^([%a][%w+.-]*)://(.*)$")
    if not scheme then
        return nil, "URL 缺少协议"
    end

    scheme = scheme:lower()
    if not default_ports[scheme] then
        return nil, "不支持的协议: " .. scheme
    end

    local authority, path_and_query = remainder:match("^([^/?#]*)(.*)$")
    -- 不解析 URL 凭据，避免 userinfo 被误写进 HTTP Host 头。
    if not authority or authority == "" or authority:find("@", 1, true) then
        return nil, "URL 的 host 无效"
    end

    local host
    local port
    local host_for_url
    local explicit_port = false

    if authority:sub(1, 1) == "[" then
        local port_text
        host, port_text = authority:match("^%[([^%]]+)%]:?(%d*)$")
        if not host then
            return nil, "URL 的 IPv6 host 无效"
        end
        if port_text ~= "" then
            port = tonumber(port_text)
            explicit_port = true
        end
        host_for_url = "[" .. host .. "]"
    else
        local port_text
        host, port_text = authority:match("^(.-):(%d+)$")
        if not host then
            if authority:find(":", 1, true) then
                return nil, "裸 IPv6 host 必须使用方括号"
            end
            host = authority
        else
            if host:find(":", 1, true) then
                return nil, "裸 IPv6 host 必须使用方括号"
            end
            port = tonumber(port_text)
            explicit_port = true
        end
        host_for_url = host
    end

    if not host or host == "" then
        return nil, "URL 的 host 无效"
    end
    if explicit_port and (not port or port < 1 or port > 65535) then
        return nil, "URL 的端口无效"
    end

    local path, query = path_and_query:match("^([^?]*)(.*)$")
    if path == "" then
        path = "/"
    end
    if query:sub(1, 1) == "?" then
        query = query:sub(2)
    else
        query = nil
    end

    port = port or default_ports[scheme]
    local authority_for_request = host_for_url
    if explicit_port then
        authority_for_request = authority_for_request .. ":" .. tostring(port)
    end

    return {
        scheme = scheme,
        host = host,
        port = port,
        path = path,
        query = query,
        authority = authority_for_request,
    }
end

---@param value any
---@return string
function url._escape(value)
    return (tostring(value):gsub("([^A-Za-z0-9_%.%-~])", function(character)
        return string.format("%%%02X", string.byte(character))
    end))
end

---@param value string
---@return openai.url.ParsedUrl|nil
---@return string|nil
function url.parse(value)
    return url._parse(value)
end

---@param value any
---@return string
function url.escape(value)
    return url._escape(value)
end

return url
