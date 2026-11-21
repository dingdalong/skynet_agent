local skynet = require("skynet")
local queue = require("skynet.queue")
local crypt = require("skynet.crypt")
local Deployment = require("app_center.deployment")
local Catalog = {}

local function store(center, action, record)
    return skynet.call(center.store, "lua", action, record)
end

local function save(center, doc)
    doc.revision = (doc.revision or 0) + 1
    if not store(center, "save", doc) then
        center.uncertain[doc._id] = true
        error("数据库写入未确认，请重试", 0)
    end
    center.documents[doc._id] = doc
end

function Catalog.refresh(center, id)
    if not center.uncertain[id] then return end
    local current = assert(store(center, "get", { _id = id }), "数据库暂时不可用")
    center.documents[id] = current._id and current or nil
    center.uncertain[id] = nil
end

function Catalog.lock(center, id)
    center.locks[id] = center.locks[id] or queue()
    return center.locks[id]
end

function Catalog.open(center)
    center.store = skynet.newservice("catalog_store")
    local documents = assert(store(center, "load"), "无法读取应用目录")
    for _, doc in ipairs(documents) do center.documents[doc._id] = doc end
end

local function same(left, right)
    return left and left.name == right.name and left.image == right.image and left.image_id == right.image_id
end

function Catalog.submit(center, id, args)
    assert(type(args.name) == "string" and #args.name > 0 and #args.name <= 128 and utf8.len(args.name),
        "应用名称无效")
    assert(type(args.image) == "string" and #args.image <= 255 and args.image:match("^[%w][%w./_:@%-]*$"),
        "镜像名称无效")
    local image_id = assert(Deployment.manage(args, "resolve").image_id)
    local candidate = { name = args.name, image = args.image, image_id = image_id }
    local doc = table.copy(center.documents[id] or { _id = id })
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

function Catalog.review(center, id, args, reviewer)
    local doc = table.copy(assert(center.documents[id], "未找到申请"))
    local accepted = args.approve == true
    if doc.last and doc.last.request_id == args.request_id then
        assert(doc.last.accepted == accepted, "该申请已完成审批")
        return
    end
    assert(doc.pending and doc.pending.request_id == args.request_id, "待审申请已变更")
    doc.last = { request_id = args.request_id, accepted = accepted, reviewer = reviewer,
        name = doc.pending.name, image = doc.pending.image, image_id = doc.pending.image_id }
    if accepted then
        if not doc.approved or doc.removed then doc.desired = true end
        doc.approved, doc.removed = doc.pending, nil
    end
    doc.pending = nil
    save(center, doc)
end

function Catalog.remove(center, id)
    local doc = table.copy(assert(center.documents[id], "应用未登记"))
    assert(doc.approved, "应用尚未批准")
    if doc.removed then return end
    doc.removed, doc.desired, doc.pending = true, false, nil
    save(center, doc)
end

function Catalog.can_set_enabled(doc)
    return doc.approved ~= nil and not doc.removed
end

function Catalog.set(center, id, desired)
    local doc = table.copy(assert(center.documents[id], "应用未登记"))
    assert(Catalog.can_set_enabled(doc), "应用尚未上架")
    if doc.desired == desired then return end
    doc.desired = desired
    save(center, doc)
end

return Catalog
