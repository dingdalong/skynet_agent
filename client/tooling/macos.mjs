import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const repository = path.dirname(root.replace(/\/$/, ""));
const host = `${root}apps/host`;
const native = `${root}native`;
const command = process.argv[2] ?? "build";
const configuration = command === "test" ? "Debug" : "Release";
const environment = {
    ...process.env,
    DEVELOPER_DIR:
        process.env.DEVELOPER_DIR ??
        "/Applications/Xcode.app/Contents/Developer",
    MACOSX_DEPLOYMENT_TARGET: "14.0",
};
async function run(executable, args, cwd = root, env = environment) {
    await new Promise((resolve, reject) => {
        const child = spawn(executable, args, { cwd, env, stdio: "inherit" });
        child.once("error", reject);
        child.once("exit", (code) =>
            code === 0
                ? resolve()
                : reject(new Error(`${executable} exited ${code}`)),
        );
    });
}
if (command !== "install") {
    const cBuild = `${native}/.build/c-core`;
    await run("make", [
        "-C",
        `${repository}/common/native/agent_runtime`,
        `BUILD_DIR=${cBuild}`,
        "CFLAGS=-O2 -g -DNDEBUG -mmacosx-version-min=14.0",
    ]);
    const swiftArgs = ["--package-path", native, "-Xlinker", `-L${cBuild}`];
    if (command === "test") {
        await run("node", [`${root}tooling/build-apps.mjs`]);
        await run("node", [`${root}tooling/test-native.mjs`, ...swiftArgs]);
    } else {
        await run("node", [`${root}tooling/build-apps.mjs`]);
        await run("swift", [
            "build",
            "-c",
            configuration.toLowerCase(),
            ...swiftArgs,
        ]);
        await run(
            "xcodebuild",
            [
                "-project",
                "macos/SkynetHost.xcodeproj",
                "-scheme",
                "SkynetHost-macOS",
                "-configuration",
                configuration,
                "-derivedDataPath",
                "DerivedData/Workspace",
                `ARCHS=${process.arch === "arm64" ? "arm64" : "x86_64"}`,
                "ONLY_ACTIVE_ARCH=YES",
                "CODE_SIGNING_ALLOWED=NO",
                "build",
            ],
            host,
        );
        const app = `${host}/DerivedData/Workspace/Build/Products/${configuration}/Skynet Agent.app`;
        // Sign nested executables first; the source build is local and ad hoc.
        await run("codesign", [
            "--force",
            "--sign",
            "-",
            `${app}/Contents/Helpers/SkynetAppRuntime`,
        ]);
        await run("codesign", [
            "--force",
            "--sign",
            "-",
            `${app}/Contents/Helpers/process_launcher`,
        ]);
        await run("codesign", [
            "--force",
            "--sign",
            "-",
            `${app}/Contents/Helpers/agent_worker`,
        ]);
        await run("codesign", ["--force", "--deep", "--sign", "-", app]);
        if (command === "dev") await run("open", ["-n", app]);
        else {
            await mkdir(`${root}dist/macos`, { recursive: true });
            const destination = `${root}dist/macos/Skynet Agent.app`;
            await rm(destination, { recursive: true, force: true });
            await cp(app, destination, {
                recursive: true,
                verbatimSymlinks: true,
            });
        }
    }
}
