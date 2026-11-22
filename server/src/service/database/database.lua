local class = require("class")
local mongo = require("skynet.db.mongo")
local bson = require("bson")
local config = require("etc.cfg")
local log = require("log")

---@class database.Service
---@field client table? 节点独占的 MongoDB 客户端
---@field db table? 当前业务库
local Database = class()

Database.commands = { find = "find", find_one = "find_one", insert = "insert", replace_one = "replace_one" }

function Database:ctor()
    self.client = nil
    self.db = nil
end

function Database:init()
    local database = config.database
    assert(database.password and database.password ~= "", "数据库密码未配置")
    self.client = mongo.client(database)
    self.db = self.client:getDB(database.name)
    log.info("database", "init", "已连接 host=%s port=%d database=%s", database.host, database.port, database.name)
end

function Database:close()
    if self.client then self.client:disconnect() end
    self.client, self.db = nil, nil
end

-- 驱动会用集合名回写 db。同名集合（例如 name）不能覆盖共享连接的字段。
local function get_collection(db, name)
    local previous = rawget(db, name)
    local collection = db:getCollection(name)
    db[name] = previous
    return collection
end

---@param collection string 集合名
---@param filter table? 查询条件
function Database:find(_, collection, filter)
    local cursor = get_collection(self.db, collection):find(filter)
    local documents = {}
    while cursor:hasNext() do documents[#documents + 1] = cursor:next() end
    return documents
end

function Database:find_one(_, collection, filter)
    return get_collection(self.db, collection):findOne(filter)
end

---仅在服务端确认写入日志后返回影响条数。命令错误和写入错误都交给 RPC 报告。
local function write(db, command, collection, field, entry)
    local reply = db:runCommand(command, collection, field, { bson.encode(entry) }, "writeConcern", { w = 1, j = true })
    local failure = reply.writeErrors and reply.writeErrors[1] or reply.writeConcernError
    assert(reply.ok == 1 and not failure, failure and failure.errmsg or reply.errmsg or "数据库写入失败")
    return reply.n
end

function Database:insert(_, collection, document)
    return write(self.db, "insert", collection, "documents", document)
end

function Database:replace_one(_, collection, filter, document)
    return write(self.db, "update", collection, "updates", { q = filter, u = document, multi = false })
end

return Database
