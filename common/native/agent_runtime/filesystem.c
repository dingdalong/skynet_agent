#define _GNU_SOURCE
#include "agent_runtime.h"
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
void ar_free(void *buffer) { free(buffer); }
char *ar_realpath(const char *path) { return realpath(path, NULL); }
/* Walk each parent through descriptors so a swapped symlink cannot redirect file access. */
static int parent_directory(const char *path, char **storage, char **name) {
    if (path[0] != '/') {
        errno = EINVAL;
        return -1;
    }
    *storage = strdup(path + 1);
    if (!*storage)
        return -1;
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
        close(fd);
        fd = next;
        errno = saved;
        part = slash + 1;
    }
    *name = part;
    if (fd < 0 || !*part || strcmp(part, ".") == 0 || strcmp(part, "..") == 0) {
        if (fd >= 0)
            close(fd);
        free(*storage);
        *storage = NULL;
        errno = EINVAL;
        return -1;
    }
    return fd;
}

char *ar_read_file(const char *path, size_t limit, size_t *length) {
    char *storage = NULL, *name;
    int directory = parent_directory(path, &storage, &name);
    if (directory < 0)
        return NULL;
    int fd = openat(directory, name, O_RDONLY | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK);
    int code = fd < 0 ? errno : 0;
    close(directory);
    free(storage);
    if (code) {
        errno = code;
        return NULL;
    }
    struct stat metadata;
    if (fstat(fd, &metadata) < 0)
        code = errno;
    else if (!S_ISREG(metadata.st_mode))
        code = EINVAL;
    if (limit > 16 * 1024 * 1024)
        code = EFBIG;
    char *result = code ? NULL : malloc(limit + 2);
    if (!result && !code)
        code = ENOMEM;
    size_t used = 0;
    while (!code && used <= limit) {
        ssize_t n = read(fd, result + used, limit + 1 - used);
        if (n < 0 && errno == EINTR)
            continue;
        if (n < 0) {
            code = errno;
            break;
        }
        if (!n)
            break;
        used += (size_t)n;
    }
    close(fd);
    if (code) {
        free(result);
        errno = code;
        return NULL;
    }
    result[used] = 0;
    *length = used;
    return result;
}
int ar_atomic_write(const char *path, const char *content, size_t size, int create_only) {
    char *storage = NULL, *name;
    int directory = parent_directory(path, &storage, &name), fd = -1, code = 0;
    char temporary[96] = "";
    struct stat previous;
    if (directory < 0)
        return -1;
    int exists = fstatat(directory, name, &previous, AT_SYMLINK_NOFOLLOW) == 0;
    if ((exists && (!S_ISREG(previous.st_mode) || create_only)) || (!exists && errno != ENOENT)) {
        code = EEXIST;
        goto finished;
    }
    for (int attempt = 0; attempt < 1000; ++attempt) {
        snprintf(temporary, sizeof(temporary), ".agent-patch-%ld-%d", (long)getpid(), attempt);
        fd = openat(directory, temporary, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0666);
        if (fd >= 0 || errno != EEXIST)
            break;
    }
    if (fd < 0) {
        code = errno;
        temporary[0] = '\0';
        goto finished;
    }
    if (exists && fchmod(fd, previous.st_mode & 0777) < 0) {
        code = errno;
        goto finished;
    }
    for (size_t position = 0; position < size;) {
        ssize_t count = write(fd, content + position, size - position);
        if (count < 0 && errno == EINTR)
            continue;
        if (count <= 0) {
            code = errno ? errno : EIO;
            goto finished;
        }
        position += (size_t)count;
    }
    if (close(fd) < 0) {
        fd = -1;
        code = errno;
        goto finished;
    }
    fd = -1;
    if (create_only) {
        if (linkat(directory, temporary, directory, name, 0) < 0)
            code = errno;
    } else if (renameat(directory, temporary, directory, name) < 0)
        code = errno;
finished:
    if (fd >= 0)
        close(fd);
    if (temporary[0])
        unlinkat(directory, temporary, 0);
    close(directory);
    free(storage);
    if (code) {
        errno = code;
        return -1;
    }
    return 0;
}

int ar_remove_file(const char *path) {
    char *storage = NULL, *name;
    int directory = parent_directory(path, &storage, &name);
    if (directory < 0)
        return -1;
    struct stat metadata;
    int result = fstatat(directory, name, &metadata, AT_SYMLINK_NOFOLLOW);
    if (result == 0 && S_ISREG(metadata.st_mode))
        result = unlinkat(directory, name, 0);
    else {
        result = -1;
        errno = EINVAL;
    }
    int code = errno;
    close(directory);
    free(storage);
    if (result < 0) {
        errno = code;
        return -1;
    }
    return 0;
}

char *ar_temporary_file(const char *content, size_t length) {
    char path[] = "/tmp/skynet-agent-XXXXXX";
    int fd = mkstemp(path);
    if (fd < 0)
        return NULL;
    size_t used = 0;
    while (used < length) {
        ssize_t n = write(fd, content + used, length - used);
        if (n < 0 && errno == EINTR)
            continue;
        if (n <= 0) {
            int code = errno;
            close(fd);
            unlink(path);
            errno = code;
            return NULL;
        }
        used += (size_t)n;
    }
    close(fd);
    char *resolved = ar_realpath(path);
    if (!resolved) {
        int code = errno;
        unlink(path);
        errno = code;
    }
    return resolved;
}
int ar_inside(const char *path, const char *root) {
    size_t n = strlen(root);
    return !strcmp(root, "/") || (!strncmp(path, root, n) && (!path[n] || path[n] == '/'));
}
char *ar_resolve(const char *path, const char *base) {
    char *joined = NULL;
    if (*path == '/')
        joined = strdup(path);
    else if (asprintf(&joined, "%s/%s", base, path) < 0)
        return NULL;
    char *normalized = calloc(strlen(joined) + 2, 1);
    if (!normalized) {
        free(joined);
        return NULL;
    }
    strcpy(normalized, "/");
    char *save = NULL;
    for (char *part = strtok_r(joined, "/", &save); part; part = strtok_r(NULL, "/", &save)) {
        if (!strcmp(part, "."))
            continue;
        if (!strcmp(part, "..")) {
            char *slash = strrchr(normalized, '/');
            if (slash != normalized)
                *slash = 0;
            else
                normalized[1] = 0;
            continue;
        }
        if (strlen(normalized) > 1)
            strcat(normalized, "/");
        strcat(normalized, part);
    }
    free(joined);
    char *resolved = ar_realpath(normalized);
    if (resolved) {
        free(normalized);
        return resolved;
    }
    if (errno != ENOENT) {
        free(normalized);
        return NULL;
    }
    char *slash = strrchr(normalized, '/');
    char *name = strdup(slash + 1);
    if (!name) {
        free(normalized);
        return NULL;
    }
    *slash = 0;
    char *parent = ar_resolve(*normalized ? normalized : "/", "/");
    char *result = NULL;
    if (parent) {
        if (asprintf(&result, "%s%s%s", parent, !strcmp(parent, "/") ? "" : "/", name) < 0)
            result = NULL;
    }
    free(normalized);
    free(name);
    free(parent);
    return result;
}
