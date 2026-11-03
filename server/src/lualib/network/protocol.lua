local protobuf = require("helper.protobuf")
local pb = require("pb")

local FNV_OFFSET_BASIS = 2166136261
local FNV_PRIME = 16777619
local UINT32_MASK = 0xffffffff
local HEADER_FORMAT = ">BI4I4"
---@class network.Protocol
---@field new fun(self: network.Protocol): network.Protocol
---@field hash_to_name table<integer, string>
---@field name_to_type table<string, string>
---@field short_name_to_full_name table<string, string>
local M = require("class")()

function M:ctor()
    self.hash_to_name = {}
    self.name_to_type = {}
    self.short_name_to_full_name = {}
end

---@param value string
---@return integer
local function fnv1a32(value)
    local hash = FNV_OFFSET_BASIS
    for index = 1, #value do
        hash = ((hash ~ value:byte(index)) * FNV_PRIME) & UINT32_MASK
    end
    return hash
end

function M:init()
    protobuf.attach()
    self.hash_to_name = {}
    self.name_to_type = {}
    self.short_name_to_full_name = {}

    for full_name, short_name, protobuf_type in pb.types() do
        if protobuf_type == "message" then
            local normalized_name = full_name:gsub("^%.", "")
            local hash = fnv1a32(normalized_name)
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

---编码完整 WebSocket 业务帧。
---@param message_id integer
---@param name string protobuf 短消息名或完整消息名
---@param args table
---@return string
function M:encode_msg(message_id, name, args)
    assert(
        type(message_id) == "number"
        and message_id >= 0
        and message_id <= UINT32_MASK
        and message_id % 1 == 0,
        "消息 ID 必须是 0 到 4294967295 之间的整数"
    )
    local type_name = self.name_to_type[name] or self.short_name_to_full_name[name]
    assert(type_name, "未知 protobuf 消息类型: " .. tostring(name))
    local args_bin = protobuf.encode(type_name, args)
    return string.pack(HEADER_FORMAT, 0, message_id, fnv1a32(type_name)) .. args_bin
end

---解码完整 WebSocket 业务帧。
---@param data string
---@return integer message_id
---@return string message_name
---@return table args
function M:decode_msg(data)
    assert(type(data) == "string", "protobuf 消息帧必须是 string")
    local compression, message_id, type_hash, offset = string.unpack(HEADER_FORMAT, data)
    assert(compression == 0, "MVP 不支持压缩 protobuf 消息")

    local type_name = self.hash_to_name[type_hash]
    assert(type_name, "未知 protobuf 消息哈希: " .. tostring(type_hash))
    local short_name = type_name:match("([^.]+)$")
    assert(short_name, "protobuf 消息名无效: " .. type_name)

    return message_id, short_name, protobuf.decode(type_name, data:sub(offset))
end

M.fnv1a32 = fnv1a32

return M
