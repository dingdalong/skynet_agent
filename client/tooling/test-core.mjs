import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../native/core", import.meta.url));
const build = `${source}/.build`;
async function run(command, args) {
    const child = spawn(command, args, { stdio: "inherit" });
    const code = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", resolve);
    });
    if (code !== 0) throw new Error(`${command} exited ${code}`);
}
await run("cmake", ["-S", source, "-B", build, "-DCMAKE_BUILD_TYPE=Release"]);
await run("cmake", ["--build", build, "--config", "Release"]);
await run("ctest", [
    "--test-dir",
    build,
    "-C",
    "Release",
    "--output-on-failure",
]);
