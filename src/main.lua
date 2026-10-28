local skynet = require("skynet")

local deepseek = require("llm.deepseek")

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

---@param delta string
local function write_text_delta(delta)
    io.stdout:write(delta)
    io.stdout:flush()
end

---@param provider llm.Provider
---@param input llm.Message[]
---@return string|nil
---@return string|nil
local function stream_turn(provider, input)
    local assistant_text, request_error = provider:stream_response(input, write_text_delta)
    if not assistant_text then
        return nil, request_error
    end
    io.stdout:write("\n")
    io.stdout:flush()
    return assistant_text
end

-- 当前 DeepSeek Provider 不使用 previous_response_id；两轮请求通过完整本地历史衔接。
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

    local ok, provider_or_error = pcall(deepseek.new, {
        api_key = api_key,
        base_url = base_url,
        model = model,
    })
    if not ok then
        fail("创建 DeepSeek Provider", provider_or_error)
    end
    ---@cast provider_or_error llm.Provider
    local provider = provider_or_error

    skynet.error(string.format(
        "[main] LLM Provider 初始化完成 provider=%s base_url=%s model=%s",
        provider.name,
        base_url,
        model
    ))

    local input = {
        { role = "system", content = INSTRUCTIONS },
        { role = "user", content = FIRST_INPUT },
    }
    local first_text, first_error = stream_turn(provider, input)
    if not first_text then
        fail("请求第一轮 Responses API", first_error)
    end
    ---@cast first_text string
    input[#input + 1] = { role = "assistant", content = first_text }
    input[#input + 1] = { role = "user", content = SECOND_INPUT }

    local second_text, second_error = stream_turn(provider, input)
    if not second_text then
        fail("请求第二轮 Responses API", second_error)
    end

    -- main 是一次性演示服务，两轮完成后直接结束整个 Skynet 进程并返回成功状态。
    os.exit(0)
end)
