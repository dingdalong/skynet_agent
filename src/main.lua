local skynet = require("skynet")

local openai = require("openai")

local INSTRUCTIONS = "你是一个简洁、可靠的中文助手。"
local FIRST_INPUT = "请记住：项目使用的脚本语言是 Lua。"
local SECOND_INPUT = "刚才说项目使用的脚本语言是什么？只回答语言名称。"

---@param method string
---@param message any
local function fail(method, message)
    io.stderr:write(string.format("[main] %s 失败: %s\n", method, tostring(message)))
    io.stderr:flush()
    os.exit(1)
end

---@param status integer|string|nil
---@param body any
---@return string
local function http_error_message(status, body)
    local detail
    if type(body) == "table" then
        local api_error = body.error
        if type(api_error) == "table" then
            detail = api_error.message or api_error.code
        elseif type(api_error) == "string" then
            detail = api_error
        else
            detail = body.message
        end
    end
    if not detail and body ~= nil then
        detail = tostring(body)
    end
    return string.format("DeepSeek HTTP %s: %s", tostring(status), detail or "未知错误")
end

---@param event openai.sse.Event
---@return string
local function terminal_error(event)
    local response = event.response or {}
    if event.type == "response.incomplete" then
        local details = response.incomplete_details or {}
        return "DeepSeek 响应未完成: " .. tostring(details.reason or response.status or "未知原因")
    end
    if event.type == "response.failed" then
        local api_error = response.error
        local detail = api_error
        if type(api_error) == "table" then
            detail = api_error.message or api_error.code
        end
        return "DeepSeek 响应失败: " .. tostring(detail or response.status or "未知错误")
    end

    ---@type string|table|nil
    local detail = event.message
    if not detail and type(event.error) == "table" then
        detail = event.error.message or event.error.code
    elseif not detail then
        detail = event.error
    end
    return "DeepSeek 返回错误事件: " .. tostring(detail or "未知错误")
end

---@param client openai.OpenAI
---@param input table[]
---@return string|nil
---@return string|nil
local function stream_turn(client, input)
    local text_parts = {}
    local completed_response
    local request_terminal_error

    ---@param event openai.sse.Event
    local function on_event(event)
        if event.type == "response.output_text.delta" then
            local delta = event.delta
            if type(delta) == "string" and delta ~= "" then
                text_parts[#text_parts + 1] = delta
                io.stdout:write(delta)
                io.stdout:flush()
            end
        elseif event.type == "response.completed" then
            completed_response = event.response
        elseif event.type == "response.incomplete"
            or event.type == "response.failed"
            or event.type == "error" then
            request_terminal_error = terminal_error(event)
        end
    end

    local ok, status, body = pcall(client.create_response, client, input, {
        stream = true,
    }, on_event)
    if not ok then
        return nil, "DeepSeek 请求失败: " .. tostring(status)
    end
    if status ~= 200 then
        return nil, http_error_message(status, body)
    end
    if request_terminal_error then
        return nil, request_terminal_error
    end
    if type(completed_response) ~= "table" then
        return nil, "SSE 流在 response.completed 前结束"
    end

    local assistant_text = table.concat(text_parts)
    if assistant_text == "" then
        return nil, "流式响应中没有文本内容"
    end
    return assistant_text
end

-- 两轮请求都携带完整本地历史，DeepSeek 不需要 previous_response_id。
skynet.start(function()
    local api_key = os.getenv("DEEPSEEK_API_KEY")
    local base_url = os.getenv("DEEPSEEK_BASE_URL")
    local model = os.getenv("DEEPSEEK_MODEL")

    if not api_key or api_key == "" then
        fail("读取配置", "DEEPSEEK_API_KEY 未设置")
    end
    if not base_url or base_url == "" then
        fail("读取配置", "DEEPSEEK_BASE_URL 未设置")
    end
    if not model or model == "" then
        fail("读取配置", "DEEPSEEK_MODEL 未设置")
    end
    ---@cast api_key string
    ---@cast base_url string
    ---@cast model string

    base_url = base_url:gsub("/+$", "")
    local client = openai.new(api_key, {
        http_provider = "openai.skynet_http",
    })
    client.api_base = base_url
    client.default_model = model
    skynet.error(string.format(
        "[main] DeepSeek 客户端初始化完成 base_url=%s model=%s http_provider=openai.skynet_http",
        base_url,
        model
    ))

    local input = {
        {role = "system", content = INSTRUCTIONS},
        {role = "user", content = FIRST_INPUT},
    }
    local first_text, first_error = stream_turn(client, input)
    if not first_text then
        fail("请求第一轮 Responses API", first_error)
    end
    io.stdout:write("\n")
    io.stdout:flush()

    ---@cast first_text string
    input[#input + 1] = {role = "assistant", content = first_text}
    input[#input + 1] = {role = "user", content = SECOND_INPUT}

    local second_text, second_error = stream_turn(client, input)
    if not second_text then
        fail("请求第二轮 Responses API", second_error)
    end
    io.stdout:write("\n")
    io.stdout:flush()

    -- main 是一次性演示服务，两轮完成后直接结束整个 Skynet 进程并返回成功状态。
    os.exit(0)
end)
