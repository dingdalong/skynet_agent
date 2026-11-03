local file = require("file")
local pb = require("pb")
local pb_unsafe = require("pb.unsafe")

---@param schema_directory string
---@param proto_filenames string[]
local function load_proto(schema_directory, proto_filenames)
    local protoc = require("protoc").new()
    protoc.include_imports = true
    protoc:addpath(schema_directory)

    local imports = {
        'syntax = "proto3";',
    }
    for index, filename in ipairs(proto_filenames) do
        imports[index + 1] = string.format('import "%s";', filename:gsub('"', '\\"'))
    end
    protoc:load(table.concat(imports, "\n"), "__protobuf_schema__.proto")
end

---@param pb_path string
local function load_pb(pb_path)
    local loaded, load_error = pb.loadfile(pb_path)
    if not loaded then
        error(string.format(
            "加载 protobuf schema 失败 path=%s: %s",
            pb_path,
            tostring(load_error)
        ), 0)
    end
end

---@param schema_directory string
---@return string[]
local function list_proto_files(schema_directory)
    local files, list_error = file.list_files(schema_directory)
    if not files then
        error(string.format(
            "读取 protobuf schema 目录失败 dir=%s: %s",
            schema_directory,
            tostring(list_error)
        ), 0)
    end

    local filenames = {}
    for _, filename in ipairs(files) do
        if filename:sub(-6) == ".proto" then
            filenames[#filenames + 1] = filename
        end
    end
    return filenames
end

local M = {}

---加载 protobuf schema。
---目录中存在 `pb.bytes` 时只加载该预编译文件，否则加载目录第一层全部 `.proto`。
---@param schema_directory string protobuf schema 目录
---@return true
function M.load(schema_directory)
    pb_unsafe.use("local")
    assert(
        type(schema_directory) == "string" and schema_directory ~= "",
        "protobuf schema 目录不能为空"
    )
    if not file.is_directory(schema_directory) then
        error("protobuf schema 目录不存在: " .. schema_directory, 2)
    end

    local pb_path = schema_directory .. "/pb.bytes"
    if file.is_file(pb_path) then
        load_pb(pb_path)
        return true
    end

    local proto_filenames = list_proto_files(schema_directory)
    if #proto_filenames == 0 then
        error("protobuf schema 目录中没有 .proto 文件: " .. schema_directory, 2)
    end

    local loaded, load_error = pcall(load_proto, schema_directory, proto_filenames)
    if not loaded then
        error(string.format(
            "加载 protobuf schema 失败 dir=%s: %s",
            schema_directory,
            tostring(load_error)
        ), 0)
    end

    return true
end

---按消息类型编码 protobuf 数据。
---@param type_name string
---@param value table
---@return string
function M.encode(type_name, value)
    assert(type(type_name) == "string" and type_name ~= "", "protobuf 消息类型不能为空")
    assert(type(value) == "table", "protobuf 编码数据必须是 table")
    return pb.encode(type_name, value)
end

---按消息类型解码 protobuf 数据。
---@param type_name string
---@param data string
---@return table
function M.decode(type_name, data)
    assert(type(type_name) == "string" and type_name ~= "", "protobuf 消息类型不能为空")
    assert(type(data) == "string", "protobuf 解码数据必须是 string")
    return pb.decode(type_name, data)
end

---接入 main 持有的只读 schema，必须在 main 加载完成后执行。
function M.attach()
    assert(pb_unsafe.use("global"), "protobuf schema 尚未初始化")
end

return M
