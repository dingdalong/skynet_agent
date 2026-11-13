import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const failures = [];
async function inspect(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
        if (
            ["node_modules", "dist", ".build", "Pods", "DerivedData"].includes(
                entry.name,
            )
        )
            continue;
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) {
            await inspect(file);
            continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
        const relative = path.relative(root, file);
        const source = await readFile(file, "utf8");
        const isBuiltin = relative.startsWith("builtins/");
        const isRuntime = isBuiltin && /runtime\.ts$/.test(relative);
        const imports = [
            ...source.matchAll(
                /(?:from\s*|import\s*|require\s*\(\s*)["']([^"']+)["']/g,
            ),
        ].map((match) => match[1]);
        for (const name of imports) {
            if (
                isBuiltin &&
                (/^(node:|react-native|@skynet\/host)/.test(name) ||
                    name.includes("/builtins/"))
            )
                failures.push(`${relative}: forbidden subapp import ${name}`);
            if (
                isRuntime &&
                !name.startsWith("@skynet/contracts") &&
                !name.startsWith("@skynet/app-runtime") &&
                !name.startsWith("./")
            )
                failures.push(
                    `${relative}: runtime dependency ${name} crosses its boundary`,
                );
            if (
                relative.startsWith("apps/host/src/") &&
                /(@skynet\/app-sdk|builtins\/)/.test(name)
            )
                failures.push(
                    `${relative}: host must not import subapp presentation`,
                );
        }
        if (
            isBuiltin &&
            /\b(fetch\s*\(|new\s+(?:WebSocket|Worker|SharedWorker)\s*\(|XMLHttpRequest|window\.webkit)/.test(
                source,
            )
        )
            failures.push(
                `${relative}: use SDK capabilities; do not own native resources in the view`,
            );
        if (
            isRuntime &&
            /\b(window|document|navigator|setTimeout|setInterval)\b/.test(
                source,
            )
        )
            failures.push(
                `${relative}: reducer must be synchronous and environment independent`,
            );
    }
}
for (const folder of ["apps/host/src", "builtins", "packages"])
    await inspect(`${root}${folder}`);
if (failures.length) throw new Error(failures.join("\n"));
console.log("Client import and resource boundaries passed");
