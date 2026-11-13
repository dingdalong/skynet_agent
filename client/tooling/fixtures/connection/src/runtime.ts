import { defineApp } from "@skynet/app-runtime";
import type { Json, Transition } from "@skynet/contracts";
import { socketURL } from "./config";

export interface State {
    nativeId: string;
    serverId: string;
    received: number;
    sent: number;
    error: string;
}

export default defineApp<State>({
    initialState: () => ({
        nativeId: "",
        serverId: "",
        received: 0,
        sent: 0,
        error: "",
    }),
    reduce(state, command): Transition<State> {
        const payload = command.payload as Record<string, Json> | null;
        if (command.type === "connect") {
            return {
                state,
                effects: [
                    {
                        id: "connect",
                        kind: "socket.open",
                        input: { key: "main", url: socketURL },
                    },
                ],
            };
        }
        if (command.type === "ping") {
            return {
                state: { ...state, sent: state.sent + 1 },
                effects: [
                    {
                        id: `send-${state.sent}`,
                        kind: "socket.send",
                        input: { key: "main", text: "ping" },
                    },
                ],
            };
        }
        if (command.type === "$effect" && payload?.error) {
            return { state: { ...state, error: String(payload.error) } };
        }
        if (command.type === "$effect" && payload?.id === "connect") {
            const value = payload.value as Record<string, Json>;
            return {
                state: { ...state, nativeId: String(value.connectionId) },
            };
        }
        if (command.type === "$resource" && payload?.text) {
            return {
                state: {
                    ...state,
                    serverId: String(payload.text),
                    received: state.received + 1,
                },
            };
        }
        return { state };
    },
});
