local enum = {}

---@enum enum.message_status
enum.message_status = {
    unspecified = 0,
    streaming = 1,
    completed = 2,
    cancelled = 3,
    failed = 4,
}

return enum
