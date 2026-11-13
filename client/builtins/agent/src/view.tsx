import { createRoot } from "react-dom/client";
import { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";
import "@skynet/ui/styles.css";

function Agent() {
    useAppSnapshot();
    return <main aria-label="Agent" className="h-dvh bg-background" />;
}
createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <Agent />
    </AppBoundary>,
);
