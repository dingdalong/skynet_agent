import { defineApp } from "@skynet/app-runtime";
import {
    initialAgentState,
    reduceAgent,
    startAgent,
} from "@skynet/agent-client";

export default defineApp({
    initialState: initialAgentState,
    start: (state) => startAgent(state, true),
    reduce: reduceAgent,
});
