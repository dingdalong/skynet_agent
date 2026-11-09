#ifndef AGENT_RUNTIME_H
#define AGENT_RUNTIME_H
#include <stddef.h>
#include <sys/types.h>
typedef struct ar_process ar_process;
/* Returned buffers belong to the caller and must be released with ar_free. */
void ar_free(void *buffer);
char *ar_realpath(const char *path);
char *ar_read_file(const char *path, size_t limit, size_t *length);
int ar_atomic_write(const char *path, const char *content, size_t length, int create_only);
int ar_remove_file(const char *path);
char *ar_temporary_file(const char *content, size_t length);
ar_process *ar_spawn(const char *launcher, const char *cwd, const char *const *argv, const char *const *env,
                     int tty);
int ar_poll(ar_process *process, int *exit_code);
void ar_terminate(ar_process *process);
void ar_close(ar_process *process);
void ar_take_fds(ar_process *process, int *output, int *errors);
ssize_t ar_read(ar_process *process, void *buffer, size_t capacity);
ssize_t ar_write(ar_process *process, const void *buffer, size_t length);
/* argv is NULL terminated; free with ar_argv_free. */
char **ar_sandbox(const char *const *argv, const char *root, const char *const *dependencies);
void ar_argv_free(char **argv);
char *ar_patch(const char *patch, const char *root, int escalated);
char *ar_prepare_patch(const char *patch, const char *root, int escalated);
char *ar_resolve(const char *path, const char *base);
int ar_inside(const char *path, const char *root);
#endif
