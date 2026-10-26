local skynet = require("skynet")
local deepseek = require("openai.deepseek")

local INSTRUCTIONS = "你是一个简洁、可靠的中文助手。"
local INPUT = "请用一句话介绍你自己。"

local function fail(method, message)
    io.stderr:write(string.format("[main] %s 失败: %s\n", method, tostring(message)))
    io.stderr:flush()
    os.exit(1)
end

skynet.start(function()
    local api_key = os.getenv("DEEPSEEK_API_KEY")
    local base_url = os.getenv("DEEPSEEK_BASE_URL")

    if not api_key or api_key == "" then
        fail("读取配置", "DEEPSEEK_API_KEY 未设置")
    end
    if not base_url or base_url == "" then
        fail("读取配置", "DEEPSEEK_BASE_URL 未设置")
    end

    local ok, client_or_err = pcall(deepseek.new, api_key, {
        base_url = base_url,
    })
    if not ok then
        fail("创建客户端", client_or_err)
    end

    local wrote_text = false
    local final_response, request_error = client_or_err:stream_response(INPUT, {
        instructions = INSTRUCTIONS,
    }, function(delta)
        wrote_text = true
        io.stdout:write(delta)
        io.stdout:flush()
    end)

    if not final_response then
        fail("请求 Responses API", request_error)
    end
    if not wrote_text then
        fail("读取响应", "流式响应中没有文本内容")
    end

    io.stdout:write("\n")
    io.stdout:flush()
    --os.exit(0)
end)
