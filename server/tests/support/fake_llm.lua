local Scope = require("tests.support.modules")

local FakeLlm = {}

---@param overrides table?
---@return table, table
function FakeLlm.new(overrides)
    overrides = table.copy(overrides or {})
    overrides["agent.llm.base"] = false
    overrides.log = { info = function() end, failure = function() end }
    local scope = Scope.new(overrides)
    local base = require("agent.llm.base")
    local fake = { new_configs = {}, requests = {}, new_error = nil, response_handler = nil }
    base.Client.__index = base.Client

    function base.Client:ctor(config)
        if fake.new_error then error(fake.new_error, 0) end
        fake.new_configs[#fake.new_configs + 1] = table.deep_copy(config)
        self.client_index = #fake.new_configs
        self.config = table.deep_copy(config)
        self.current_request = nil
    end

    function base.Client:create_response(input, options, on_event)
        fake.requests[#fake.requests + 1] = { client = self, input = input, options = options }
        local streamed = false
        local text, err, response = fake.response_handler(self, input, function(delta)
            streamed = true
            on_event({ type = "response.output_text.delta", delta = delta })
        end, options)
        if text == nil then return 503, { error = { message = err } } end
        if not streamed and text ~= "" then on_event({ type = "response.output_text.delta", delta = text }) end
        on_event({ type = "response.completed", response = response or {} })
        return 200
    end

    return fake, scope
end

return FakeLlm
