local Loader = {}

---@class server.RuntimeConfig
---@field control_port integer
---@field executable_search_path string

---@class server.Config
---@field runtime server.RuntimeConfig
---@field channel string
---@field worker_thread integer
---@field protocol { agent_gateway_schema_dir: string }
---@field agent_gateway server.AgentGatewayConfig
---@field agent server.AgentConfig

---@class server.SocketConfig
---@field host string
---@field port integer
---@field path string

---@class server.AgentGatewayConfig
---@field socket server.SocketConfig
---@field instance { client: integer, logind: integer, websocket: integer }
---@field login_timeout_ticks integer

---@class server.AgentConfig
---@field project_instructions_max_bytes integer
---@field max_message_length integer
---@field session_title_length integer
---@field default_model_id string
---@field models {id: string, name: string, model: string}[]
---@field tools agent.ToolConfig
---@field permission agent.PermissionConfig
---@field llm { api_key: string?, base_url: string, model: string, request_timeout_ticks: integer }

---@param target table
---@param source table
local function merge(target, source)
    for key, value in pairs(source) do
        if type(value) == "table" and type(target[key]) == "table" then
            merge(target[key], value)
        else
            target[key] = table.deep_copy(value)
        end
    end
end

---@param value any
---@param field string
---@param minimum integer
---@param maximum integer?
---@return integer
local function integer_field(value, field, minimum, maximum)
    if
        type(value) ~= "number"
        or value % 1 ~= 0
        or value < minimum
        or (maximum and value > maximum)
    then
        local range = maximum
            and string.format("%d 到 %d", minimum, maximum)
            or string.format("大于等于 %d", minimum)
        error(string.format("服务器配置 %s 必须是 %s 的整数", field, range))
    end
    return value
end

---@param value any
---@param field string
---@return string
local function string_field(value, field)
    if type(value) ~= "string" or value == "" then
        error(string.format("服务器配置 %s 必须是非空字符串", field))
    end
    return value
end

---@param value any
---@param field string
---@return table
local function table_field(value, field)
    if type(value) ~= "table" then
        error(string.format("服务器配置 %s 必须是 table", field))
    end
    return value
end

---@param config server.Config
local function validate(config)
    integer_field(config.worker_thread, "worker_thread", 1, 32)
    string_field(config.channel, "channel")
    local runtime = table_field(config.runtime, "runtime")
    integer_field(runtime.control_port, "runtime.control_port", 1, 65535)
    local protocol = table_field(config.protocol, "protocol")
    string_field(protocol.agent_gateway_schema_dir, "protocol.agent_gateway_schema_dir")

    local gateway = table_field(config.agent_gateway, "agent_gateway")
    local socket = table_field(gateway.socket, "agent_gateway.socket")
    string_field(socket.host, "agent_gateway.socket.host")
    integer_field(socket.port, "agent_gateway.socket.port", 1, 65535)
    local socket_path = string_field(socket.path, "agent_gateway.socket.path")
    if socket_path:sub(1, 1) ~= "/" then
        error("服务器配置 agent_gateway.socket.path 必须以 / 开头")
    end
    integer_field(
        gateway.login_timeout_ticks,
        "agent_gateway.login_timeout_ticks",
        1
    )

    local instance = table_field(gateway.instance, "agent_gateway.instance")
    integer_field(instance.client, "agent_gateway.instance.client", 1, 32)
    integer_field(instance.logind, "agent_gateway.instance.logind", 1, 32)
    integer_field(instance.websocket, "agent_gateway.instance.websocket", 1, 32)

    local agent = table_field(config.agent, "agent")
    integer_field(agent.project_instructions_max_bytes, "agent.project_instructions_max_bytes", 0)
    integer_field(agent.max_message_length, "agent.max_message_length", 1)
    integer_field(agent.session_title_length, "agent.session_title_length", 1)
    local tools = table_field(agent.tools, "agent.tools")
    string_field(tools.workspace_root, "agent.tools.workspace_root")
    integer_field(tools.timeout_ms, "agent.tools.timeout_ms", 1, 3600000)
    integer_field(tools.max_processes, "agent.tools.max_processes", 1, 64)
    integer_field(tools.max_output_bytes, "agent.tools.max_output_bytes", 4096, 4194304)
    local permission = table_field(agent.permission, "agent.permission")
    assert(type(permission.rules_enabled) == "boolean", "agent.permission.rules_enabled 必须是 boolean")
    integer_field(permission.timeout_ticks, "agent.permission.timeout_ticks", 1, 12000)
    if permission.deny_patterns then
        table_field(permission.deny_patterns, "agent.permission.deny_patterns")
        for _, pattern in ipairs(permission.deny_patterns) do
            string_field(pattern, "agent.permission.deny_patterns[]")
            assert(pcall(string.match, "", pattern), "权限规则必须是有效的 Lua pattern")
        end
    end
    local ids = {}
    for _, model in ipairs(table_field(agent.models, "agent.models")) do
        string_field(model.id, "agent.models[].id")
        string_field(model.name, "agent.models[].name")
        string_field(model.model, "agent.models[].model")
        assert(not ids[model.id], "模型 ID 重复")
        ids[model.id] = true
    end
    assert(ids[agent.default_model_id], "默认模型 ID 不在清单中")
    assert(not permission.model_id or ids[permission.model_id], "权限模型 ID 不在清单中")
    local llm = table_field(agent.llm, "agent.llm")
    if llm.api_key ~= nil then
        string_field(llm.api_key, "agent.llm.api_key")
    end
    string_field(llm.base_url, "agent.llm.base_url")
    string_field(llm.model, "agent.llm.model")
    integer_field(llm.request_timeout_ticks, "agent.llm.request_timeout_ticks", 1)
end

---@param common table
---@param channel_config table
---@param channel_name string
---@return server.Config
function Loader.build(common, channel_config, channel_name)
    assert(type(common) == "table", "服务器公共配置必须是 table")
    assert(type(channel_config) == "table", "服务器渠道配置必须是 table")

    local config = table.deep_copy(common)
    merge(config, channel_config)
    if channel_config.agent and channel_config.agent.models then
        config.agent.models = table.deep_copy(channel_config.agent.models)
    end
    config.channel = channel_name
    config.worker_thread = common.worker_thread

    local gateway = table_field(config.agent_gateway, "agent_gateway")
    gateway.instance = table_field(gateway.instance or {}, "agent_gateway.instance")
    local instance = config.agent_gateway.instance
    instance.client = instance.client or config.worker_thread
    instance.logind = instance.logind or config.worker_thread
    instance.websocket = instance.websocket or config.worker_thread

    validate(config)
    return config
end

return Loader
