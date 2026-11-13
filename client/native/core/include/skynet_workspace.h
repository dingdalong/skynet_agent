#ifndef SKYNET_WORKSPACE_H
#define SKYNET_WORKSPACE_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Each handle belongs to one owner/serial queue. Input strings are copied.
 * Returned strings are borrowed until the next mutation or destruction.
 * No exceptions or language-runtime objects cross this C boundary. */
typedef struct sk_workspace sk_workspace;

sk_workspace* sk_workspace_create(const char* mode, double ratio);
void sk_workspace_destroy(sk_workspace* workspace);
int sk_workspace_add_pane(sk_workspace* workspace, const char* app_id);
int sk_workspace_add_recent(sk_workspace* workspace, const char* app_id);
int sk_workspace_allow_app(sk_workspace* workspace, const char* app_id);
int sk_workspace_apply(sk_workspace* workspace, const char* command,
                       const char* app_id, const char* edge, int has_ratio, double ratio);
const char* sk_workspace_error(int code);
const char* sk_workspace_error_kind(int code);
const char* sk_workspace_mode(const sk_workspace* workspace);
double sk_workspace_ratio(const sk_workspace* workspace);
size_t sk_workspace_pane_count(const sk_workspace* workspace);
const char* sk_workspace_pane(const sk_workspace* workspace, size_t index);
size_t sk_workspace_recent_count(const sk_workspace* workspace);
const char* sk_workspace_recent(const sk_workspace* workspace, size_t index);

#ifdef __cplusplus
}
#endif
#endif
