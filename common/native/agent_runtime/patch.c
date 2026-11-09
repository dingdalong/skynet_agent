#define _GNU_SOURCE
#include "agent_runtime.h"
#include "internal.h"
#include <ctype.h>
#include <sys/stat.h>
#include <unistd.h>
/* All operations are prepared before the first write. Successful writes survive later failures. */
typedef struct {
    char **items;
    size_t count;
} Lines;
typedef struct {
    char *path, *move, *content;
    int action;
} Operation;
static void lines_free(Lines *l) {
    for (size_t i = 0; i < l->count; ++i)
        free(l->items[i]);
    free(l->items);
    l->items = NULL;
    l->count = 0;
}
static int line_add(Lines *l, const char *s, size_t n) {
    char **items = realloc(l->items, (l->count + 1) * sizeof(char *));
    if (!items)
        return -1;
    l->items = items;
    l->items[l->count] = strndup(s, n);
    if (!l->items[l->count])
        return -1;
    l->count++;
    return 0;
}
static int split(Lines *l, const char *s) {
    while (*s) {
        const char *end = strchr(s, '\n');
        size_t n = end ? (size_t)(end - s) : strlen(s);
        if (n && s[n - 1] == '\r')
            n--;
        if (line_add(l, s, n))
            return -1;
        if (!end)
            break;
        s = end + 1;
    }
    return 0;
}
static int same(const char *a, const char *b, int trim) {
    size_t na = strlen(a), nb = strlen(b);
    if (trim) {
        while (na && isspace((unsigned char)a[na - 1]))
            na--;
        while (nb && isspace((unsigned char)b[nb - 1]))
            nb--;
    }
    if (trim == 2) {
        while (na && isspace((unsigned char)*a)) {
            a++;
            na--;
        }
        while (nb && isspace((unsigned char)*b)) {
            b++;
            nb--;
        }
    }
    return na == nb && !memcmp(a, b, na);
}
static int mkdirs(const char *path) {
    char *p = strdup(path);
    if (!p)
        return -1;
    char *end = strrchr(p, '/');
    if (!end) {
        free(p);
        errno = EINVAL;
        return -1;
    }
    *end = 0;
    for (char *c = p + 1;; ++c) {
        if (*c && *c != '/')
            continue;
        char saved = *c;
        *c = 0;
        if (mkdir(p, 0777) && errno != EEXIST) {
            free(p);
            return -1;
        }
        *c = saved;
        if (!saved)
            break;
    }
    free(p);
    return 0;
}
static char *target(const char *path, const char *root, int escalated) {
    char *parts = strdup(path);
    if (!parts)
        return NULL;
    char *slash = strrchr(parts, '/');
    const char *name = slash ? slash + 1 : parts;
    if (!*name || !strcmp(name, ".") || !strcmp(name, "..")) {
        free(parts);
        errno = EINVAL;
        return NULL;
    }
    if (slash)
        *slash = 0;
    char *parent = ar_resolve(slash ? (*parts ? parts : "/") : ".", root);
    char *result = NULL;
    if (parent && asprintf(&result, "%s%s%s", parent, !strcmp(parent, "/") ? "" : "/", name) < 0)
        result = NULL;
    free(parent);
    free(parts);
    if (!result)
        return NULL;
    struct stat st;
    if ((!escalated && !ar_inside(result, root)) || (!lstat(result, &st) && S_ISLNK(st.st_mode))) {
        free(result);
        errno = EACCES;
        return NULL;
    }
    return result;
}
static char *patch_run(const char *text, const char *root, int escalated, int apply) {
    Lines patch = {0}, changed = {0};
    Operation *ops = NULL;
    size_t count = 0;
    const char *error = NULL;
    if (strlen(text) > 262144 || split(&patch, text)) {
        error = "补丁过大或内存不足";
        goto done;
    }
    if (patch.count < 3 || strcmp(patch.items[0], "*** Begin Patch") ||
        strcmp(patch.items[patch.count - 1], "*** End Patch")) {
        error = "缺少补丁边界";
        goto done;
    }
    for (size_t i = 1; i + 1 < patch.count;) {
        const char *header = patch.items[i++], *path = NULL;
        int action = 0;
        if (!strncmp(header, "*** Add File: ", 14)) {
            action = 1;
            path = header + 14;
        } else if (!strncmp(header, "*** Delete File: ", 17)) {
            action = 2;
            path = header + 17;
        } else if (!strncmp(header, "*** Update File: ", 17)) {
            action = 3;
            path = header + 17;
        }
        if (!path || !*path) {
            error = "未知补丁操作";
            goto done;
        }
        Operation *next = realloc(ops, (count + 1) * sizeof(*ops));
        if (!next) {
            error = "内存不足";
            goto done;
        }
        ops = next;
        Operation *op = &ops[count++];
        memset(op, 0, sizeof(*op));
        op->action = action;
        op->path = target(path, root, escalated);
        if (!op->path) {
            error = "补丁路径无效或越界";
            goto done;
        }
        if (i + 1 < patch.count && !strncmp(patch.items[i], "*** Move to: ", 13)) {
            if (action != 3) {
                error = "移动文件格式无效";
                goto done;
            }
            op->move = target(patch.items[i++] + 13, root, escalated);
            if (!op->move) {
                error = "移动路径无效或越界";
                goto done;
            }
        }
        for (size_t k = 0; k < count; ++k) {
            Operation *old = &ops[k];
            if (k + 1 < count &&
                (!strcmp(op->path, old->path) || (old->move && !strcmp(op->path, old->move)))) {
                error = "补丁目标重复";
                goto done;
            }
            if (op->move && (!strcmp(op->move, old->path) ||
                             (k + 1 < count && old->move && !strcmp(op->move, old->move)))) {
                error = "补丁目标重复";
                goto done;
            }
        }
        struct stat st;
        int exists = lstat(op->path, &st) == 0;
        if ((action == 1 && exists) || (action != 1 && (!exists || !S_ISREG(st.st_mode))) ||
            (op->move && !lstat(op->move, &st))) {
            error = "补丁文件状态无效";
            goto done;
        }
        ar_buffer content = {0};
        Lines original = {0};
        char *raw = NULL;
        size_t bytes = 0;
        int crlf = 0, ending = 1;
        if (action != 1) {
            raw = ar_read_file(op->path, 2097152, &bytes);
            if (!raw || bytes > 2097152 || strlen(raw) != bytes) {
                free(raw);
                error = "补丁仅支持不超过 2 MiB 的文本文件";
                goto done;
            }
            crlf = strstr(raw, "\r\n") != NULL;
            ending = !bytes || raw[bytes - 1] == '\n';
            if (split(&original, raw)) {
                free(raw);
                lines_free(&original);
                error = "内存不足";
                goto done;
            }
            free(raw);
        }
        size_t cursor = 0;
        while (i + 1 < patch.count && strncmp(patch.items[i], "*** Add File: ", 14) &&
               strncmp(patch.items[i], "*** Delete File: ", 17) &&
               strncmp(patch.items[i], "*** Update File: ", 17)) {
            char *line = patch.items[i];
            if (action == 1) {
                if (*line != '+') {
                    error = "新增文件行必须以 + 开始";
                    break;
                }
                puts_buffer(&content, line + 1);
                puts_buffer(&content, "\n");
                i++;
                continue;
            }
            if (action != 3 || (strcmp(line, "@@") && strncmp(line, "@@ ", 3))) {
                error = "补丁修改缺少 @@ 标记";
                break;
            }
            if (strlen(line) > 3) {
                size_t found = original.count;
                for (size_t k = cursor; k < original.count; ++k)
                    if (!strcmp(original.items[k], line + 3)) {
                        found = k;
                        break;
                    }
                if (found == original.count) {
                    error = "找不到补丁段上下文";
                    break;
                }
                cursor = found + 1;
            }
            size_t start_entries = ++i, old_count = 0, new_count = 0;
            int eof = 0;
            while (i + 1 < patch.count) {
                line = patch.items[i];
                if (!strcmp(line, "*** End of File")) {
                    eof = 1;
                    i++;
                    break;
                }
                if (*line != '+' && *line != '-' && *line != ' ')
                    break;
                if (*line != '+')
                    old_count++;
                if (*line != '-')
                    new_count++;
                i++;
            }
            size_t found = original.count + 1;
            if (!old_count)
                found = original.count;
            for (int trim = 0; old_count && trim < 3 && found > original.count; ++trim)
                for (size_t k = cursor; k + old_count <= original.count; ++k) {
                    if (eof && k + old_count != original.count)
                        continue;
                    size_t off = 0;
                    int match = 1;
                    for (size_t j = start_entries; j < i && patch.items[j][0] != '*'; ++j)
                        if (patch.items[j][0] != '+') {
                            if (!same(original.items[k + off], patch.items[j] + 1, trim))
                                match = 0;
                            off++;
                        }
                    if (match) {
                        found = k;
                        break;
                    }
                }
            if (found > original.count) {
                error = "补丁上下文不匹配";
                break;
            }
            Lines replacement = {0};
            for (size_t k = 0; k < found; ++k)
                if (line_add(&replacement, original.items[k], strlen(original.items[k])))
                    error = "内存不足";
            size_t source = found;
            for (size_t j = start_entries; j < i && patch.items[j][0] != '*'; ++j) {
                char *entry = patch.items[j];
                if (*entry == ' ') {
                    if (line_add(&replacement, original.items[source], strlen(original.items[source])))
                        error = "内存不足";
                } else if (*entry == '+') {
                    if (line_add(&replacement, entry + 1, strlen(entry + 1)))
                        error = "内存不足";
                }
                if (*entry != '+')
                    source++;
            }
            for (size_t k = found + old_count; k < original.count; ++k)
                if (line_add(&replacement, original.items[k], strlen(original.items[k])))
                    error = "内存不足";
            if (found + old_count == original.count && new_count)
                ending = 1;
            lines_free(&original);
            original = replacement;
            cursor = found + new_count;
            if (error)
                break;
        }
        if (action == 3 && !error)
            for (size_t k = 0; k < original.count; ++k) {
                puts_buffer(&content, original.items[k]);
                if (k + 1 < original.count || ending)
                    puts_buffer(&content, crlf ? "\r\n" : "\n");
            }
        lines_free(&original);
        op->content = finish(&content);
        if (!op->content && !error)
            error = "内存不足";
        if (error)
            goto done;
    }
    if (!count) {
        error = "补丁没有文件操作";
        goto done;
    }
    for (size_t i = 0; i < count; ++i) {
        Operation *op = &ops[i];
        const char *path = op->move ? op->move : op->path;
        if (!apply) {
            if (line_add(&changed, path, strlen(path)))
                error = "内存不足";
            if (op->move && line_add(&changed, op->path, strlen(op->path)))
                error = "内存不足";
            continue;
        }
        if (op->action == 2) {
            if (ar_remove_file(path)) {
                error = "删除文件失败";
                break;
            }
        } else {
            if (mkdirs(path) ||
                ar_atomic_write(path, op->content, strlen(op->content), op->action == 1 || op->move)) {
                error = "写入文件失败";
                break;
            }
        }
        if (line_add(&changed, path, strlen(path))) {
            error = "内存不足";
            break;
        }
        if (op->move) {
            if (ar_remove_file(op->path)) {
                error = "删除移动源文件失败";
                break;
            }
            if (line_add(&changed, op->path, strlen(op->path))) {
                error = "内存不足";
                break;
            }
        }
    }
done:;
    ar_buffer json = {0};
    puts_buffer(&json, error ? "{\"ok\":false,\"error\":" : "{\"ok\":true,\"error\":");
    quoted(&json, error ? error : "");
    puts_buffer(&json, ",\"changed_files\":[");
    for (size_t i = 0; i < changed.count; ++i) {
        if (i)
            puts_buffer(&json, ",");
        quoted(&json, changed.items[i]);
    }
    puts_buffer(&json, "]}");
    for (size_t i = 0; i < count; ++i) {
        free(ops[i].path);
        free(ops[i].move);
        free(ops[i].content);
    }
    free(ops);
    lines_free(&patch);
    lines_free(&changed);
    return finish(&json);
}

char *ar_patch(const char *text, const char *root, int escalated) {
    return patch_run(text, root, escalated, 1);
}
char *ar_prepare_patch(const char *text, const char *root, int escalated) {
    return patch_run(text, root, escalated, 0);
}
