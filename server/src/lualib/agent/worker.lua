local Worker = {}

function Worker.main(input_path)
    local cjson = require("cjson")
    local input = assert(io.open(input_path, "rb"))
    local request = cjson.decode(input:read("a"))
    input:close()
    local result = require("agent.tools.apply_patch").apply(request.patch, request.workspace, request.mode)
    io.write(assert(cjson.encode(result)), "\n")
    if not result.ok then os.exit(1) end
end

return Worker
