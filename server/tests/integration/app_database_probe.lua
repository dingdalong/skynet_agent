local skynet = require("skynet")
require("skynet.manager")
local rpc = require("rpc")
local codes = require("enum.error_code")
local config = require("etc.cfg")
local mongo = require("skynet.db.mongo")

-- 在实际业务容器中使用该容器的环境启动独立探针，不影响正在处理请求的节点。
local function check()
    assert(not config.database_admin and not os.getenv("APP_CENTER_MONGO_PASSWORD"))
    assert(not os.getenv("MONGO_BOOTSTRAP_PASSWORD") and not os.getenv("MONGO_INITDB_ROOT_PASSWORD"))
    assert(not os.getenv("APP_CENTER_MONGO_PROVISION_PASSWORD"))
    skynet.name(".database", skynet.newservice("database"))
    local function call(command, ...)
        local code, result = rpc.call(".database", command, ...)
        assert(code == codes.succ)
        return result
    end
    call("init", {})
    local collection = "isolation_probe"
    local key = { _id = "same-id" }
    if os.getenv("PROBE_ACTION") == "insert" then
        assert(not call("find_one", collection, key))
        assert(call("insert", collection, { _id = key._id, owner = config.application.id }) == 1)
    end
    assert(call("find_one", collection, key).owner == config.application.id)
    -- 使用相同凭据向另一专属库发出普通读写命令，检查 MongoDB 的授权结果。
    local client = mongo.client(config.database)
    local other = client:getDB(assert(os.getenv("PROBE_OTHER_DB")))
    local read = other:runCommand("find", collection, "filter", key)
    local write = other:runCommand("insert", collection, "documents", { { _id = "cross-write" } })
    assert(read.ok == 0 and read.code == 13 and write.ok == 0 and write.code == 13)
    client:disconnect()
    call("close")
end

skynet.start(function()
    local ok, err = xpcall(check, debug.traceback)
    if not ok then io.stderr:write(tostring(err), "\n") end
    os.exit(ok and 0 or 1)
end)
