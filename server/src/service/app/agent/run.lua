local class = require("class")
---@class agent.Run
---@field new fun(self: agent.Run): agent.Run
---@field cancelled boolean
---@field llm_request llm.Request?
---@field permission_request llm.Request?
---@field executions table<string, agent.ToolRuntime> 按运行或进程 ID 取消调用
---@field id string
---@field session_id string?
---@field owner agent.session.AgentSession?
---@field message_id string
---@field assistant agent.session.Message
---@field retry boolean?
---@field close_error string?
---@field source_device string?
local Run = class()

function Run:ctor()
    self.cancelled, self.executions = false, {}
    self.llm_request = nil
    self.permission_request = nil
    self.close_error = nil
    self.id = nil
    self.session_id = nil
    self.message_id = nil
    self.assistant = { reasoning = {}, tool_calls = {} }
    self.retry = nil
    self.owner = nil
    self.source_device = nil
end

function Run:on_reasoning(block, delta, tool_id)
    if self.owner then self.owner:_on_reasoning(self, block, delta, tool_id) end
end

function Run:cancel()
    self.cancelled = true
    local main, permission = self.llm_request, self.permission_request
    local ok = not main or main:cancel()
    if permission and not permission:cancel() then ok = false end
    for id, runtime in pairs(self.executions) do runtime:terminate(id) end
    self.close_error = main and main.close_error or permission and permission.close_error
    return ok
end

return Run
