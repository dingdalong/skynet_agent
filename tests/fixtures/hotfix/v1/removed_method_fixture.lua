local module = {}

function module.get_value()
    return "old"
end

function module.removed_method()
    return "old-removed"
end

return module
