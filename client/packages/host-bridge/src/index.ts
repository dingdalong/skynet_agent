import type {
    HostSnapshot,
    Json,
    WorkspaceCommandName,
} from "@skynet/contracts";

/** A subscription is a UI lease. Removing it never releases host resources. */
export interface HostTransport {
    command(
        name: WorkspaceCommandName,
        input: Record<string, Json>,
    ): Promise<HostSnapshot>;
    subscribe(accept: (snapshot: HostSnapshot) => void): () => void;
}

/** Each mounted UI runtime owns only this cache, not the native host. */
export function createHostStore(transport: HostTransport) {
    let snapshot: HostSnapshot | undefined;
    const listeners = new Set<() => void>();
    let detach: (() => void) | undefined;
    let lease = 0;

    function accept(next: HostSnapshot) {
        if (snapshot && next.revision < snapshot.revision) return;
        snapshot = next;
        for (const listener of listeners) listener();
    }

    return {
        getSnapshot: () => snapshot,
        subscribe(listener: () => void) {
            let active = true;
            listeners.add(listener);
            if (!detach) {
                const current = ++lease;
                detach = transport.subscribe((next) => {
                    if (lease === current) accept(next);
                });
            }
            return () => {
                if (!active) return;
                active = false;
                listeners.delete(listener);
                if (!listeners.size && detach) {
                    const release = detach;
                    detach = undefined;
                    ++lease;
                    release();
                }
            };
        },
        async command(
            name: WorkspaceCommandName,
            input: Record<string, Json> = {},
        ) {
            accept(await transport.command(name, input));
        },
    };
}

export type HostStore = ReturnType<typeof createHostStore>;
