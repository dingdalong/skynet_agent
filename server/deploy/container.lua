#!./3rd/skynet/3rd/lua/lua
package.cpath = "./luaclib/?.so;" .. package.cpath
local json = require("cjson")
local action, app, image = table.unpack(arg)
local project = assert(os.getenv("APP_PROJECT"))
assert(project:match("^[a-z0-9][a-z0-9_-]*$") and app:match("^[a-z][a-z0-9-]*$") and #app <= 63, "项目或应用 ID 无效")
local name = project .. "-app-" .. app
local labels = { ["io.skynet.project"] = project, ["io.skynet.app"] = app }
local curl = "curl -q --silent --show-error --noproxy '*' --max-time 20 --unix-socket /var/run/docker.sock"

local function escape(value)
    return (value:gsub("[^%w._~-]", function(byte) return string.format("%%%02X", byte:byte()) end))
end

local function request(method, path, missing)
    local pipe = assert(io.popen(curl .. " -X " .. method .. " -w '%{http_code}' 'http://localhost" .. path .. "'"))
    local output = pipe:read("a")
    assert(pipe:close(), "Docker 请求失败 " .. method .. " " .. path)
    local status = tonumber(output:sub(-3))
    if missing and status == 404 then return nil end
    assert(status == 200 or status == 201 or status == 204 or status == 304,
        string.format("Docker %s %s HTTP %s", method, path, status))
    if #output > 3 then return json.decode(output:sub(1, -4)) end
end

local function image_id()
    return assert(request("GET", "/images/" .. escape(image) .. "/json").Id)
end

local function inspect()
    local record = request("GET", "/containers/" .. name .. "/json", true)
    if record then
        for key, value in pairs(labels) do
            assert(record.Config.Labels[key] == value, "容器名已被其他应用占用")
        end
    end
    return record
end

local function environment(record)
    local env = {}
    for _, entry in ipairs(record.Config.Env) do
        local key, value = entry:match("^([^=]+)=(.*)$")
        env[key] = value
    end
    return env
end

local function registration_key()
    local random <close> = assert(io.open("/dev/urandom", "rb"))
    local bytes = assert(random:read(32))
    assert(#bytes == 32)
    return (bytes:gsub(".", function(byte) return string.format("%02x", byte:byte()) end))
end

local function start(record)
    local database = json.decode(io.read("a"))
    local env = {
        APP_ID = app,
        NODE_CONTROL_FILES = "1",
        APP_CENTER_PORT = assert(os.getenv("APP_CENTER_PORT")),
        SKYNET_CFG_CHANNEL = assert(os.getenv("SKYNET_CFG_CHANNEL"))
    }
    local host = { NetworkMode = "host", Init = true, CapDrop = { "ALL" }, SecurityOpt = { "no-new-privileges:true" } }
    if app == "agent" then
        for _, key in ipairs({ "APP_INSTANCES", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "DEEPSEEK_BASE_URL", "AGENT_TOOL_TCP_PORTS" }) do
            env[key] = os.getenv(key)
        end
        host.Mounts = { { Type = "volume", Source = project .. "_agent-work", Target = "/work" } }
    end
    local id = image_id()
    if record then
        local current = environment(record)
        local same = record.Image == id
        for key, value in pairs(env) do same = same and current[key] == value end
        -- JSON 对象的键顺序独立于数据库配置是否变更。
        local ok, previous = pcall(json.decode, current.APP_DATABASE_CONFIG or "")
        same = same and ok and type(previous) == "table"
        if same then
            for key, value in pairs(database) do same = same and previous[key] == value end
            for key in pairs(previous) do same = same and database[key] ~= nil end
        end
        if not same then
            if record.State.Running then return 3 end
            request("DELETE", "/containers/" .. escape(record.Id))
            record = nil
        end
    end
    if not record then
        env.APP_REGISTRATION_KEY = registration_key()
        env.APP_DATABASE_CONFIG = json.encode(database)
        local entries = {}
        for key, value in pairs(env) do entries[#entries + 1] = key .. "=" .. value end
        -- Docker 的创建请求包含凭据，只通过 curl 的标准输入发送。
        local pipe = assert(io.popen(curl .. " --fail -o /dev/null -H 'Content-Type: application/json' "
            .. "--data-binary @- 'http://localhost/containers/create?name=" .. name .. "'", "w"))
        assert(pipe:write(json.encode({ Image = image, Labels = labels, Env = entries, HostConfig = host })))
        assert(pipe:close(), "创建应用容器失败 " .. name)
        record = assert(inspect())
    end
    if not record.State.Running then request("POST", "/containers/" .. escape(record.Id) .. "/start") end
    return 0
end

local function operate()
    if action == "resolve" then return { image_id = image_id() } end
    local record = inspect()
    if action == "start" then os.exit(start(record)) end
    if action == "inspect" then
        if record and record.State.Running then
            return {
                running = true,
                key = assert(environment(record)
                    .APP_REGISTRATION_KEY)
            }
        end
        return { running = false }
    end
    assert(action == "wait" or action == "stop" or action == "remove", "未知容器操作")
    if record then
        local path = "/containers/" .. escape(record.Id)
        if action == "stop" and record.State.Running then request("POST", path .. "/stop") end
        if action == "wait" then
            local status = request("POST", path .. "/wait").StatusCode
            assert(status == 0, "应用退出码 " .. tostring(status))
        end
        assert(not request("GET", path .. "/json").State.Running, "应用仍在运行")
        if action == "remove" then request("DELETE", path) end
    end
    return { exit_code = 0 }
end

print(json.encode(operate()))
