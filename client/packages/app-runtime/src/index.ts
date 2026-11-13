import type { AppDefinition } from "@skynet/contracts";

/** Reducers and actions are synchronous. IO is returned as effect descriptors. */
export function defineApp<State>(
    definition: AppDefinition<State>,
): AppDefinition<State> {
    return Object.freeze(definition);
}
