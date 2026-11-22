-- 此夹具只验证节点生命周期。
local Service = require("class")()
Service.commands = {}
function Service:ctor() end
package.loaded.database = Service
require("service").start("database")
