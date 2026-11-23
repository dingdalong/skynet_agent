local Frame = { request = 1, response = 2, notification = 3, routing_error = 4 }

function Frame.valid_app(id)
    return type(id) == "string" and #id <= 63 and id:match("^[a-z][a-z0-9%-]*$") ~= nil
        and not id:find("--", 1, true) and id:sub(-1) ~= "-"
end

local function validate(kind, id, app)
    assert(Frame.valid_app(app), "无效应用 ID")
    assert(math.type(kind) == "integer" and kind >= Frame.request and kind <= Frame.routing_error, "无效帧类别")
    assert(math.type(id) == "integer" and id >= 0 and id <= 0xffffffff
        and (id == 0) == (kind == Frame.notification), "无效消息 ID")
end

function Frame.pack(kind, id, app, data)
    validate(kind, id, app)
    return string.pack(">BI4s1", kind, id, app) .. data
end

function Frame.unpack(data)
    assert(type(data) == "string", "无效消息帧")
    local kind, id, app, pos = string.unpack(">BI4s1", data)
    validate(kind, id, app)
    return kind, id, app, data:sub(pos)
end

return Frame
