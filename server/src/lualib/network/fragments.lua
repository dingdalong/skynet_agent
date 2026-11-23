-- 每个分片都是独立的 WebSocket 二进制消息。偏移按完整公共帧的字节数计算。
local Fragments = { size = 65536 }
local marker = 5
local header = ">BI4I4"

function Fragments.write(packet, maximum, send)
    assert(#packet <= maximum, "业务消息超过连接上限")
    if #packet <= Fragments.size then
        send(packet)
        return
    end
    for offset = 0, #packet - 1, Fragments.size do
        send(string.pack(header, marker, #packet, offset) .. packet:sub(offset + 1, offset + Fragments.size))
    end
end

-- 半包状态仅由当前连接的读协程持有。
function Fragments.receive(state, message, maximum)
    if message:byte() ~= marker then
        assert(not state.parts and #message <= math.min(maximum, Fragments.size), "无效的未分片消息")
        return message
    end
    local _, total, offset, start = string.unpack(header, message)
    if total > maximum then return nil, "业务消息超过连接上限 " .. maximum .. " 字节" end
    assert(total > Fragments.size, "小业务包不能分片")
    local length = #message - start + 1
    assert(offset == (state.offset or 0) and (not state.total or state.total == total)
        and length <= math.min(Fragments.size, total - offset) and length > 0, "无效的业务消息分片")
    if not state.parts then state.parts, state.batch = {}, {} end
    state.batch[#state.batch + 1] = message:sub(start)
    state.total, state.offset = total, offset + length
    -- 即使对端每次只发一个字节，也只为当前 64 KiB 保留零碎字符串。
    if state.offset // Fragments.size ~= offset // Fragments.size or state.offset == total then
        state.parts[#state.parts + 1] = table.concat(state.batch)
        state.batch = {}
    end
    if state.offset == total then
        local packet = table.concat(state.parts)
        state.parts, state.batch, state.total, state.offset = nil, nil, nil, nil
        return packet
    end
end

return Fragments
