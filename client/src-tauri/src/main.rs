#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    skynet_agent_lib::run();
}
