return {
    shutdown_mode = os.getenv("SHUTDOWN_TEST_MODE") or "normal",
    shutdown_port = tonumber(os.getenv("SHUTDOWN_TEST_CONTROL_PORT")) or 18002,
}
