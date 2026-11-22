local class = require("class")
local Database = class()
function Database:ctor() end
Database.commands = { user_identity = "user_identity" }
function Database:user_identity(_, name)
    return { username = name, user_id = "fixture-" .. name }
end
package.loaded.database = Database
require("service").start("database")
