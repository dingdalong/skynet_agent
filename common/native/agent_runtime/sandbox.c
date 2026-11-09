#define _GNU_SOURCE
#include "agent_runtime.h"
#include "internal.h"
#include <sys/stat.h>
#include <unistd.h>
typedef struct {
    char **items;
    size_t count;
    int failed;
} Arguments;
static void add(Arguments *a, const char *s) {
    if (a->failed)
        return;
    char **items = realloc(a->items, (a->count + 2) * sizeof(char *));
    if (!items) {
        a->failed = 1;
        return;
    }
    a->items = items;
    a->items[a->count] = strdup(s);
    a->items[a->count + 1] = NULL;
    if (!a->items[a->count]) {
        a->failed = 1;
        return;
    }
    a->count++;
}
void ar_argv_free(char **argv) {
    if (argv) {
        for (size_t i = 0; argv[i]; ++i)
            free(argv[i]);
        free(argv);
    }
}
char **ar_sandbox(const char *const *argv, const char *root, const char *const *dependencies) {
    Arguments a = {0};
#ifdef __APPLE__
    if (access("/usr/bin/sandbox-exec", X_OK))
        return NULL;
    ar_buffer profile = {0};
    puts_buffer(&profile, "(version 1)(deny default)(allow process-exec process-fork)(allow signal (target "
                          "same-sandbox))(allow process-info* (target same-sandbox))(allow "
                          "sysctl-read)(allow file-read-metadata)(allow network*)(allow file-read* (literal "
                          "\"/\"))(allow mach-lookup (global-name \"com.apple.TrustEvaluationAgent\") "
                          "(global-name \"com.apple.system.opendirectoryd.libinfo\"))(allow file-read* "
                          "file-write* file-ioctl (literal \"/dev/null\") (literal \"/dev/ptmx\") (regex "
                          "#\"^/dev/ttys[0-9]+\"))(allow pseudo-tty)(allow file-write* (subpath ");
    quoted(&profile, root);
    puts_buffer(&profile, "))");
    const char *reads[] = {"/System",       "/usr",         "/bin", "/sbin", "/Library/Apple",
                           "/opt/homebrew", "/private/etc", "/dev", root,    NULL};
    for (size_t i = 0; reads[i]; ++i) {
        puts_buffer(&profile, "(allow file-read* (subpath ");
        quoted(&profile, reads[i]);
        puts_buffer(&profile, "))");
    }
    for (size_t i = 0; dependencies && dependencies[i]; ++i) {
        puts_buffer(&profile, "(allow file-read* (subpath ");
        quoted(&profile, dependencies[i]);
        puts_buffer(&profile, "))");
    }
    char *text = finish(&profile);
    if (!text)
        return NULL;
    add(&a, "/usr/bin/sandbox-exec");
    add(&a, "-p");
    add(&a, text);
    free(text);
#else
    const char *program = access("/usr/bin/bwrap", X_OK) == 0 ? "/usr/bin/bwrap" : "/bin/bwrap";
    if (access(program, X_OK))
        return NULL;
    const char *initial[] = {program,         "--unshare-user",
                             "--unshare-pid", "--unshare-ipc",
                             "--unshare-uts", "--die-with-parent",
                             "--new-session", "--cap-drop",
                             "ALL",           "--proc",
                             "/proc",         "--dev",
                             "/dev",          "--dir",
                             "/tmp",          NULL};
    for (size_t i = 0; initial[i]; ++i)
        add(&a, initial[i]);
    const char *reads[] = {"/usr",
                           "/bin",
                           "/sbin",
                           "/lib",
                           "/lib64",
                           "/etc/ssl",
                           "/etc/pki",
                           "/etc/resolv.conf",
                           "/etc/hosts",
                           "/etc/nsswitch.conf",
                           "/etc/ld.so.cache",
                           NULL};
    for (size_t i = 0; reads[i]; ++i) {
        struct stat s;
        if (stat(reads[i], &s))
            continue;
        add(&a, "--ro-bind");
        add(&a, reads[i]);
        add(&a, reads[i]);
    }
    for (size_t i = 0; dependencies && dependencies[i]; ++i) {
        add(&a, "--ro-bind");
        add(&a, dependencies[i]);
        add(&a, dependencies[i]);
    }
    add(&a, "--bind");
    add(&a, root);
    add(&a, root);
    add(&a, "--remount-ro");
    add(&a, "/");
    add(&a, "--chdir");
    add(&a, root);
    add(&a, "--");
#endif
    for (size_t i = 0; argv[i]; ++i)
        add(&a, argv[i]);
    if (a.failed) {
        ar_argv_free(a.items);
        errno = ENOMEM;
        return NULL;
    }
    return a.items;
}
