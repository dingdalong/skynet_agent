local skynet = require("skynet")
local class = require("class")
local mongo = require("skynet.db.mongo")
local crypt = require("skynet.crypt")
local bson = require("bson")
local config = require("etc.cfg")
local log = require("log")

---@class database.Service
---@field client table? 节点独占的 MongoDB 客户端
---@field admin table? 应用中心用于账号管理的连接
---@field db table? 当前业务库
local Database = class()

Database.commands = { find = "find", find_one = "find_one", insert = "insert", replace_one = "replace_one",
    provision = "provision", revoke = "revoke" }

function Database:ctor()
    self.admin = nil
    self.client = nil
    self.db = nil
end

-- 重复创建同定义的空集合是幂等的。只有实际能写入分配的库，业务节点才就绪。
local function confirm_app_database(db)
    local reply = db:runCommand("create", "_app_center", "writeConcern", { w = 1, j = true })
    assert(reply.ok == 1 and not reply.writeConcernError, "无法确认应用专属库的写权限")
end

function Database:init()
    local database = config.database
    assert(database.password and database.password ~= "", "数据库密码未配置")
    self.client = mongo.client(database)
    self.db = self.client:getDB(database.name)
    if config.application.id then confirm_app_database(self.db) end
    if config.database_admin then
        local password = config.database_admin.password
        assert(password and password ~= "", "应用数据库管理密码未配置")
        self.admin = mongo.client({ host = database.host, port = database.port,
            username = "app_provisioner", authdb = "admin", password = password })
    end
    log.info("database", "init", "已连接 host=%s port=%d database=%s", database.host, database.port, database.name)
end

function Database:close()
    if self.client then self.client:disconnect() end
    if self.admin then self.admin:disconnect() end
    self.client, self.db, self.admin = nil, nil, nil
end

local function administration(self, context)
    assert(self.admin and context.source == skynet.localname(".app_center"),
        "仅本机应用中心可管理数据库账号")
    return self.admin
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
    local admin = administration(self, context)
    assert(account.name:match("^app_%x+$") and #account.name == 36 and account.username == account.name,
        "应用数据库标识无效")
    return admin:getDB(config.database_admin.user_authdb)
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
        username = account.username, password = account.password, authdb = config.database_admin.user_authdb })
    local ok = pcall(confirm_app_database, connection:getDB(account.name))
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
