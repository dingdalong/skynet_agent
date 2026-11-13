#include "../../../../../common/native/agent_runtime/agent_runtime.h"
#include <libproc.h>
#include <stdint.h>

static inline uint64_t skynet_resident_memory(int pid) {
    struct proc_taskinfo info;
    int size = proc_pidinfo(pid, PROC_PIDTASKINFO, 0, &info, sizeof(info));
    return size == sizeof(info) ? info.pti_resident_size : 0;
}
