local app, entry, directory = ...
package.path = "src/lualib/?.lua;src/lualib/base/?.lua;3rd/lua-protobuf/?.lua;" .. package.path
package.cpath = "luaclib/?.so;" .. package.cpath
require("helper.protobuf").load(directory or "../common/proto", entry)
local codec = require("network.protocol"):new()
codec:init(app)
codec:validate()
