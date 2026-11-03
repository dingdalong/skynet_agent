local Scope = {}
Scope.__index = Scope

function Scope.new(overrides)
    local saved = {}
    for key, value in pairs(package.loaded) do
        saved[key] = value
    end
    for key, value in pairs(overrides or {}) do
        package.loaded[key] = value ~= false and value or nil
    end
    return setmetatable({ saved = saved }, Scope)
end

function Scope:restore()
    for key in pairs(package.loaded) do
        if self.saved[key] == nil then
            package.loaded[key] = nil
        end
    end
    for key, value in pairs(self.saved) do
        package.loaded[key] = value
    end
end

return Scope
