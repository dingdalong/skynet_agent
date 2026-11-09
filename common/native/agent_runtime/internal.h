#ifndef AR_INTERNAL_H
#define AR_INTERNAL_H
#include <errno.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct {
    char *text;
    size_t length, capacity;
    int failed;
} ar_buffer;
static inline void append(ar_buffer *b, const char *text, size_t n) {
    if (b->failed)
        return;
    if (n > (size_t)-1 - b->length - 1) {
        b->failed = 1;
        return;
    }
    size_t needed = b->length + n + 1;
    if (needed > b->capacity) {
        char *next = realloc(b->text, needed * 2);
        if (!next) {
            b->failed = 1;
            return;
        }
        b->text = next;
        b->capacity = needed * 2;
    }
    memcpy(b->text + b->length, text, n);
    b->length += n;
    b->text[b->length] = 0;
}
static inline void puts_buffer(ar_buffer *b, const char *text) { append(b, text, strlen(text)); }
static inline void quoted(ar_buffer *b, const char *s) {
    puts_buffer(b, "\"");
    for (; *s; ++s) {
        unsigned char c = (unsigned char)*s;
        char escaped[8];
        if (c == '"' || c == '\\') {
            escaped[0] = '\\';
            escaped[1] = c;
            append(b, escaped, 2);
        } else if (c < 32) {
            snprintf(escaped, sizeof escaped, "\\u%04x", c);
            puts_buffer(b, escaped);
        } else
            append(b, s, 1);
    }
    puts_buffer(b, "\"");
}
static inline char *finish(ar_buffer *b) {
    if (b->failed) {
        free(b->text);
        errno = ENOMEM;
        return NULL;
    }
    return b->text ? b->text : strdup("");
}
#endif
