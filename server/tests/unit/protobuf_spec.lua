local cjson = require("cjson")
local error_code = require("enum.error_code")
local lfs = require("lfs")
local message_status = require("enum.message_status")
local pb = require("pb")
local pb_io = require("pb.io")
local protobuf = require("helper.protobuf")
local protoc = require("protoc")
local protocol = require("network.protocol"):new()

local AGENT_PROTO_DIR = "../common/proto"
local PROTOCOL_VECTORS_PATH = "../common/proto/testdata/protocol_vectors.json"
local HEADER_FORMAT = ">BI4I4"

---@param value string
---@return string
local function decode_hex(value)
    return (value:gsub("%x%x", function(byte)
        return string.char(tonumber(byte, 16))
    end))
end

---@return table
local function load_protocol_vectors()
    local file = assert(io.open(PROTOCOL_VECTORS_PATH, "rb"))
    local content = assert(file:read("*a"))
    file:close()
    return cjson.decode(content)
end

---@return string
local function temporary_directory()
    local path = os.tmpname()
    os.remove(path)
    assert(lfs.mkdir(path))
    return path
end

---@param path string
---@param content string
local function write_file(path, content)
    local file = assert(io.open(path, "wb"))
    assert(file:write(content))
    file:close()
end

---@param directory string
local function remove_directory(directory)
    for entry in lfs.dir(directory) do
        if entry ~= "." and entry ~= ".." then
            os.remove(directory .. "/" .. entry)
        end
    end
    assert(lfs.rmdir(directory))
end

---@param directory string
---@param filename string
---@param content string
local function write_proto(directory, filename, content)
    write_file(directory .. "/" .. filename, content)
end

---@param directory string
---@param package_name string
---@return string
local function compile_test_schema(directory, package_name)
    local proto_path = directory .. "/cached.proto"
    write_proto(
        directory,
        "cached.proto",
        string.format(
            'syntax = "proto3"; package %s; message Cached { string value = 1; }',
            package_name
        )
    )
    local compiler = protoc.new()
    compiler.include_imports = true
    compiler:addpath(directory)
    local descriptor = compiler:compilefile("cached.proto")
    assert(pb_io.dump(directory .. "/pb.bytes", descriptor))
    os.remove(proto_path)
    return package_name .. ".Cached"
end

---@param data table
---@param expected table
local function assert_round_trip(type_name, data, expected)
    local encoded = protobuf.encode(type_name, data)
    local decoded = protobuf.decode(type_name, encoded)
    assert.same(expected, decoded)
end

describe("protobuf", function()
    it("加载目录中的全部共享 proto 并自动注册消息名与哈希", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()

        assert_round_trip("skynet.agent.v1.LoginReq", {}, {})
        assert_round_trip("skynet.agent.v1.MessageSendReq", {
            session_id = "session-1",
            text = "你好",
        }, {
            session_id = "session-1",
            text = "你好",
        })

        local login_hash = protocol.fnv1a32("skynet.agent.v1.LoginReq")
        assert.are.equal("skynet.agent.v1.LoginReq", protocol.hash_to_name[login_hash])
        assert.are.equal(
            "skynet.agent.v1.LoginReq",
            protocol.short_name_to_full_name.LoginReq
        )
        assert.are.equal(
            message_status.streaming,
            pb.enum("skynet.agent.v1.MessageStatus", "MESSAGE_STATUS_STREAMING")
        )
        assert.are.equal(
            message_status.unspecified,
            pb.enum("skynet.agent.v1.MessageStatus", "MESSAGE_STATUS_UNSPECIFIED")
        )
        assert.are.equal(
            message_status.completed,
            pb.enum("skynet.agent.v1.MessageStatus", "MESSAGE_STATUS_COMPLETED")
        )
        assert.are.equal(
            message_status.cancelled,
            pb.enum("skynet.agent.v1.MessageStatus", "MESSAGE_STATUS_CANCELLED")
        )
    end)

    it("编码和解码九字节二进制消息头", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()

        local frame = protocol:encode_msg(42, "MessageSendReq", {
            session_id = "session-1",
            text = "你好",
        })
        local compression, message_id, type_hash, offset =
            string.unpack(HEADER_FORMAT, frame)
        assert.are.equal(0, compression)
        assert.are.equal(42, message_id)
        assert.are.equal(
            protocol.fnv1a32("skynet.agent.v1.MessageSendReq"),
            type_hash
        )

        local decoded_id, name, args = protocol:decode_msg(frame)
        assert.are.equal(42, decoded_id)
        assert.are.equal("MessageSendReq", name)
        assert.same({
            session_id = "session-1",
            text = "你好",
        }, args)
    end)

    it("与客户端共享完整二进制帧向量", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()
        local vectors = load_protocol_vectors()

        local login_request = decode_hex(vectors.frames.login_request)
        local message_id, name, args = protocol:decode_msg(login_request)
        assert.are.equal(1, message_id)
        assert.are.equal("LoginReq", name)
        assert.same({}, args)
        assert.are.equal(
            login_request,
            protocol:encode_msg(1, "LoginReq", {})
        )

        message_id, name, args = protocol:decode_msg(
            decode_hex(vectors.frames.message_send)
        )
        assert.are.equal(2, message_id)
        assert.are.equal("MessageSendReq", name)
        assert.same({
            session_id = "session-1",
            text = "你好",
        }, args)

        message_id, name, args = protocol:decode_msg(
            decode_hex(vectors.frames.login_success)
        )
        assert.are.equal(1, message_id)
        assert.are.equal("LoginRes", name)
        assert.are.equal(error_code.succ, args.ret)
        assert.are.equal("session-1", args.snapshot.active_session_id)

        message_id, name, args = protocol:decode_msg(
            decode_hex(vectors.frames.message_streaming)
        )
        assert.are.equal(2, message_id)
        assert.are.equal("MessageSendRes", name)
        assert.are.equal(error_code.succ, args.ret)
        assert.are.equal("MESSAGE_STATUS_STREAMING", args.status)
        assert.are.equal("你好", args.delta)

        message_id, name, args = protocol:decode_msg(
            decode_hex(vectors.frames.message_completed)
        )
        assert.are.equal(2, message_id)
        assert.are.equal("MessageSendRes", name)
        assert.are.equal(error_code.succ, args.ret)
        assert.are.equal("MESSAGE_STATUS_COMPLETED", args.status)
        assert.are.equal("你好", args.message.content)

        message_id, name, args = protocol:decode_msg(
            decode_hex(vectors.frames.message_cancelled)
        )
        assert.are.equal(2, message_id)
        assert.are.equal("MessageSendRes", name)
        assert.are.equal(error_code.succ, args.ret)
        assert.are.equal("MESSAGE_STATUS_CANCELLED", args.status)

        message_id, name, args = protocol:decode_msg(
            decode_hex(vectors.frames.message_failed)
        )
        assert.are.equal(2, message_id)
        assert.are.equal("MessageSendRes", name)
        assert.are.equal(error_code.call_fail, args.ret)
        assert.are.equal("上游失败", args.error.message)
        assert.is_true(args.error.retryable)
        assert.is_nil(args.error.code)
    end)

    it("拒绝压缩、未知哈希和过短消息", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()

        local args = protobuf.encode("skynet.agent.v1.LoginReq", {})
        local compressed = string.pack(
            HEADER_FORMAT,
            1,
            1,
            protocol.fnv1a32("skynet.agent.v1.LoginReq")
        ) .. args
        local ok, err = pcall(protocol.decode_msg, protocol, compressed)
        assert.is_false(ok)
        assert.matches("不支持压缩", tostring(err))

        local unknown = string.pack(HEADER_FORMAT, 0, 1, 123) .. args
        ok, err = pcall(protocol.decode_msg, protocol, unknown)
        assert.is_false(ok)
        assert.matches("未知 protobuf 消息哈希", tostring(err))

        ok, err = pcall(protocol.decode_msg, protocol, "\0\0")
        assert.is_false(ok)
    end)

    it("优先加载 pb.bytes 并忽略同目录损坏的 proto", function()
        local directory = temporary_directory()
        local type_name = compile_test_schema(directory, "protobuf_cache_test")
        write_proto(directory, "broken.proto", 'syntax = "proto3"; this is invalid')
        write_proto(directory, "ignored.txt", 'syntax = "proto3";')

        assert.is_true(protobuf.load(directory))
        assert_round_trip(type_name, { value = "cached" }, { value = "cached" })
        remove_directory(directory)
    end)

    it("只扫描第一层普通 proto 文件", function()
        local directory = temporary_directory()
        write_proto(
            directory,
            "root.proto",
            'syntax = "proto3"; package protobuf_nested_test; message Root { string value = 1; }'
        )
        assert(lfs.mkdir(directory .. "/nested"))
        write_proto(directory .. "/nested", "broken.proto", "not protobuf")

        assert.is_true(protobuf.load(directory))
        assert_round_trip("protobuf_nested_test.Root", { value = "root" }, { value = "root" })

        os.remove(directory .. "/nested/broken.proto")
        assert(lfs.rmdir(directory .. "/nested"))
        os.remove(directory .. "/root.proto")
        assert(lfs.rmdir(directory))
    end)

    it("拒绝缺失目录、文件路径和空目录", function()
        local missing = os.tmpname()
        os.remove(missing)
        local ok, err = pcall(protobuf.load, missing)
        assert.is_false(ok)
        assert.matches("目录不存在", tostring(err))

        ok, err = pcall(protobuf.load, AGENT_PROTO_DIR .. "/common.proto")
        assert.is_false(ok)
        assert.matches("目录不存在", tostring(err))

        local directory = temporary_directory()
        ok, err = pcall(protobuf.load, directory)
        assert.is_false(ok)
        assert.matches("没有 .proto 文件", tostring(err))
        assert(lfs.rmdir(directory))
    end)

    it("损坏的 pb.bytes 不回退到 proto", function()
        local directory = temporary_directory()
        write_file(directory .. "/pb.bytes", "invalid descriptor")
        write_proto(
            directory,
            "fallback.proto",
            'syntax = "proto3"; package protobuf_fallback_test; message Value { string text = 1; }'
        )

        local ok, err = pcall(protobuf.load, directory)
        assert.is_false(ok)
        assert.matches("加载 protobuf schema 失败", tostring(err))
        remove_directory(directory)
    end)

    it("保留原生编解码错误", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()

        local ok, err = pcall(protobuf.encode, "example.Missing", {})
        assert.is_false(ok)
        assert.matches("does not exists", tostring(err))

        ok, err = pcall(protobuf.decode, "skynet.agent.v1.MessageSendReq", "\18\255")
        assert.is_false(ok)
        assert.matches("invalid bytes length", tostring(err))

        ok, err = pcall(protobuf.encode, "", {})
        assert.is_false(ok)
        assert.matches("消息类型不能为空", tostring(err))

        ok, err = pcall(protobuf.decode, "skynet.agent.v1.MessageSendReq", nil)
        assert.is_false(ok)
        assert.matches("必须是 string", tostring(err))
    end)
end)
