#define _GNU_SOURCE
#include <lua.h>
#include <lauxlib.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

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

int luaopen_agent_filesystem(lua_State *L) {
    const luaL_Reg functions[] = {{"realpath", real_path}, {"temporary_file", temporary_file},
        {"read_file", read_file}, {"atomic_write", atomic_write}, {"remove_file", remove_file}, {NULL, NULL}};
    luaL_newlib(L, functions); return 1;
}
