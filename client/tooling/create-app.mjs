import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const id = process.argv[2];
const destination = path.resolve(
    process.argv[3] ??
        fileURLToPath(new URL(`../local-apps/${id}`, import.meta.url)),
);
if (!id || !/^[a-z][a-z0-9.-]{2,63}$/.test(id))
    throw new Error(
        "Usage: node tooling/create-app.mjs com.example.app [directory]",
    );
await mkdir(path.join(destination, "src"), { recursive: true });
const manifest = {
    schemaVersion: 1,
    minimumHostVersion: 1,
    stateVersion: 1,
    id,
    name: id,
    version: "1.0.0",
    permissions: [],
    networkOrigins: [],
    actions: {},
};
const sources = {
    "manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "src/runtime.ts": `import { defineApp } from "@skynet/app-runtime";\nexport default defineApp({\n    initialState: () => ({ count: 0 }),\n    reduce: (state, command) => ({ state: command.type === "increment" ? { count: state.count + 1 } : state }),\n});\n`,
    "src/view.tsx": `import { createRoot } from "react-dom/client";\nimport { app } from "@skynet/app-sdk";\nimport { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";\nimport { Button } from "@skynet/ui/components/ui/button";\nimport "@skynet/ui/styles.css";\nfunction App() {\n    const snapshot = useAppSnapshot<{count: number}>();\n    return <main className="p-8"><Button onClick={() => void app.command("increment")}>Count {snapshot?.state?.count ?? 0}</Button></main>;\n}\ncreateRoot(document.getElementById("root")!).render(<AppBoundary><App /></AppBoundary>);\n`,
    "index.html": `<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id}</title></head><body><div id="root"></div><script type="module" src="./src/view.tsx"></script></body></html>\n`,
};
for (const [file, source] of Object.entries(sources)) {
    await writeFile(path.join(destination, file), source, { flag: "wx" });
}
console.log(
    `Created ${destination}; build: node tooling/build-apps.mjs ${destination}`,
);
