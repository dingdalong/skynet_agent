local Models = {}

---@param config server.AgentConfig
---@param id string
---@return llm.Config
function Models.resolve(config, id)
    for _, model in ipairs(config.models) do
        if model.id == id then
            local resolved = table.deep_copy(config.llm)
            for key, value in pairs(model) do
                if key ~= "name" then resolved[key] = table.deep_copy(value) end
            end
            return resolved
        end
    end
    error("未知模型 ID: " .. tostring(id), 0)
end

---@param config server.AgentConfig
---@return table[]
function Models.public(config)
    local models = {}
    for _, model in ipairs(config.models) do
        models[#models + 1] = { id = model.id, name = model.name, model = model.model }
    end
    return models
end

return Models
