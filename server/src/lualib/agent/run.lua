local class = require("class")
---@class agent.Run
---@field new fun(self: agent.Run): agent.Run
---@field cancelled boolean
---@field llm_request llm.Request?
---@field permission_request llm.Request?
---@field processes table<string, agent.Processes>
---@field id string
---@field session_id string?
---@field owner agent_session.AgentSession?
---@field message_id string
---@field assistant agent_session.Message
---@field retry boolean?
---@field close_error string?
local Run = class()

function Run:ctor()
    self.cancelled, self.processes = false, {}
    self.llm_request = nil
    self.permission_request = nil
    self.close_error = nil
    self.id = nil
    self.session_id = nil
    self.message_id = nil
    self.assistant = { reasoning = {}, tool_calls = {} }
    self.retry = nil
    self.owner = nil
end

function Run:on_reasoning(block, delta, tool_id)
    if self.owner then self.owner:_on_reasoning(self, block, delta, tool_id) end
end

function Run:cancel()
    self.cancelled = true
    local main, permission = self.llm_request, self.permission_request
    local ok = not main or main:cancel()
    if permission and not permission:cancel() then ok = false end
    for id, processes in pairs(self.processes) do processes:terminate(id) end
    self.close_error = main and main.close_error or permission and permission.close_error
    return ok
end

return Run
