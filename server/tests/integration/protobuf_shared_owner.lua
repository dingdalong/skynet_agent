local skynet = require("skynet")
local protobuf = require("helper.protobuf")

skynet.start(function()
    assert(protobuf.load("tests/fixtures/protobuf"))
    local consumer = skynet.newservice("protobuf_shared_consumer")
    skynet.error(string.format("[protobuf_shared] consumer=%s", skynet.address(consumer)))
end)
