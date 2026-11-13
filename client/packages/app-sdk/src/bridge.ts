import type { AppSnapshot, Json } from "@skynet/contracts";

declare global {
    interface Window {
        __skynetInitialSnapshot?: AppSnapshot;
        __skynetPresentationId?: string;
        webkit?: {
            messageHandlers: {
                skynet: { postMessage(message: unknown): void };
            };
        };
    }
}

type Listener = () => void;
let snapshot: AppSnapshot | undefined = window.__skynetInitialSnapshot;
const listeners = new Set<Listener>();
function acceptSnapshot(next: AppSnapshot) {
    if (
        snapshot &&
        (next.generation < snapshot.generation ||
            (next.generation === snapshot.generation &&
                next.revision < snapshot.revision))
    )
        return;
    snapshot = next;
    for (const listener of listeners) listener();
}
const pending = new Map<
    string,
    {
        resolve(value: Record<string, Json>): void;
        reject(error: Error): void;
        timer: ReturnType<typeof setTimeout>;
    }
>();

window.addEventListener("skynet:message", (event) => {
    const message = (event as CustomEvent).detail;
    if (!message || typeof message !== "object") return;
    if (message.kind === "snapshot") {
        const next = message.value as AppSnapshot;
        if (
            snapshot &&
            (next.generation < snapshot.generation ||
                (next.generation === snapshot.generation &&
                    next.revision < snapshot.revision))
        )
            return;
        acceptSnapshot(next);
    } else if (typeof message.requestId === "string") {
        const request = pending.get(message.requestId);
        if (!request) return;
        pending.delete(message.requestId);
        clearTimeout(request.timer);
        if (message.error) request.reject(new Error(message.error));
        else request.resolve(message.value);
    }
});

export function request(
    kind: string,
    input: Record<string, Json> = {},
): Promise<Record<string, Json>> {
    return new Promise((resolve, reject) => {
        const handler = window.webkit?.messageHandlers.skynet;
        if (!handler) {
            reject(new Error("此应用需要在 Skynet 宿主中运行"));
            return;
        }
        if (pending.size >= 64) {
            reject(new Error("待处理请求过多"));
            return;
        }
        const requestId = crypto.randomUUID();
        const timer = setTimeout(() => {
            pending.delete(requestId);
            reject(new Error(`请求超时：${kind}`));
        }, 15_000);
        pending.set(requestId, { resolve, reject, timer });
        handler.postMessage({
            requestId,
            kind,
            input,
            presentationId: window.__skynetPresentationId,
        });
    });
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
export function getSnapshot(): AppSnapshot | undefined {
    return snapshot;
}

export const app = {
    command: (name: string, payload: Json = null) =>
        request("command", { name, payload }),
    call: (target: string, name: string, input: Json) =>
        request("action", { target, name, input }),
    setPreferences: (value: Record<string, Json>) =>
        request("preferences.set", value),
    install: () => request("apps.install"),
    remove: (appId: string) => request("apps.remove", { appId }),
    restart: (appId: string) => request("apps.restart", { appId }),
    cancelTask: (taskId: string) => request("task.cancel", { taskId }),
};

export async function refreshSnapshot(): Promise<void> {
    const value = await request("snapshot");
    acceptSnapshot(value as unknown as AppSnapshot);
}
