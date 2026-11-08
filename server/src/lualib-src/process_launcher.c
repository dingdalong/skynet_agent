#define _GNU_SOURCE
#include <sys/ioctl.h>
#include <sys/resource.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <errno.h>
#include <dirent.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* The launcher is single threaded; fork never duplicates a Skynet/Lua VM. */
int main(int argc, char **argv) {
    if (argc < 4) return 125;
    DIR *descriptors = opendir("/dev/fd");
    if (descriptors) {
        struct dirent *entry;
        while ((entry = readdir(descriptors))) {
            int fd = atoi(entry->d_name);
            if (fd >= 4 && fd != dirfd(descriptors)) close(fd);
        }
        closedir(descriptors);
    } else {
        for (int fd = 4, limit = (int)sysconf(_SC_OPEN_MAX); fd < limit; ++fd) close(fd);
    }
    pid_t child = fork();
    if (child < 0) { perror("process_launcher fork"); return 125; }
    if (child == 0) {
        close(3);
        if (setsid() < 0) _exit(125);
        if (strcmp(argv[1], "tty") == 0 && ioctl(0, TIOCSCTTY, 0) < 0) _exit(125);
        if (chdir(argv[2]) < 0) { perror("process_launcher chdir"); _exit(125); }
        struct rlimit core = {0, 0};
        setrlimit(RLIMIT_CORE, &core);
        execv(argv[3], argv + 3);
        perror("process_launcher execv");
        _exit(127);
    }
    close(0); close(1); close(2);
    int status = 0, stopping = 0, grace = 0;
    for (;;) {
        pid_t waited = waitpid(child, &status, WNOHANG);
        if (waited == child) break;
        if (waited < 0 && errno != EINTR) return 125;
        struct pollfd control = {.fd = 3, .events = POLLIN | POLLHUP};
        int ready = poll(&control, 1, 20);
        if (!stopping && ready > 0) {
            char command;
            if ((control.revents & (POLLHUP | POLLERR)) || read(3, &command, 1) != 1 || command == 'T') {
                stopping = 1;
                kill(-child, SIGTERM);
                kill(child, SIGTERM);
            }
        }
        if (stopping && ++grace >= 10) {
            kill(-child, SIGKILL);
            kill(child, SIGKILL);
        }
    }
    /* A shell exiting must not leave untracked background children behind. */
    kill(-child, SIGKILL);
    close(3);
    return WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
}
