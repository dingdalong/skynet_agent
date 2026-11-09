#define _GNU_SOURCE
#include <lua.h>
#include <lauxlib.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <errno.h>
#include <fcntl.h>
#include <spawn.h>
#include <string.h>
#include <unistd.h>
#ifdef __APPLE__
#include <util.h>
#else
#include <pty.h>
#endif

typedef struct { pid_t pid; int output, error, control, done, code; } Process;

static int safe_fd(int fd) {
    int moved = fcntl(fd, F_DUPFD_CLOEXEC, 10);
    close(fd);
    return moved;
}

static int pair(int result[2]) {
    int sockets[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, sockets) < 0) return -1;
    result[0] = safe_fd(sockets[0]); result[1] = safe_fd(sockets[1]);
    return result[0] < 0 || result[1] < 0 ? -1 : 0;
}

static Process *check(lua_State *L) { return luaL_checkudata(L, 1, "agent.process"); }

static int poll_process(lua_State *L) {
    Process *p = check(L);
    if (!p->done) {
        int status;
        pid_t result = waitpid(p->pid, &status, WNOHANG);
        if (result == p->pid) {
            p->done = 1;
            p->code = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
        } else if (result < 0 && errno != EINTR) return luaL_error(L, "waitpid: %s", strerror(errno));
    }
    if (p->done) lua_pushinteger(L, p->code); else lua_pushnil(L);
    return 1;
}

static int terminate(lua_State *L) {
    Process *p = check(L);
    if (p->control >= 0) {
        /* Closing the private control socket also handles parent death. */
        close(p->control); p->control = -1;
    }
    return 0;
}

static int release(lua_State *L) {
    Process *p = check(L);
    terminate(L);
    if (p->output >= 0) { close(p->output); p->output = -1; }
    if (p->error >= 0) { close(p->error); p->error = -1; }
    if (!p->done) {
        int status;
        if (waitpid(p->pid, &status, WNOHANG) == p->pid) p->done = 1;
    }
    return 0;
}

static int fds(lua_State *L) {
    Process *p = check(L);
    lua_pushinteger(L, p->output);
    if (p->error >= 0) lua_pushinteger(L, p->error); else lua_pushnil(L);
    return 2;
}

static int spawn_process(lua_State *L) {
    const char *launcher = luaL_checkstring(L, 1), *cwd = luaL_checkstring(L, 2);
    luaL_checktype(L, 3, LUA_TTABLE); luaL_checktype(L, 4, LUA_TTABLE);
    int tty = lua_toboolean(L, 5);
    size_t argc = lua_rawlen(L, 3), envc = lua_rawlen(L, 4);
    luaL_argcheck(L, argc > 0 && argc <= 256 && envc <= 128, 3, "invalid argv/env size");
    luaL_checkstack(L, (int)(argc + envc + 16), "argv/env too large");
    char **args = lua_newuserdatauv(L, (argc + 4) * sizeof(char *), 0);
    args[0] = (char *)launcher; args[1] = tty ? "tty" : "pipe"; args[2] = (char *)cwd;
    for (size_t i = 0; i < argc; ++i) { lua_rawgeti(L, 3, i + 1); args[i + 3] = (char *)luaL_checkstring(L, -1); }
    args[argc + 3] = NULL;
    char **env = lua_newuserdatauv(L, (envc + 1) * sizeof(char *), 0);
    for (size_t i = 0; i < envc; ++i) { lua_rawgeti(L, 4, i + 1); env[i] = (char *)luaL_checkstring(L, -1); }
    env[envc] = NULL;
    int control[2] = {-1, -1}, output[2] = {-1, -1}, errors[2] = {-1, -1};
    int input = -1, slave = -1, code = 0;
    if (pair(control) < 0) goto failed;
    if (tty) {
        int master;
        if (openpty(&master, &slave, NULL, NULL, NULL) < 0) goto failed;
        output[0] = safe_fd(master); slave = safe_fd(slave);
        if (output[0] < 0 || slave < 0) goto failed;
        input = slave; output[1] = slave;
    } else {
        if (pair(output) < 0 || pair(errors) < 0) goto failed;
        input = safe_fd(open("/dev/null", O_RDONLY));
        if (input < 0) goto failed;
    }
    posix_spawn_file_actions_t actions;
    posix_spawn_file_actions_init(&actions);
    posix_spawn_file_actions_adddup2(&actions, input, 0);
    posix_spawn_file_actions_adddup2(&actions, output[1], 1);
    posix_spawn_file_actions_adddup2(&actions, tty ? slave : errors[1], 2);
    posix_spawn_file_actions_adddup2(&actions, control[1], 3);
    pid_t pid;
    code = posix_spawn(&pid, launcher, &actions, NULL, args, env);
    posix_spawn_file_actions_destroy(&actions);
    if (code) { errno = code; goto failed; }
    close(control[1]); close(output[1]);
    if (!tty) { close(input); close(errors[1]); }
    Process *p = lua_newuserdatauv(L, sizeof(*p), 0);
    *p = (Process){.pid = pid, .output = output[0], .error = errors[0], .control = control[0]};
    luaL_setmetatable(L, "agent.process"); return 1;
failed:
    code = errno;
    if (input >= 0 && input != output[1]) close(input);
    for (int i = 0; i < 2; ++i) {
        if (control[i] >= 0) close(control[i]);
        if (output[i] >= 0) close(output[i]);
        if (errors[i] >= 0) close(errors[i]);
    }
    return luaL_error(L, "process spawn: %s", strerror(code));
}

int luaopen_agent_process(lua_State *L) {
    luaL_newmetatable(L, "agent.process");
    const luaL_Reg methods[] = {{"poll", poll_process}, {"terminate", terminate}, {"close", release},
        {"fds", fds}, {"__gc", release}, {NULL, NULL}};
    luaL_setfuncs(L, methods, 0); lua_pushvalue(L, -1); lua_setfield(L, -2, "__index");
    const luaL_Reg functions[] = {{"spawn", spawn_process}, {NULL, NULL}};
    luaL_newlib(L, functions); return 1;
}
