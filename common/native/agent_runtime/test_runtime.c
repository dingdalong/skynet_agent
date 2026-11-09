#define _GNU_SOURCE
#include "agent_runtime.h"
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#define CHECK(value)                                                                                         \
    do {                                                                                                     \
        if (!(value)) {                                                                                      \
            fprintf(stderr, "runtime check failed at %d: %s\n", __LINE__, #value);                           \
            return 1;                                                                                        \
        }                                                                                                    \
    } while (0)
int main(int argc, char **argv) {
    CHECK(argc == 2);
    char template[] = "/tmp/skynet-core-XXXXXX";
    CHECK(mkdtemp(template));
    char *root = ar_realpath(template);
    CHECK(root);
    char file[8192], link[8192], moved[8192];
    snprintf(file, sizeof file, "%s/first", root);
    snprintf(link, sizeof link, "%s/link", root);
    snprintf(moved, sizeof moved, "%s/moved", root);
    CHECK(!ar_atomic_write(file, "a\r\nb\r\n", 6, 1));
    CHECK(ar_atomic_write(file, "overwrite", 9, 1) == -1);
    CHECK(!symlink(file, link));
    CHECK(ar_atomic_write(link, "bad", 3, 0) == -1);
    size_t length;
    CHECK(!ar_read_file(link, 128, &length));
    char *rejected =
        ar_prepare_patch("*** Begin Patch\n*** Update File: link\n@@\n-a\n+bad\n*** End Patch", root, 0);
    CHECK(rejected && strstr(rejected, "\"ok\":false"));
    ar_free(rejected);
    const char *patch =
        "*** Begin Patch\n*** Update File: first\n*** Move to: moved\n@@\n a\n-b\n+c\n*** End Patch\n";
    char *result = ar_prepare_patch(patch, root, 0);
    CHECK(result && strstr(result, "\"ok\":true"));
    ar_free(result);
    CHECK(!access(file, F_OK) && access(moved, F_OK));
    result = ar_patch(patch, root, 0);
    CHECK(result && strstr(result, "\"ok\":true"));
    ar_free(result);
    char *text = ar_read_file(moved, 128, &length);
    CHECK(text && length == 6 && !memcmp(text, "a\r\nc\r\n", 6));
    ar_free(text);
    result = ar_patch(
        "*** Begin Patch\n*** Add File: safe\n+one\n*** Add File: ../outside\n+no\n*** End Patch", root, 0);
    CHECK(result && strstr(result, "\"ok\":false"));
    ar_free(result);
    snprintf(file, sizeof file, "%s/safe", root);
    CHECK(access(file, F_OK));
    result = ar_patch(
        "*** Begin Patch\n*** Add File: safe\n+你好\n*** Update File: missing\n@@\n-old\n+new\n*** End Patch",
        root, 0);
    CHECK(result && strstr(result, "\"ok\":false") && access(file, F_OK));
    ar_free(result);
    result = ar_patch("*** Begin Patch\n*** Add File: safe\n+one\n*** Add File: safe\n+two\n*** End Patch",
                      root, 0);
    CHECK(result && strstr(result, "\"ok\":false") && access(file, F_OK));
    ar_free(result);
    result = ar_patch("*** Begin Patch\n*** Add File: safe\n+你好\n*** Delete File: moved\n*** End Patch",
                      root, 0);
    CHECK(result && strstr(result, "\"ok\":true"));
    ar_free(result);
    text = ar_read_file(file, 128, &length);
    CHECK(text && !strcmp(text, "你好\n") && access(moved, F_OK));
    ar_free(text);
    result = ar_patch("*** Begin Patch\n*** Add File: safe\n+overwrite\n*** End Patch", root, 0);
    CHECK(result && strstr(result, "\"ok\":false"));
    ar_free(result);
    const char *command[] = {"/bin/bash", "-c", "printf core-ok", NULL};
    const char *env[] = {"PATH=/usr/bin:/bin", NULL};
    ar_process *process = ar_spawn(argv[1], root, command, env, 0);
    CHECK(process);
    int code = 0, done = 0;
    char output[128] = "";
    size_t used = 0;
    for (int i = 0; i < 1000; ++i) {
        ssize_t n = ar_read(process, output + used, sizeof output - 1 - used);
        if (n > 0)
            used += (size_t)n;
        done = ar_poll(process, &code);
        if (done) {
            ssize_t tail = ar_read(process, output + used, sizeof output - 1 - used);
            if (tail > 0)
                used += (size_t)tail;
            break;
        }
        usleep(1000);
    }
    CHECK(done == 1 && code == 0 && !strcmp(output, "core-ok"));
    ar_close(process);
    const char *slow[] = {"/bin/bash", "-c", "sleep 10", NULL};
    process = ar_spawn(argv[1], root, slow, env, 0);
    CHECK(process);
    ar_terminate(process);
    done = 0;
    for (int i = 0; i < 1000; ++i) {
        done = ar_poll(process, &code);
        if (done)
            break;
        usleep(1000);
    }
    CHECK(done == 1 && code != 0);
    ar_close(process);
    unlink(link);
    unlink(moved);
    unlink(file);
    rmdir(root);
    ar_free(root);
    puts("Shared C runtime: files, patches, process I/O and cancellation passed");
    return 0;
}
