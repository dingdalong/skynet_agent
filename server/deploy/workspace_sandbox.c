#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <linux/landlock.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>

static void fail(const char *operation) {
    perror(operation);
    exit(125);
}

static void allow_path(int rules, const char *path, __u64 access, int optional) {
    int fd = open(path, O_PATH | O_CLOEXEC);
    if (fd < 0) {
        if (optional && errno == ENOENT)
            return;
        fail(path);
    }
    struct stat info;
    if (fstat(fd, &info) != 0)
        fail(path);
    if (!S_ISDIR(info.st_mode))
        access &= LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_WRITE_FILE | LANDLOCK_ACCESS_FS_EXECUTE;
    struct landlock_path_beneath_attr rule = {.allowed_access = access, .parent_fd = fd};
    if (syscall(SYS_landlock_add_rule, rules, LANDLOCK_RULE_PATH_BENEATH, &rule, 0) != 0)
        fail(path);
    close(fd);
}

static void allow_tcp_ports(int rules, const char *ports) {
    while (*ports) {
        char *end;
        unsigned long number = strtoul(ports, &end, 10);
        if (end == ports || (*end && *end != ',') || number < 1 || number > 65535 ||
            number == 18000 || number == 18081 || number == 18082) {
            fputs("Invalid workspace TCP port\n", stderr);
            exit(125);
        }
        struct landlock_net_port_attr port = {.port = number, .allowed_access = LANDLOCK_ACCESS_NET_CONNECT_TCP};
        if (syscall(SYS_landlock_add_rule, rules, LANDLOCK_RULE_NET_PORT, &port, 0) != 0)
            fail("landlock network");
        ports = *end ? end + 1 : end;
    }
}

int main(int argc, char **argv) {
    if (argc < 4 || argv[1][0] != '/')
        return 125;
    if (syscall(SYS_landlock_create_ruleset, NULL, 0, LANDLOCK_CREATE_RULESET_VERSION) < 6) {
        fputs("Agent workspace requires Landlock ABI 6 or newer\n", stderr);
        return 125;
    }
    const __u64 read = LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_READ_DIR | LANDLOCK_ACCESS_FS_EXECUTE;
    const __u64 write = LANDLOCK_ACCESS_FS_WRITE_FILE | LANDLOCK_ACCESS_FS_REMOVE_DIR | LANDLOCK_ACCESS_FS_REMOVE_FILE |
                        LANDLOCK_ACCESS_FS_MAKE_DIR | LANDLOCK_ACCESS_FS_MAKE_REG | LANDLOCK_ACCESS_FS_MAKE_SYM |
                        LANDLOCK_ACCESS_FS_MAKE_FIFO | LANDLOCK_ACCESS_FS_MAKE_SOCK |
                        LANDLOCK_ACCESS_FS_REFER | LANDLOCK_ACCESS_FS_TRUNCATE;
    struct landlock_ruleset_attr policy = {
        .handled_access_fs = read | write | LANDLOCK_ACCESS_FS_MAKE_BLOCK | LANDLOCK_ACCESS_FS_MAKE_CHAR |
                             LANDLOCK_ACCESS_FS_IOCTL_DEV,
        .handled_access_net = LANDLOCK_ACCESS_NET_CONNECT_TCP,
        .scoped = LANDLOCK_SCOPE_SIGNAL | LANDLOCK_SCOPE_ABSTRACT_UNIX_SOCKET,
    };
    int rules = syscall(SYS_landlock_create_ruleset, &policy, sizeof(policy), 0);
    if (rules < 0)
        fail("landlock_create_ruleset");
    const char *system[] = {"/usr", "/bin", "/sbin", "/lib", "/lib64", "/etc/ssl", "/etc/ld.so.cache",
                            "/etc/hosts", "/etc/nsswitch.conf", "/etc/resolv.conf", "/dev/urandom", NULL};
    for (size_t index = 0; system[index]; index++)
        allow_path(rules, system[index], read, 1);
    allow_path(rules, "/dev/null", LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_WRITE_FILE, 0);
    allow_path(rules, argv[1], read | write, 0);
    int argument = 2;
    const char *ports = "53,80,443";
    if (argument < argc && !strncmp(argv[argument], "--tcp=", 6))
        ports = argv[argument++] + 6;
    for (; argument < argc && strcmp(argv[argument], "--") != 0; argument++)
        allow_path(rules, argv[argument], read, 0);
    if (++argument >= argc)
        return 125;
    allow_tcp_ports(rules, ports);
    if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0 || syscall(SYS_landlock_restrict_self, rules, 0) != 0)
        fail("landlock_restrict_self");
    close(rules);
    execvp(argv[argument], argv + argument);
    fail("execvp");
}
