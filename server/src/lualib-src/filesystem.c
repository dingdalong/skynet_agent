#include "agent_runtime.h"
#include <errno.h>
#include <lauxlib.h>
#include <lua.h>
#include <string.h>
static int real_path(lua_State *L) {
    char *value = ar_realpath(luaL_checkstring(L, 1));
    if (!value) {
        lua_pushnil(L);
        lua_pushstring(L, strerror(errno));
        return 2;
    }
    lua_pushstring(L, value);
    ar_free(value);
    return 1;
}
static int temporary_file(lua_State *L) {
    size_t n;
    const char *text = luaL_checklstring(L, 1, &n);
    char *value = ar_temporary_file(text, n);
    if (!value)
        return luaL_error(L, "temporary file: %s", strerror(errno));
    lua_pushstring(L, value);
    ar_free(value);
    return 1;
}
static int read_file(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    lua_Integer limit = luaL_checkinteger(L, 2);
    luaL_argcheck(L, limit >= 0, 2, "invalid read limit");
    size_t n;
    char *value = ar_read_file(path, (size_t)limit, &n);
    if (!value)
        return luaL_error(L, "read file: %s", strerror(errno));
    lua_pushlstring(L, value, n);
    ar_free(value);
    return 1;
}
static int atomic_write(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    size_t n;
    const char *text = luaL_checklstring(L, 2, &n);
    if (ar_atomic_write(path, text, n, lua_toboolean(L, 3)))
        return luaL_error(L, "write file: %s", strerror(errno));
    lua_pushboolean(L, 1);
    return 1;
}
static int remove_file(lua_State *L) {
    if (ar_remove_file(luaL_checkstring(L, 1)))
        return luaL_error(L, "remove file: %s", strerror(errno));
    lua_pushboolean(L, 1);
    return 1;
}
static int sandbox(lua_State *L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    const char *root = luaL_checkstring(L, 2);
    size_t count = lua_rawlen(L, 1), deps = lua_istable(L, 3) ? lua_rawlen(L, 3) : 0;
    luaL_argcheck(L, count <= 256 && deps <= 128, 1, "too many arguments");
    luaL_checkstack(L, count + deps + 16, "arguments too large");
    const char **argv = lua_newuserdatauv(L, (count + 1) * sizeof(char *), 0);
    const char **paths = lua_newuserdatauv(L, (deps + 1) * sizeof(char *), 0);
    for (size_t i = 0; i < count; ++i) {
        lua_rawgeti(L, 1, i + 1);
        argv[i] = luaL_checkstring(L, -1);
    }
    for (size_t i = 0; i < deps; ++i) {
        lua_rawgeti(L, 3, i + 1);
        paths[i] = luaL_checkstring(L, -1);
    }
    argv[count] = paths[deps] = NULL;
    char **result = ar_sandbox(argv, root, paths);
    if (!result)
        return luaL_error(L, "sandbox: %s", strerror(errno));
    lua_newtable(L);
    for (int i = 0; result[i]; ++i) {
        lua_pushstring(L, result[i]);
        lua_rawseti(L, -2, i + 1);
    }
    ar_argv_free(result);
    return 1;
}
static int prepare_patch(lua_State *L) {
    char *result = ar_prepare_patch(luaL_checkstring(L, 1), luaL_checkstring(L, 2), lua_toboolean(L, 3));
    if (!result)
        return luaL_error(L, "patch: %s", strerror(errno));
    lua_pushstring(L, result);
    ar_free(result);
    return 1;
}
int luaopen_agent_filesystem(lua_State *L) {
    const luaL_Reg functions[] = {{"realpath", real_path},          {"temporary_file", temporary_file},
                                  {"read_file", read_file},         {"atomic_write", atomic_write},
                                  {"remove_file", remove_file},     {"sandbox", sandbox},
                                  {"prepare_patch", prepare_patch}, {NULL, NULL}};
    luaL_newlib(L, functions);
    return 1;
}
