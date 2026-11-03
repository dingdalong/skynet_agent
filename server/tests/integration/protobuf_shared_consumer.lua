local skynet = require("skynet")
local protobuf = require("helper.protobuf")

skynet.start(function()
    local ok, err = xpcall(function()
        protobuf.attach()
        local encoded = protobuf.encode("example.Ping", {
            text = "shared",
            count = 7,
            tags = { "vm" },
            metadata = { source = "consumer" },
        })
        local decoded = protobuf.decode("example.Ping", encoded)
        assert(decoded.text == "shared")
        assert(decoded.count == 7)
        assert(decoded.tags[1] == "vm")
        assert(decoded.metadata.source == "consumer")
    end, debug.traceback)

    if ok then
        io.stderr:write("PROTOBUF_SHARED_OK\n")
    else
        io.stderr:write("PROTOBUF_SHARED_FAILED: " .. tostring(err) .. "\n")
    end
    io.stderr:flush()
    os.exit(ok and 0 or 1)
end)
