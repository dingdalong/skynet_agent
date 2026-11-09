#include "agent_runtime.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(int argc, char **argv) {
    if (argc != 4 || strcmp(argv[1], "patch"))
        return 125;
    size_t length;
    char *patch = ar_read_file(argv[3], 262144, &length);
    if (!patch || length > 262144 || strlen(patch) != length) {
        ar_free(patch);
        return 125;
    }
    char *result = ar_patch(patch, argv[2], 1);
    ar_free(patch);
    if (!result)
        return 125;
    puts(result);
    int failed = strstr(result, "\"ok\":false") != NULL;
    ar_free(result);
    return failed;
}
