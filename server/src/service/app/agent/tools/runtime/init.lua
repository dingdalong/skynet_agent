local Runtime = {}

---@alias agent.ToolRuntime agent.tools.runtime.Server|agent.tools.runtime.Client

---每个会话按工作目录选择执行端，调用来源只参与桌面授权判断。
---@param options agent.Options
---@return agent.ToolRuntime
function Runtime.new(options)
    local mode = options.execution_target and "client" or "server"
    return require("agent.tools.runtime." .. mode):new(options)
end

return Runtime
