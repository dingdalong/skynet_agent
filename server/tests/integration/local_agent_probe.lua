local gateway = require("integration.gateway_socket")
local support = require("integration.support")

local function check_version(client)
    local expected = assert(os.getenv("AGENT_TEST_IMAGE"))
    local running = os.getenv("AGENT_RUNNING_IMAGE")
    local unlock = client:request("AppCenterUnlockReq", { token = assert(os.getenv("APP_CENTER_ADMIN_TOKEN")) })
    support.equal(unlock.ret, 1, "无法读取本机审批记录")
    local catalog = client:request("AppCenterListReq")
    support.equal(catalog.ret, 1)
    for _, service in ipairs(catalog.services) do
        if service.app_id == "agent" then
            local approved = service.approved and service.approved.image_id
            local pending = service.pending
            print("本次构建", expected, "已批准", approved or "无",
                "运行中", running ~= "" and running or "无")
            if pending then print("待审申请", pending.request_id, "对应镜像", pending.image_id) end
            if approved ~= expected then
                if pending and pending.image_id == expected then
                    error("本次镜像待审，请在应用中心核对并批准")
                end
                if pending then
                    error("待审申请指向其他镜像，请核对后再提交本次版本")
                end
                error("本次镜像尚未提交，请通过 server/appctl submit 提交 Agent 更新")
            end
            assert(service.enabled and running == expected, "已批准版本尚未运行，请检查本机应用状态")
            return
        end
    end
    error("本机应用中心尚未登记 Agent")
end

local function check_history(url)
    local client, snapshot = gateway.login(url, "local-agent-e2e")
    local id
    if not snapshot.chat_sessions[1] then
        -- 首次从业务入口建立样本，以后复用，避免每次调用模型。
        local created = client:send_message(nil, "请只回复：历史验收成功。无需使用工具。", 12000)
        support.equal(created.messages[#created.messages].status, require("agent.message_status").completed)
        id = created.id
        client:close()
        client, snapshot = gateway.login(url, "local-agent-e2e")
    end
    local found = false
    for _, chat in ipairs(snapshot.chat_sessions) do
        support.equal(#chat.session.messages, 0, "登录快照包含消息正文")
        id = id or chat.session.id
        if chat.session.id == id then found = true end
    end
    assert(found, "会话未列出")
    local recent = client:history(id)
    support.equal(recent.id, id)
    assert(#recent.messages > 0, "最近一页为空")
    -- 短会话只有一页，使用最后一条消息的位置验证游标的排他边界。
    local before = recent.message_start
    if before == 0 then before = #recent.messages - 1 end
    assert(before > 0, "会话缺少可验证的上一条消息")
    local earlier = client:history(id, before)
    support.equal(earlier.id, id)
    assert(#earlier.messages > 0, "旧页为空")
    support.equal(earlier.message_start + #earlier.messages, before)
    if recent.message_start == 0 then
        support.equal(earlier.messages[#earlier.messages].id, recent.messages[before].id)
    else
        assert(earlier.messages[#earlier.messages].id ~= recent.messages[1].id, "翻页边界出现重复消息")
    end
    client:close()
    print("本机 Gateway 登录、会话列表、最近消息和向前翻页均已通过", url)
end

return {
    run = function(config)
        local client = gateway.AgentSocket:new(config.gateway_url):connect()
        support.equal(client:request("LoginReq", { username = "local-agent-e2e" }).ret, 1)
        check_version(client)
        client:close()
        check_history(config.gateway_url)
    end
}
