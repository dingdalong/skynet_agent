#define _GNU_SOURCE
#include <lua.h>
#include <lauxlib.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <signal.h>
#include <spawn.h>
#include <stdio.h>
#include <stdlib.h>
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

static int real_path(lua_State *L) {
    char path[PATH_MAX];
    if (!realpath(luaL_checkstring(L, 1), path)) {
        lua_pushnil(L); lua_pushstring(L, strerror(errno)); return 2;
    }
    lua_pushstring(L, path); return 1;
}

static int temporary_file(lua_State *L) {
    size_t size;
    const char *content = luaL_checklstring(L, 1, &size);
    char path[] = "/tmp/skynet-agent-XXXXXX";
    int fd = mkstemp(path);
    if (fd < 0) return luaL_error(L, "mkstemp: %s", strerror(errno));
    size_t written = 0;
    while (written < size) {
        ssize_t count = write(fd, content + written, size - written);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) { close(fd); unlink(path); return luaL_error(L, "temporary file write failed"); }
        written += (size_t)count;
    }
    close(fd);
    char resolved[PATH_MAX];
    if (!realpath(path, resolved)) { unlink(path); return luaL_error(L, "temporary file realpath failed"); }
    lua_pushstring(L, resolved);
    return 1;
}

/* Walk each parent through descriptors so a swapped symlink cannot redirect file access. */
static int parent_directory(const char *path, char **storage, char **name) {
    if (path[0] != '/') { errno = EINVAL; return -1; }
    *storage = strdup(path + 1);
    if (!*storage) return -1;
#ifdef __APPLE__
    int directory_flags = O_SEARCH | O_DIRECTORY | O_CLOEXEC;
#else
    int directory_flags = O_PATH | O_DIRECTORY | O_CLOEXEC;
#endif
    int fd = open("/", directory_flags);
    char *part = *storage, *slash;
    while (fd >= 0 && (slash = strchr(part, '/'))) {
        *slash = '\0';
        int next = openat(fd, part, directory_flags | O_NOFOLLOW);
        int saved = errno;
        close(fd); fd = next; errno = saved;
        part = slash + 1;
    }
    *name = part;
    if (fd < 0 || !*part || strcmp(part, ".") == 0 || strcmp(part, "..") == 0) {
        if (fd >= 0) close(fd);
        free(*storage); *storage = NULL;
        errno = EINVAL;
        return -1;
    }
    return fd;
}

static int read_file(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    lua_Integer limit = luaL_checkinteger(L, 2);
    luaL_argcheck(L, limit >= 0 && (lua_Unsigned)limit < (size_t)-1, 2, "invalid read limit");
    char *storage = NULL, *name;
    int directory = parent_directory(path, &storage, &name);
    if (directory < 0) return luaL_error(L, "read parent: %s", strerror(errno));
    /* O_NONBLOCK prevents a concurrent replacement with a FIFO from blocking the service. */
    int fd = openat(directory, name, O_RDONLY | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK);
    int code = fd < 0 ? errno : 0;
    close(directory); free(storage);
    if (code) return luaL_error(L, "open file: %s", strerror(code));
    struct stat metadata;
    if (fstat(fd, &metadata) < 0) code = errno;
    else if (!S_ISREG(metadata.st_mode)) code = EINVAL;
    if (code) { close(fd); return luaL_error(L, "read file: %s", strerror(code)); }
    luaL_Buffer result;
    luaL_buffinit(L, &result);
    size_t remaining = (size_t)limit + 1;
    char buffer[8192];
    while (remaining > 0) {
        size_t requested = remaining < sizeof(buffer) ? remaining : sizeof(buffer);
        ssize_t count = read(fd, buffer, requested);
        if (count < 0 && errno == EINTR) continue;
        if (count < 0) { code = errno; break; }
        if (count == 0) break;
        luaL_addlstring(&result, buffer, (size_t)count);
        remaining -= (size_t)count;
    }
    if (close(fd) < 0 && !code) code = errno;
    if (code) return luaL_error(L, "read file: %s", strerror(code));
    luaL_pushresult(&result);
    return 1;
}

static int atomic_write(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    size_t size;
    const char *content = luaL_checklstring(L, 2, &size);
    int create_only = lua_toboolean(L, 3);
    char *storage = NULL, *name;
    int directory = parent_directory(path, &storage, &name), fd = -1, code = 0;
    char temporary[96] = "";
    struct stat previous;
    if (directory < 0) return luaL_error(L, "write parent: %s", strerror(errno));
    int exists = fstatat(directory, name, &previous, AT_SYMLINK_NOFOLLOW) == 0;
    if ((exists && (!S_ISREG(previous.st_mode) || create_only)) || (!exists && errno != ENOENT)) {
        code = EEXIST; goto finished;
    }
    for (int attempt = 0; attempt < 1000; ++attempt) {
        snprintf(temporary, sizeof(temporary), ".agent-patch-%ld-%d", (long)getpid(), attempt);
        fd = openat(directory, temporary, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0666);
        if (fd >= 0 || errno != EEXIST) break;
    }
    if (fd < 0) { code = errno; temporary[0] = '\0'; goto finished; }
    if (exists && fchmod(fd, previous.st_mode & 0777) < 0) { code = errno; goto finished; }
    for (size_t position = 0; position < size;) {
        ssize_t count = write(fd, content + position, size - position);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) { code = errno ? errno : EIO; goto finished; }
        position += (size_t)count;
    }
    if (close(fd) < 0) { fd = -1; code = errno; goto finished; }
    fd = -1;
    if (create_only) {
        if (linkat(directory, temporary, directory, name, 0) < 0) code = errno;
    } else if (renameat(directory, temporary, directory, name) < 0) code = errno;
finished:
    if (fd >= 0) close(fd);
    if (temporary[0]) unlinkat(directory, temporary, 0);
    close(directory); free(storage);
    if (code) return luaL_error(L, "write file: %s", strerror(code));
    lua_pushboolean(L, 1); return 1;
}

static int remove_file(lua_State *L) {
    char *storage = NULL, *name;
    int directory = parent_directory(luaL_checkstring(L, 1), &storage, &name);
    if (directory < 0) return luaL_error(L, "remove parent: %s", strerror(errno));
    struct stat metadata;
    int result = fstatat(directory, name, &metadata, AT_SYMLINK_NOFOLLOW);
    if (result == 0 && S_ISREG(metadata.st_mode)) result = unlinkat(directory, name, 0);
    else { result = -1; errno = EINVAL; }
    int code = errno;
    close(directory); free(storage);
    if (result < 0) return luaL_error(L, "remove file: %s", strerror(code));
    lua_pushboolean(L, 1); return 1;
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
    const luaL_Reg functions[] = {{"spawn", spawn_process}, {"realpath", real_path},
        {"temporary_file", temporary_file}, {"read_file", read_file}, {"atomic_write", atomic_write},
        {"remove_file", remove_file}, {NULL, NULL}};
    luaL_newlib(L, functions); return 1;
}
