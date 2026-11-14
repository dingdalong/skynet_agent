import { spawn } from "node:child_process";
import {
    clientRoot,
    defaultPlatform,
    installedVersions,
    platforms,
    requireBuildPlatform,
} from "./platforms/index.mjs";

const [action = "build", ...args] = process.argv.slice(2);
let platform = defaultPlatform();
let preflight = false;
try {
    for (let index = 0; index < args.length; index++) {
        if (args[index] === "--platform" && args[index + 1])
            platform = args[++index];
        else if (args[index] === "--preflight") preflight = true;
        else throw new Error(`未知参数 ${args[index]}`);
    }
    if (
        ![
            "build",
            "dev",
            "test",
            "install",
            "archive",
            "doctor",
            "list",
        ].includes(action)
    )
        throw new Error(`未知构建操作 ${action}`);
    if (action === "list" || action === "doctor") {
        for (const [name, target] of Object.entries(platforms))
            console.log(
                `${name.padEnd(8)} ${target.status.padEnd(10)} ${target.detail}`,
            );
        if (action === "doctor")
            console.log(
                JSON.stringify(
                    {
                        buildHost: `${process.platform}/${process.arch}`,
                        node: process.version,
                        versions: await installedVersions(),
                        note: "仅报告项目锁定版本；不代表其他平台的版本兼容性已验证。",
                    },
                    null,
                    2,
                ),
            );
    } else {
        // Reject unsupported targets before building apps, installing tools,
        // modifying generated resources or launching any application.
        requireBuildPlatform(platform);
        if (action === "archive" && platform !== "ios")
            throw new Error(
                "归档入口当前仅支持 iOS；其他平台使用 client-build",
            );
        if (!preflight) {
            const child = spawn(
                process.execPath,
                [`${clientRoot}tooling/${platform}.mjs`, action],
                { stdio: "inherit", env: process.env },
            );
            process.exitCode = await new Promise((resolve, reject) => {
                child.once("error", reject);
                child.once("exit", (code) => resolve(code ?? 1));
            });
        }
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 2;
}
