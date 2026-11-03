local channel_name = os.getenv("SKYNET_CFG_CHANNEL")
if not channel_name or channel_name == "" then
    channel_name = "develop"
end
if not channel_name:match("^[%a][%w_]*$") then
    error("SKYNET_CFG_CHANNEL 只能包含字母、数字和下划线，且必须以字母开头")
end

local common = require("etc.cfg.common")
local loaded, channel_config = pcall(require, "etc.cfg.channel." .. channel_name)
if not loaded then
    error(
        string.format(
            "无法加载服务器渠道配置 %s: %s",
            channel_name,
            tostring(channel_config)
        )
    )
end

return require("etc.cfg.loader").build(common, channel_config, channel_name)
