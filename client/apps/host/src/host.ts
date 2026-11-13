import { useSyncExternalStore } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import type { HostSnapshot, Json } from "@skynet/contracts";

interface NativeHost {
    command(name: string, input: Record<string, Json>): Promise<HostSnapshot>;
}
const native = NativeModules.SkynetHost as NativeHost;
let snapshot: HostSnapshot | undefined;
const listeners = new Set<() => void>();
let subscription: { remove(): void } | undefined;
function accept(next: HostSnapshot) {
    if (snapshot && next.revision < snapshot.revision) return;
    snapshot = next;
    for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!subscription) {
        subscription = new NativeEventEmitter(
            NativeModules.SkynetHost,
        ).addListener("workspace", accept);
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) {
            subscription?.remove();
            subscription = undefined;
        }
    };
}
export function useHost() {
    return useSyncExternalStore(subscribe, () => snapshot);
}
export async function command(name: string, input: Record<string, Json> = {}) {
    accept(await native.command(name, input));
}
