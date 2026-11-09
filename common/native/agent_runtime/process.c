#define _GNU_SOURCE
#include "agent_runtime.h"
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <spawn.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#ifdef __APPLE__
#include <util.h>
#else
#include <pty.h>
#endif

struct ar_process {
    pid_t pid;
    int output, error, control, done, code;
};

static int safe_fd(int fd) {
    int moved = fcntl(fd, F_DUPFD_CLOEXEC, 10);
    close(fd);
    return moved;
}

static int pair(int result[2]) {
    int sockets[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, sockets) < 0)
        return -1;
    result[0] = safe_fd(sockets[0]);
    result[1] = safe_fd(sockets[1]);
    return result[0] < 0 || result[1] < 0 ? -1 : 0;
}

int ar_poll(ar_process *p, int *exit_code) {
    if (!p->done) {
        int status;
        pid_t result = waitpid(p->pid, &status, WNOHANG);
        if (result == p->pid) {
            p->done = 1;
            p->code = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
        } else if (result < 0 && errno != EINTR)
            return -1;
    }
    if (p->done)
        *exit_code = p->code;
    return p->done;
}
void ar_terminate(ar_process *p) {
    if (p && p->control >= 0) {
        close(p->control);
        p->control = -1;
    }
}
void ar_close(ar_process *p) {
    if (!p)
        return;
    ar_terminate(p);
    if (p->output >= 0)
        close(p->output);
    if (p->error >= 0)
        close(p->error);
    if (!p->done) {
        int status;
        while (waitpid(p->pid, &status, 0) < 0 && errno == EINTR) {
        }
    }
    free(p);
}
void ar_take_fds(ar_process *p, int *output, int *errors) {
    *output = p->output;
    *errors = p->error;
    p->output = p->error = -1;
}
ssize_t ar_read(ar_process *p, void *buffer, size_t capacity) {
    int fds[] = {p->output, p->error};
    for (int i = 0; i < 2; ++i) {
        if (fds[i] < 0)
            continue;
        ssize_t n = read(fds[i], buffer, capacity);
        if (n > 0)
            return n;
        if (n < 0 && errno != EAGAIN && errno != EINTR && errno != EIO)
            return -1;
    }
    return 0;
}
ssize_t ar_write(ar_process *p, const void *buffer, size_t length) {
    if (p->output < 0) {
        errno = EBADF;
        return -1;
    }
    return write(p->output, buffer, length);
}
ar_process *ar_spawn(const char *launcher, const char *cwd, const char *const *argv, const char *const *env,
                     int tty) {
    size_t argc = 0;
    while (argv[argc]) {
        if (++argc > 256) {
            errno = E2BIG;
            return NULL;
        }
    }
    char **args = calloc(argc + 4, sizeof(char *));
    if (!args)
        return NULL;
    args[0] = (char *)launcher;
    args[1] = tty ? "tty" : "pipe";
    args[2] = (char *)cwd;
    for (size_t i = 0; i < argc; ++i)
        args[i + 3] = (char *)argv[i];
    int control[2] = {-1, -1}, output[2] = {-1, -1}, errors[2] = {-1, -1};
    int input = -1, slave = -1, code = 0;
    if (pair(control) < 0)
        goto failed;
    if (tty) {
        int master;
        if (openpty(&master, &slave, NULL, NULL, NULL) < 0)
            goto failed;
        output[0] = safe_fd(master);
        slave = safe_fd(slave);
        if (output[0] < 0 || slave < 0)
            goto failed;
        input = slave;
        output[1] = slave;
    } else {
        if (pair(output) < 0 || pair(errors) < 0)
            goto failed;
        input = safe_fd(open("/dev/null", O_RDONLY));
        if (input < 0)
            goto failed;
    }
    posix_spawn_file_actions_t actions;
    posix_spawn_file_actions_init(&actions);
    posix_spawn_file_actions_adddup2(&actions, input, 0);
    posix_spawn_file_actions_adddup2(&actions, output[1], 1);
    posix_spawn_file_actions_adddup2(&actions, tty ? slave : errors[1], 2);
    posix_spawn_file_actions_adddup2(&actions, control[1], 3);
    pid_t pid;
    code = posix_spawn(&pid, launcher, &actions, NULL, args, (char *const *)env);
    posix_spawn_file_actions_destroy(&actions);
    if (code) {
        errno = code;
        goto failed;
    }
    close(control[1]);
    close(output[1]);
    if (!tty) {
        close(input);
        close(errors[1]);
    }
    ar_process *p = malloc(sizeof(*p));
    if (!p) {
        close(control[0]);
        close(output[0]);
        if (errors[0] >= 0)
            close(errors[0]);
        waitpid(pid, NULL, 0);
        free(args);
        return NULL;
    }
    *p = (ar_process){.pid = pid, .output = output[0], .error = errors[0], .control = control[0]};
    fcntl(p->output, F_SETFL, fcntl(p->output, F_GETFL) | O_NONBLOCK);
    if (p->error >= 0)
        fcntl(p->error, F_SETFL, fcntl(p->error, F_GETFL) | O_NONBLOCK);
    free(args);
    return p;
failed:
    code = errno;
    if (input >= 0 && input != output[1])
        close(input);
    for (int i = 0; i < 2; ++i) {
        if (control[i] >= 0)
            close(control[i]);
        if (output[i] >= 0)
            close(output[i]);
        if (errors[i] >= 0)
            close(errors[i]);
    }
    free(args);
    errno = code;
    return NULL;
}
