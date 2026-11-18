import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { transform } from "esbuild";

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
        const isAgentClient = relative.startsWith("packages/agent-client/");
        const isWorkspace = relative.startsWith("packages/workspace/");
        const isBridge = relative.startsWith("packages/host-bridge/");
        if (entry.name.endsWith(".tsx")) {
            const { code } = await transform(source, {
                loader: "tsx",
                jsx: "transform",
                jsxFactory: "auditElement",
            });
            const nativeTags = [
                ...code.matchAll(/\bauditElement\(\s*"([^"]+)"/g),
            ].map((match) => match[1]);
            if (nativeTags.length)
                failures.push(
                    `${relative}: 使用 Astryx 官方组件替代直接绘制的 ${[...new Set(nativeTags)].join(", ")}`,
                );
        }
        const imports = [
            ...source.matchAll(
                /(?:from\s*|import\s*|require\s*\(\s*)["']([^"']+)["']/g,
            ),
        ].map((match) => match[1]);
        for (const name of imports) {
            if (
                isBuiltin &&
                (/^(node:|@skynet\/host)/.test(name) ||
                    name.includes("/builtins/"))
            )
                failures.push(`${relative}: forbidden subapp import ${name}`);
            if (
                isRuntime &&
                !name.startsWith("@skynet/contracts") &&
                !name.startsWith("@skynet/app-runtime") &&
                name !== "@skynet/agent-client" &&
                name !== "../manifest.json" &&
                !name.startsWith("./")
            )
                failures.push(
                    `${relative}: runtime dependency ${name} crosses its boundary`,
                );
            if (
                isAgentClient &&
                !name.startsWith("./") &&
                name !== "@skynet/contracts" &&
                name !== "protobufjs/light"
            )
                failures.push(
                    `${relative}: business protocol layer cannot import ${name}`,
                );
            if (
                relative.startsWith("apps/host/src/") &&
                /(@skynet\/app-sdk|builtins\/)/.test(name)
            )
                failures.push(
                    `${relative}: host must not import subapp presentation`,
                );
            if (
                (isWorkspace || isBridge) &&
                /^(@skynet\/app-sdk|node:)|apps\/host|builtins\//.test(name)
            )
                failures.push(
                    `${relative}: shared layer imports platform or subapp code ${name}`,
                );
            if (isBridge && /^react(-dom)?(\/|$)/.test(name))
                failures.push(
                    `${relative}: transport store must not depend on a UI runtime`,
                );
        }
        if (
            (isWorkspace || isBridge) &&
            /\b(NativeModules|NativeEventEmitter|requireNativeComponent|mouseDownCanMoveWindow|enableFocusRing)\b/.test(
                source,
            )
        )
            failures.push(
                `${relative}: native implementation belongs in the platform adapter`,
            );
        if (
            relative.startsWith("packages/app-sdk/") &&
            /\bwindow\.webkit\b/.test(source)
        )
            failures.push(`${relative}: use the host-injected transport`);
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
            (isRuntime || isAgentClient) &&
            /\b(window|document|navigator|setTimeout|setInterval|fetch|WebSocket|Worker|XMLHttpRequest)\b/.test(
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
