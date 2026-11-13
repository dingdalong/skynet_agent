import { build as buildWeb } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./generate-tokens.mjs";
import "./generate-protocol.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const aliases = {
    "react-dom": `${root}node_modules/react-dom`,
    react: `${root}node_modules/react`,
    "@skynet/contracts": `${root}packages/contracts/src/index.ts`,
    "@skynet/app-runtime": `${root}packages/app-runtime/src/index.ts`,
    "@skynet/agent-client/selectors": `${root}packages/agent-client/src/selectors.ts`,
    "@skynet/agent-client/types": `${root}packages/agent-client/src/types.ts`,
    "@skynet/agent-client": `${root}packages/agent-client/src/index.ts`,
    "@skynet/app-sdk/react": `${root}packages/app-sdk/src/react.tsx`,
    "@skynet/app-sdk": `${root}packages/app-sdk/src/bridge.ts`,
    "@skynet/ui": `${root}packages/ui/src`,
    "@skynet/tokens": `${root}packages/tokens/theme.ts`,
    "@": `${root}packages/ui/src`,
};

export async function packageApp(source, output) {
    const manifest = JSON.parse(
        await readFile(path.join(source, "manifest.json"), "utf8"),
    );
    await rm(output, { force: true, recursive: true });
    await mkdir(output, { recursive: true });
    await buildWeb({
        configFile: false,
        root: source,
        base: "./",
        plugins: [react(), tailwindcss()],
        resolve: { alias: aliases },
        build: {
            outDir: path.join(output, "ui"),
            emptyOutDir: true,
            modulePreload: false,
            rolldownOptions: { output: { format: "iife" } },
        },
    });
    const html = path.join(output, "ui/index.html");
    // Static IIFE bundles work on WebKit's private custom URL scheme.
    await writeFile(
        html,
        (await readFile(html, "utf8")).replaceAll('type="module"', "defer"),
    );
    await build({
        entryPoints: [path.join(source, "src/runtime.ts")],
        outfile: path.join(output, "runtime.js"),
        bundle: true,
        platform: "neutral",
        format: "iife",
        globalName: "SkynetRuntime",
        target: "es2020",
        inject: [`${root}packages/app-runtime/src/text-codec.ts`],
        alias: aliases,
        footer: { js: "globalThis.SkynetApp = SkynetRuntime.default;" },
    });
    const files = {};
    async function walk(folder, prefix = "") {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
            const relative = `${prefix}${entry.name}`;
            if (entry.isDirectory())
                await walk(path.join(folder, entry.name), `${relative}/`);
            else
                files[relative] = createHash("sha256")
                    .update(await readFile(path.join(folder, entry.name)))
                    .digest("hex");
        }
    }
    await walk(output);
    await writeFile(
        path.join(output, "manifest.json"),
        `${JSON.stringify({ ...manifest, files }, null, 2)}\n`,
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv[2]) {
        const source = path.resolve(process.argv[2]);
        const manifest = JSON.parse(
            await readFile(path.join(source, "manifest.json"), "utf8"),
        );
        await packageApp(
            source,
            path.resolve(
                process.argv[3] ?? `${root}dist/packages/${manifest.id}.skapp`,
            ),
        );
    } else {
        for (const name of ["settings", "agent"]) {
            await packageApp(
                `${root}builtins/${name}`,
                `${root}dist/builtins/${name}.skapp`,
            );
        }
    }
}
