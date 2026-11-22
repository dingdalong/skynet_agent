local rpc = require("rpc")
local codes = require("enum.error_code")
local queue = require("skynet.queue")
local crypt = require("skynet.crypt")
local Deployment = require("app_center.deployment")
local AppCatalog = {}

local function store(command, ...)
    return rpc.call_timeout(180, ".database", command, "apps", ...)
end

local function save(center, doc)
    doc.revision = (doc.revision or 0) + 1
    local code, count
    if doc.revision == 1 then
        code, count = store("insert", doc)
    else
        code, count = store("replace_one", { _id = doc._id, revision = doc.revision - 1 }, doc)
    end
    if code ~= codes.succ or count ~= 1 then
        center.uncertain[doc._id] = true
        error("数据库写入未确认，请重试", 0)
    end
    center.documents[doc._id] = doc
end

function AppCatalog.refresh(center, id)
    if not center.uncertain[id] then return end
    local code, current = store("find_one", { _id = id })
    assert(code == codes.succ, "数据库暂时不可用")
    center.documents[id] = current
    center.uncertain[id] = nil
end

function AppCatalog.lock(center, id)
    center.locks[id] = center.locks[id] or queue()
    return center.locks[id]
end

-- 私有随机种子让同一次审批在重启后也能重建相同的凭据。
local function allocation_seed()
    local file <close> = assert(io.open("/dev/urandom", "rb"))
    local value = assert(file:read(32))
    assert(#value == 32, "读取数据库随机种子失败")
    return crypt.hexencode(value)
end

local function approve(doc, reviewer)
    local pending = doc.pending
    doc.last = { request_id = pending.request_id, accepted = true, reviewer = reviewer,
        name = pending.name, image = pending.image, image_id = pending.image_id }
    if not doc.approved or doc.removed then doc.desired = true end
    doc.approved, doc.removed, doc.pending = pending, nil, nil
end

local function begin_allocation(center, doc, reviewer)
    doc.database_request = { seed = allocation_seed(),
        request_id = reviewer and doc.pending.request_id, reviewer = reviewer }
    save(center, doc)
end

function AppCatalog.finish_allocation(center, id)
    local doc = table.copy(center.documents[id])
    local request = assert(doc.database_request)
    if request.request_id then
        assert(doc.pending and doc.pending.request_id == request.request_id, "审批记录与数据库分配不一致")
    end
    local code, account = rpc.call_no_timeout(".database", "provision", request.seed)
    assert(code == codes.succ, "创建应用数据库未完成，请重试")
    if request.request_id then approve(doc, request.reviewer) end
    account.state = "ready"
    doc.database, doc.database_request = account, nil
    save(center, doc)
end

function AppCatalog.archive_database(center, id)
    local doc = table.copy(center.documents[id])
    if not doc.database then return end
    assert(doc.removed and doc.database.state == "revoking", "应用数据库未进入撤销流程")
    local code = rpc.call_no_timeout(".database", "revoke", doc.database)
    assert(code == codes.succ, "数据库账号撤销未完成，请重试")
    doc.archived_databases = table.copy(doc.archived_databases or {})
    table.insert(doc.archived_databases, doc.database.name)
    doc.database = nil
    save(center, doc)
end

function AppCatalog.open(center)
    local code, documents = store("find")
    assert(code == codes.succ, "无法读取应用目录")
    for _, doc in ipairs(documents) do
        center.documents[doc._id] = doc
        if doc.approved and not doc.removed and not doc.database then
            if not doc.database_request then
                Deployment.manage({ app_id = doc._id, image = doc.approved.image_id }, "stop")
                begin_allocation(center, table.copy(doc))
            end
            AppCatalog.finish_allocation(center, doc._id)
        end
    end
end

local function same(left, right)
    return left and left.name == right.name and left.image == right.image and left.image_id == right.image_id
end

function AppCatalog.submit(center, id, args)
    assert(type(args.name) == "string" and #args.name > 0 and #args.name <= 128 and utf8.len(args.name),
        "应用名称无效")
    local image_id = assert(Deployment.manage(args, "resolve").image_id)
    local candidate = { name = args.name, image = args.image, image_id = image_id }
    local doc = table.copy(center.documents[id] or { _id = id })
    assert(not doc.database_request and (not doc.database or doc.database.state == "ready"), "数据库变更未完成")
    if doc.pending then
        assert(same(doc.pending, candidate), "已有其他待审申请")
        return doc.pending.request_id
    end
    assert(doc.removed or not same(doc.approved, candidate), "此版本已获批准")
    candidate.request_id = crypt.hexencode(crypt.randomkey() .. crypt.randomkey())
    doc.pending = candidate
    save(center, doc)
    return candidate.request_id
end

function AppCatalog.review(center, id, args, reviewer)
    local doc = table.copy(assert(center.documents[id], "未找到申请"))
    local accepted = args.approve == true
    if doc.last and doc.last.request_id == args.request_id then
        assert(doc.last.accepted == accepted, "该申请已完成审批")
        return
    end
    assert(doc.pending and doc.pending.request_id == args.request_id, "待审申请已变更")
    if doc.database_request then
        assert(accepted and doc.database_request.request_id == args.request_id,
            "数据库分配对应的审批已开始")
        return AppCatalog.finish_allocation(center, id)
    end
    assert(not doc.database or doc.database.state == "ready", "数据库变更未完成，请重试")
    if accepted then
        if not doc.database then
            begin_allocation(center, doc, reviewer)
            return AppCatalog.finish_allocation(center, id)
        end
        approve(doc, reviewer)
    else
        doc.last = { request_id = doc.pending.request_id, accepted = false, reviewer = reviewer,
            name = doc.pending.name, image = doc.pending.image, image_id = doc.pending.image_id }
        doc.pending = nil
    end
    save(center, doc)
end

function AppCatalog.remove(center, id)
    local doc = table.copy(assert(center.documents[id], "应用未登记"))
    assert(doc.approved, "应用尚未批准")
    assert(not doc.database_request, "数据库分配未完成，请重试")
    if doc.removed then return end
    if doc.database then
        doc.database = table.copy(doc.database)
        doc.database.state = "revoking"
    end
    doc.removed, doc.desired, doc.pending = true, false, nil
    save(center, doc)
end

function AppCatalog.can_set_enabled(doc)
    return doc.approved ~= nil and not doc.removed
end

function AppCatalog.set(center, id, desired)
    local doc = table.copy(assert(center.documents[id], "应用未登记"))
    assert(AppCatalog.can_set_enabled(doc), "应用尚未上架")
    if doc.desired == desired then return end
    doc.desired = desired
    save(center, doc)
end

return AppCatalog
