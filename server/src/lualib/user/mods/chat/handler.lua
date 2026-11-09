local REQUEST = {}

---@param self user.User
---@param args table
---@return table
function REQUEST:ChatReq(args, connection)
    return self.chat:chat(args, connection)
end

---@param self user.User
---@param args table
---@return table
function REQUEST:MessageCancelReq(args)
    return self.chat:cancel_message(args)
end

---@param self user.User
---@param args table
---@return table
function REQUEST:SessionModelSetReq(args)
    return self.chat:set_session_model(args)
end

return { REQUEST = REQUEST }
