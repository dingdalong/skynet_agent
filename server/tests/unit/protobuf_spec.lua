local hash = require("helper.hash")
local cjson = require("cjson")
local error_code = require("enum.error_code")
local lfs = require("lfs")
local message_status = require("agent.message_status")
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
local function compile_shared_schema(directory)
    local compiler = protoc.new()
    compiler.include_imports = true
    compiler.paths = { AGENT_PROTO_DIR }
    local descriptor = compiler:compilefile("schema.proto")
    assert(pb_io.dump(directory .. "/pb.bytes", descriptor))
end

---@param data table
---@param expected table
local function assert_round_trip(type_name, data, expected)
    local encoded = protobuf.encode(type_name, data)
    local decoded = protobuf.decode(type_name, encoded)
    assert.same(expected, decoded)
end

describe("protobuf", function()
    it("从统一入口加载共享协议并注册消息名与哈希", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()

        assert_round_trip("skynet.agent.v1.LoginReq", { username = "alice" }, { username = "alice" })
        assert_round_trip("skynet.agent.v1.ChatReq", {
            session_id = "session-1",
            text = "你好",
            retry_run_id = "",
            model_id = "",
        }, {
            session_id = "session-1",
            text = "你好",
            retry_run_id = "",
            model_id = "",
        })

        local login_hash = hash.fnv1a32("skynet.agent.v1.LoginReq")
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

        local frame = protocol:encode_msg(42, "ChatReq", {
            session_id = "session-1",
            text = "你好",
            retry_run_id = "",
            model_id = "",
        })
        local compression, message_id, type_hash, offset =
            string.unpack(HEADER_FORMAT, frame)
        assert.are.equal(0, compression)
        assert.are.equal(42, message_id)
        assert.are.equal(
            hash.fnv1a32("skynet.agent.v1.ChatReq"),
            type_hash
        )

        local decoded_id, name, args = protocol:decode_msg(frame)
        assert.are.equal(42, decoded_id)
        assert.are.equal("ChatReq", name)
        assert.same({
            session_id = "session-1",
            text = "你好",
            retry_run_id = "",
            model_id = "",
        }, args)
    end)

    it("与客户端共享完整二进制帧向量", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()
        local vectors = load_protocol_vectors()
        assert.are.equal(hash.fnv1a32("skynet.agent.v1.ChatReq"), vectors.hashes.chat_req)

        local login_request = decode_hex(vectors.frames.login_request)
        local message_id, name, args = protocol:decode_msg(login_request)
        assert.are.equal(1, message_id)
        assert.are.equal("LoginReq", name)
        assert.are.equal("alice", args.username)
        assert.are.equal(login_request, protocol:encode_msg(1, "LoginReq", { username = "alice" }))
        local expectations = {
            chat_request = "ChatReq", chat_first_request = "ChatReq",
            login_success = "LoginRes", message_accepted = "ChatRes",
            message_streaming = "MessageDeltaNtf", message_completed = "SessionUpdatedNtf",
            message_cancelled = "SessionUpdatedNtf", message_failed = "SessionUpdatedNtf",
        }
        for key, expected in pairs(expectations) do
            local id, decoded_name, payload = protocol:decode_msg(decode_hex(vectors.frames[key]))
            assert.are.equal(expected, decoded_name)
            if expected:match("Ntf$") then assert.are.equal(0, id) end
            if key == "login_success" then assert.are.equal("user-1", payload.identity.user_id) end
            if key == "chat_first_request" then
                assert.are.equal("", payload.session_id)
                assert.are.equal("model-1", payload.model_id)
            end
            if key == "message_streaming" then assert.are.equal("你好", payload.delta) end
            if key == "message_failed" then
                assert.are.equal("上游失败", payload.chat_session.session.messages[1].error.message)
                assert.are.equal("MESSAGE_STATUS_FAILED", payload.chat_session.session.messages[1].status)
            end
        end
    end)

    it("拒绝压缩、未知哈希和过短消息", function()
        assert.is_true(protobuf.load(AGENT_PROTO_DIR))
        protocol:init()

        local args = protobuf.encode("skynet.agent.v1.LoginReq", {})
        local compressed = string.pack(
            HEADER_FORMAT,
            1,
            1,
            hash.fnv1a32("skynet.agent.v1.LoginReq")
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

    it("源码和预编译入口都能收发登录、聊天和设备执行消息", function()
        local directory = temporary_directory()
        compile_shared_schema(directory)
        write_proto(directory, "schema.proto", "invalid source")
        local vectors = load_protocol_vectors().frames
        local requests = {
            DesktopRegisterReq = { device_id = "desktop", name = "Desktop", authorization_id = "auth" },
            ExecutionActionNtf = { request_id = "call", operation = "project", workspace_id = "workspace" },
            ExecutionResultReq = { request_id = "call", result = "{}" },
        }
        for _, source in ipairs({ AGENT_PROTO_DIR, directory }) do
            pb.clear()
            protoc.reload()
            assert.is_true(protobuf.load(source))
            protocol:init()
            for _, sample in ipairs({
                { vectors.login_request, 1, "LoginReq", { username = "alice" } },
                { vectors.chat_request, 2, "ChatReq", { session_id = "session-1", text = "你好" } },
            }) do
                local frame = decode_hex(sample[1])
                local id, decoded, args = protocol:decode_msg(frame)
                assert.are.equal(sample[2], id)
                assert.are.equal(sample[3], decoded)
                for field, value in pairs(sample[4]) do assert.are.equal(value, args[field]) end
                local encoded = protocol:encode_msg(id, decoded, sample[4])
                assert.are.equal(frame:sub(1, 9), encoded:sub(1, 9))
                local _, _, round_trip = protocol:decode_msg(encoded)
                assert.same(args, round_trip)
            end
            for name, fields in pairs(requests) do
                local id = name:match("Ntf$") and 0 or 1
                local decoded_id, decoded, args = protocol:decode_msg(protocol:encode_msg(id, name, fields))
                assert.are.equal(id, decoded_id)
                assert.are.equal(name, decoded)
                for field, value in pairs(fields) do assert.are.equal(value, args[field]) end
            end
        end
        remove_directory(directory)
    end)

    it("只加载入口声明的协议", function()
        local directory = temporary_directory()
        write_proto(
            directory,
            "schema.proto",
            'syntax = "proto3"; package protobuf_nested_test; message Root { string value = 1; }'
        )
        write_proto(directory, "unused.proto", "not protobuf")

        assert.is_true(protobuf.load(directory))
        assert_round_trip("protobuf_nested_test.Root", { value = "root" }, { value = "root" })

        remove_directory(directory)
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
        assert.matches("schema%.proto", tostring(err))
        assert(lfs.rmdir(directory))
    end)

    it("损坏的 pb.bytes 不回退到 proto", function()
        local directory = temporary_directory()
        write_file(directory .. "/pb.bytes", "invalid descriptor")
        write_proto(
            directory,
            "schema.proto",
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

        ok, err = pcall(protobuf.decode, "skynet.agent.v1.ChatReq", "\18\255")
        assert.is_false(ok)
        assert.matches("invalid bytes length", tostring(err))

        ok, err = pcall(protobuf.encode, "", {})
        assert.is_false(ok)
        assert.matches("消息类型不能为空", tostring(err))

        ok, err = pcall(protobuf.decode, "skynet.agent.v1.ChatReq", nil)
        assert.is_false(ok)
        assert.matches("必须是 string", tostring(err))
    end)
end)
