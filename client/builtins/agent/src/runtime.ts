import { defineApp } from "@skynet/app-runtime";
import {
    initialAgentState,
    reduceAgent,
    startAgent,
} from "@skynet/agent-client";
import manifest from "../manifest.json";

export default defineApp({
    initialState: initialAgentState,
    start: (state) => startAgent(state, true),
    reduce: (state, command) =>
        reduceAgent(state, command, manifest.networkOrigins),
});
