local protobuf = require("helper.protobuf")
local pb = require("pb")

local hashing = require("helper.hash")
---@class network.Protocol
---@field app_id string?
---@field new fun(self: network.Protocol): network.Protocol
---@field hash_to_name table<integer, string>
---@field name_to_type table<string, string>
---@field short_name_to_full_name table<string, string>
local M = require("class")()

function M:ctor()
    self.app_id = nil
    self.hash_to_name = {}
    self.name_to_type = {}
    self.short_name_to_full_name = {}
end

function M:init(app_id)
    self.app_id = app_id
    protobuf.attach()
    self.hash_to_name = {}
    self.name_to_type = {}
    self.short_name_to_full_name = {}

    for full_name, short_name, protobuf_type in pb.types() do
        if protobuf_type == "message" then
            local normalized_name = full_name:gsub("^%.", "")
            local hash = hashing.fnv1a32(normalized_name)
            local hash_type_name = self.hash_to_name[hash]
            assert(
                not hash_type_name or hash_type_name == normalized_name,
                string.format(
                    "protobuf 消息哈希冲突: %s 和 %s",
                    hash_type_name or "",
                    normalized_name
                )
            )

            local mapped_full_name = self.short_name_to_full_name[short_name]
            assert(
                not mapped_full_name or mapped_full_name == normalized_name,
                string.format(
                    "protobuf 短消息名冲突: %s 和 %s 都使用 %s",
                    mapped_full_name or "",
                    normalized_name,
                    short_name
                )
            )

            self.hash_to_name[hash] = normalized_name
            self.name_to_type[normalized_name] = normalized_name
            self.short_name_to_full_name[short_name] = normalized_name
        end
    end
end

---校验当前应用的对外消息命名和请求响应配对。
function M:validate()
    local prefix = self.app_id:gsub("^%l", string.upper):gsub("%-(%w)", string.upper)
    for name in pairs(self.short_name_to_full_name) do
        local suffix = name:sub(-3)
        if suffix == "Req" or suffix == "Res" or suffix == "Ntf" then
            assert(name:sub(1, #prefix) == prefix, "协议缺少应用前缀: " .. name)
            if suffix ~= "Ntf" then
                local peer = name:sub(1, -4) .. (suffix == "Req" and "Res" or "Req")
                assert(self.short_name_to_full_name[peer], "协议缺少配对消息: " .. peer)
            end
        end
    end
end

function M:encode_body(name, args)
    local type_name = self.name_to_type[name] or self.short_name_to_full_name[name]
    assert(type_name, "未知 protobuf 消息类型: " .. tostring(name))
    local args_bin = protobuf.encode(type_name, args)
    return string.pack(">I4", hashing.fnv1a32(type_name)) .. args_bin
end

---按当前应用的类型表解码消息体。
---@param data string
---@param suffix string
---@return string message_name
---@return table args
function M:decode_body(data, suffix)
    local type_hash, offset = string.unpack(">I4", data)
    local type_name = self.hash_to_name[type_hash]
    assert(type_name, "未知 protobuf 消息哈希: " .. tostring(type_hash))
    local short_name = type_name:match("([^.]+)$")
    assert(short_name, "protobuf 消息名无效: " .. type_name)

    assert(short_name:sub(-3) == suffix, "无效的业务消息方向")
    return short_name, protobuf.decode(type_name, data:sub(offset))
end

return M
