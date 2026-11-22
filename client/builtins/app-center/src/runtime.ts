import { defineApp } from "@skynet/app-runtime";

export default defineApp({
    initialState: () => ({ revision: 0 }),
    reduce(state, command) {
        return {
            state:
                command.type === "$appCatalog"
                    ? { revision: state.revision + 1 }
                    : state,
        };
    },
});
