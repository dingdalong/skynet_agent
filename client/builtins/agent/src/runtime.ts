import { defineApp } from "@skynet/app-runtime";

export default defineApp<Record<string, never>>({
    initialState: () => ({}),
    reduce: (state) => ({ state }),
});
