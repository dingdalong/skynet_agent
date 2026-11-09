#include "agent_runtime.h"
#include <errno.h>
#include <lauxlib.h>
#include <lua.h>
#include <string.h>
typedef struct {
    ar_process *handle;
} Process;
static Process *check(lua_State *L) { return luaL_checkudata(L, 1, "agent.process"); }
static int poll_process(lua_State *L) {
    int code;
    Process *p = check(L);
    if (!p->handle)
        return luaL_error(L, "process closed");
    int done = ar_poll(p->handle, &code);
    if (done < 0)
        return luaL_error(L, "%s", strerror(errno));
    if (done)
        lua_pushinteger(L, code);
    else
        lua_pushnil(L);
    return 1;
}
static int terminate(lua_State *L) {
    ar_terminate(check(L)->handle);
    return 0;
}
static int release(lua_State *L) {
    Process *p = check(L);
    ar_close(p->handle);
    p->handle = NULL;
    return 0;
}
static int fds(lua_State *L) {
    int output, errors;
    Process *p = check(L);
    if (!p->handle)
        return luaL_error(L, "process closed");
    ar_take_fds(p->handle, &output, &errors);
    lua_pushinteger(L, output);
    if (errors >= 0)
        lua_pushinteger(L, errors);
    else
        lua_pushnil(L);
    return 2;
}
static int spawn_process(lua_State *L) {
    const char *launcher = luaL_checkstring(L, 1), *cwd = luaL_checkstring(L, 2);
    luaL_checktype(L, 3, LUA_TTABLE);
    luaL_checktype(L, 4, LUA_TTABLE);
    size_t argc = lua_rawlen(L, 3), envc = lua_rawlen(L, 4);
    luaL_argcheck(L, argc > 0 && argc <= 256 && envc <= 128, 3, "invalid argv/env size");
    luaL_checkstack(L, (int)(argc + envc + 16), "argv/env too large");
    const char **argv = lua_newuserdatauv(L, (argc + 1) * sizeof(char *), 0);
    const char **env = lua_newuserdatauv(L, (envc + 1) * sizeof(char *), 0);
    for (size_t i = 0; i < argc; ++i) {
        lua_rawgeti(L, 3, i + 1);
        argv[i] = luaL_checkstring(L, -1);
    }
    for (size_t i = 0; i < envc; ++i) {
        lua_rawgeti(L, 4, i + 1);
        env[i] = luaL_checkstring(L, -1);
    }
    argv[argc] = env[envc] = NULL;
    ar_process *handle = ar_spawn(launcher, cwd, argv, env, lua_toboolean(L, 5));
    if (!handle)
        return luaL_error(L, "process spawn: %s", strerror(errno));
    Process *p = lua_newuserdatauv(L, sizeof(*p), 0);
    p->handle = handle;
    luaL_setmetatable(L, "agent.process");
    return 1;
}
int luaopen_agent_process(lua_State *L) {
    luaL_newmetatable(L, "agent.process");
    const luaL_Reg methods[] = {{"poll", poll_process}, {"terminate", terminate}, {"close", release},
                                {"fds", fds},           {"__gc", release},        {NULL, NULL}};
    luaL_setfuncs(L, methods, 0);
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");
    const luaL_Reg functions[] = {{"spawn", spawn_process}, {NULL, NULL}};
    luaL_newlib(L, functions);
    return 1;
}
