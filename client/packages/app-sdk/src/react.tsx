import {
    Component,
    useEffect,
    useLayoutEffect,
    useSyncExternalStore,
    type ErrorInfo,
    type ReactNode,
} from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@skynet/ui/components/ui/alert";
import { Button } from "@skynet/ui/components/ui/button";
import type { AppSnapshot, Json } from "@skynet/contracts";
import { getSnapshot, refreshSnapshot, request, subscribe } from "./bridge";

let presentationReady = false;
function revealPresentation() {
    if (presentationReady) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const cleanup = () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    const ready = () => {
        cleanup();
        if (presentationReady) return;
        presentationReady = true;
        void request("view.ready").catch(console.error);
    };
    function onVisibilityChange() {
        if (document.hidden) ready();
    }
    // Occluded/background WebViews suspend animation frames. Their committed UI
    // is already safe to reveal when the window becomes visible again.
    if (document.hidden) ready();
    else {
        document.addEventListener("visibilitychange", onVisibilityChange);
        firstFrame = requestAnimationFrame(() => {
            secondFrame = requestAnimationFrame(ready);
        });
    }
    return cleanup;
}

export class AppBoundary extends Component<
    { children: ReactNode },
    { error?: string }
> {
    state: { error?: string } = {};
    static getDerivedStateFromError(error: Error) {
        return { error: error.message };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        revealPresentation();
        void request("view.error", {
            message: `${error.message}\n${info.componentStack ?? ""}`.slice(
                0,
                2048,
            ),
        }).catch(console.error);
    }
    render() {
        if (!this.state.error) return this.props.children;
        return (
            <main className="flex h-dvh items-center justify-center p-8">
                <div className="flex w-full max-w-lg flex-col gap-5">
                    <Alert variant="destructive">
                        <AlertCircle />
                        <AlertTitle>应用界面遇到问题</AlertTitle>
                        <AlertDescription>{this.state.error}</AlertDescription>
                    </Alert>
                    <Button variant="outline" onClick={() => location.reload()}>
                        <RotateCcw data-icon="inline-start" />
                        重新载入界面
                    </Button>
                </div>
            </main>
        );
    }
}

export function useAppSnapshot<State = Json>(): AppSnapshot<State> | undefined {
    useEffect(() => {
        void refreshSnapshot().catch(console.error);
    }, []);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot);
    useLayoutEffect(() => {
        const preference = snapshot?.preferences.appearance ?? "system";
        const media = matchMedia("(prefers-color-scheme: dark)");
        const update = () => {
            document.documentElement.classList.toggle(
                "dark",
                preference === "dark" ||
                    (preference === "system" && media.matches),
            );
        };
        update();
        document.documentElement.dataset.reduceMotion = String(
            snapshot?.preferences.reduceMotion ?? false,
        );
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, [snapshot?.preferences.appearance, snapshot?.preferences.reduceMotion]);
    useEffect(() => {
        if (snapshot) return revealPresentation();
    }, [!!snapshot]);
    return snapshot as AppSnapshot<State> | undefined;
}
