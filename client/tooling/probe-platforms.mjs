import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { clientRoot } from "./platforms/index.mjs";

const targets = process.argv.slice(2);
if (!targets.length) targets.push("ios", "android");
if (targets.some((target) => !["ios", "android"].includes(target)))
    throw new Error(
        "只验证共享 RN 工作区的 ios/android 依赖图，不构建原生应用。",
    );
const output = `${clientRoot}test-artifacts/platform-probes`;
await mkdir(output, { recursive: true });
for (const target of targets) {
    const child = spawn(
        process.execPath,
        [
            `${clientRoot}node_modules/react-native/cli.js`,
            "bundle",
            "--config",
            "metro.config.js",
            "--entry-file",
            "../../packages/workspace/src/Workspace.tsx",
            "--platform",
            target,
            "--dev",
            "false",
            "--max-workers",
            "2",
            "--bundle-output",
            `${output}/workspace.${target}.jsbundle`,
        ],
        { cwd: `${clientRoot}apps/host`, stdio: "inherit" },
    );
    const code = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", resolve);
    });
    if (code !== 0)
        throw new Error(`${target} shared workspace bundle failed: ${code}`);
    console.log(
        `${target}: 共享依赖图打包通过；未验证原生宿主、模拟器或真机。`,
    );
}
