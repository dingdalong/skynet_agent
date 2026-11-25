local Arguments = {}
local scalar_types = { string = true, boolean = true, number = true, integer = true }

local function number(args, name, default, minimum, maximum)
    local value = args[name] == nil and default or args[name]
    assert(type(value) == "number" and value % 1 == 0 and value >= minimum and value <= maximum,
        "参数 " .. name .. " 必须为 " .. minimum .. " 到 " .. maximum .. " 的整数")
    return value
end

---在注册时核对模型描述，避免给模型提供无法执行的工具。
function Arguments.check_spec(spec, path)
    assert(type(spec) == "table" and spec.type == "function" and type(spec.name) == "string"
        and spec.name:match("%S") and type(spec.description) == "string" and spec.description:match("%S"),
        "工具描述无效: " .. path)
    local params = spec.parameters
    assert(type(params) == "table" and params.type == "object" and type(params.properties) == "table",
        "工具参数声明无效: " .. path)
    for name, property in pairs(params.properties) do
        assert(type(name) == "string" and type(property) == "table" and scalar_types[property.type],
            "工具参数类型无效: " .. path .. " " .. tostring(name))
    end
    if params.required ~= nil then
        assert(type(params.required) == "table", "工具必填参数声明无效: " .. path)
        local count = 0
        for index, name in pairs(params.required) do
            count = count + 1
            assert(math.type(index) == "integer" and index >= 1 and index <= #params.required
                and params.properties[name], "工具必填参数无效: " .. path .. " " .. tostring(name))
        end
        assert(count == #params.required, "工具必填参数列表不连续: " .. path)
    end
end

---@param tool table 已登记的工具模块
function Arguments.prepare(tool, args, root, config)
    assert(type(args) == "table", "工具参数必须是 JSON 对象")
    local spec = tool.spec
    for key, value in pairs(args) do
        local property = spec.parameters.properties[key]
        assert(property, "未知工具参数: " .. tostring(key))
        assert(type(value) == (property.type == "integer" and "number" or property.type), "参数类型无效: " .. key)
        if property.type == "integer" then assert(value % 1 == 0, "参数必须为整数: " .. key) end
        if type(value) == "string" then assert(not value:find("%z"), "参数不能包含 NUL") end
    end
    for _, key in ipairs(spec.parameters.required or {}) do assert(args[key] ~= nil, "缺少工具参数: " .. key) end
    local mode = args.sandbox_permissions or "use_default"
    assert(mode == "use_default" or mode == "require_escalated", "执行权限模式无效")
    if mode == "require_escalated" then
        assert(type(args.justification) == "string" and args.justification:match("%S"),
            "沙盒外执行必须说明原因")
    end
    local action = { name = spec.name, args = args, workspace = root, mode = mode }
    action.max_tokens = number(args, "max_output_tokens", 4000, 1, 16384)
    action.wait_ms = number(args, "yield_time_ms", tool.default_wait_ms or 10000, 1, 30000)
    if spec.parameters.properties.timeout_ms then
        action.timeout = number(args, "timeout_ms", config.timeout_ms, 1, config.timeout_ms)
    end
    return action
end

return Arguments
