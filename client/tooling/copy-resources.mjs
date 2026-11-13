import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const contents = process.argv[2];
if (!contents) throw new Error("App Contents path required");
await mkdir(path.join(contents, "Helpers"), { recursive: true });
await rm(path.join(contents, "Resources/builtins"), {
    recursive: true,
    force: true,
});
await cp(`${root}dist/builtins`, path.join(contents, "Resources/builtins"), {
    recursive: true,
    force: true,
});
await cp(
    `${root}native/.build/c-core/process_launcher`,
    path.join(contents, "Helpers/process_launcher"),
);
await cp(
    `${root}native/.build/c-core/agent_worker`,
    path.join(contents, "Helpers/agent_worker"),
);
await cp(
    `${root}native/.build/out/Products/${process.env.CONFIGURATION ?? "Release"}/SkynetAppRuntime`,
    path.join(contents, "Helpers/SkynetAppRuntime"),
);
