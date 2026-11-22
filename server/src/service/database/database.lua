local skynet = require("skynet")
local class = require("class")
local mongo = require("skynet.db.mongo")
local crypt = require("skynet.crypt")
local bson = require("bson")
local config = require("etc.cfg")
local log = require("log")

---@class database.Service
---@field client table? 节点独占的 MongoDB 客户端
---@field db table? 当前业务库
local Database = class()

Database.commands = { find = "find", find_one = "find_one", insert = "insert", replace_one = "replace_one",
    user_identity = "user_identity", provision = "provision", revoke = "revoke" }

function Database:ctor()
    self.client = nil
    self.db = nil
end

-- 已有集合可能配置了校验器；同名视图不能作为可写集合使用。
local function ensure_collection(db, name)
    local reply = db:runCommand("create", name, "writeConcern", { w = 1, j = true })
    if reply.code == 48 then
        local info = db:runCommand("listCollections", 1, "filter", { name = name, type = "collection" })
        assert(info.ok == 1 and info.cursor.firstBatch[1], "已有命名空间不是可写集合 " .. name)
        return
    end
    assert(reply.ok == 1 and not reply.writeConcernError, "无法创建数据库集合 " .. name)
end

function Database:init()
    local database = config.database
    assert(database.password and database.password ~= "", "数据库密码未配置")
    self.client = mongo.client(database)
    self.db = self.client:getDB(database.name)
    ensure_collection(self.db, database.platform_collection or "_app_center")
    if database.platform_collection == "user" then
        local reply = self.db:runCommand("createIndexes", "user", "indexes",
            { { key = { user_id = 1 }, name = "user_id", unique = true } }, "writeConcern", { w = 1, j = true })
        assert(reply.ok == 1 and not reply.writeConcernError, "无法确认用户 ID 唯一索引")
    end
    log.info("database", "init", "已连接 host=%s port=%d database=%s", database.host, database.port, database.name)
end

function Database:close()
    if self.client then self.client:disconnect() end
    self.client, self.db = nil, nil
end

---按用户名原子读取或创建身份，只有首次登录会写入候选 ID。
function Database:user_identity(_, name)
    assert(config.database.platform_collection == "user", "仅网关可绑定登录身份")
    local id = "user-" .. crypt.hexencode(crypt.randomkey() .. crypt.randomkey())
    local result = self.db:runCommand("findAndModify", "user", "query", { _id = name },
        "update", { ["$setOnInsert"] = { user_id = id } }, "upsert", true, "new", true,
        "writeConcern", { w = 1, j = true })
    assert(result.ok == 1 and not result.writeConcernError, "无法确认用户身份")
    local doc = result.value
    assert(doc and doc._id == name and type(doc.user_id) == "string" and doc.user_id ~= "", "用户记录无效")
    return { username = name, user_id = doc.user_id }
end

local function user_info(db, username)
    local reply = db:runCommand("usersInfo", username)
    assert(reply.ok == 1 and reply.users, "无法读取数据库账号")
    return reply.users[1]
end

local function check_role(user, database)
    local roles = user.roles
    assert(#roles == 1 and roles[1].db == database and roles[1].role == "readWrite", "数据库账号授权不符")
end

local function app_users(self, context, account)
    assert(config.database.platform_collection == "app_center" and context.source == skynet.localname(".app_center"),
        "仅本机应用中心可管理数据库账号")
    assert(account.name:match("^app_%x+$") and #account.name == 36 and account.username == account.name,
        "应用数据库标识无效")
    return self.client:getDB(config.app_center.user_authdb)
end

function Database:provision(context, seed)
    local name = "app_" .. crypt.hexencode(crypt.hmac_sha1(seed, "database")):sub(1, 32)
    local account = { name = name, username = name, password = crypt.hexencode(crypt.hmac_sha1(seed, "password")) }
    local users = app_users(self, context, account)
    local user = user_info(users, account.username)
    if not user then
        local result = users:runCommand("createUser", account.username, "pwd", account.password,
            "roles", { { role = "readWrite", db = account.name } }, "writeConcern", { w = 1, j = true })
        assert(result.ok == 1 and not result.writeConcernError, "创建应用数据库账号失败")
        user = assert(user_info(users, account.username), "应用数据库账号未就绪")
    end
    check_role(user, account.name)
    local connection = mongo.client({ host = config.database.host, port = config.database.port,
        username = account.username, password = account.password, authdb = config.app_center.user_authdb })
    local ok = pcall(ensure_collection, connection:getDB(account.name), "_app_center")
    connection:disconnect()
    assert(ok, "未能创建应用数据库")
    return account
end

function Database:revoke(context, account)
    local users = app_users(self, context, account)
    local user = user_info(users, account.username)
    if user then
        check_role(user, account.name)
        local result = users:runCommand("dropUser", account.username, "writeConcern", { w = 1, j = true })
        assert(result.ok == 1 and not result.writeConcernError, "撤销数据库账号失败")
    end
    return true
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
    -- MongoDB 的错误详情可能含有文档原文，日志只记录错误码。
    assert(reply.ok == 1 and not failure, "数据库写入失败 code=" .. tostring((failure or reply).code))
    return reply.n
end

function Database:insert(_, collection, document)
    return write(self.db, "insert", collection, "documents", document)
end

function Database:replace_one(_, collection, filter, document)
    return write(self.db, "update", collection, "updates", { q = filter, u = document, multi = false })
end

return Database
