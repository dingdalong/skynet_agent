import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { clientRoot } from "./platforms/index.mjs";

const host = `${clientRoot}apps/host`;
const ios = `${host}/ios`;
const environment = {
    ...process.env,
    DEVELOPER_DIR:
        process.env.DEVELOPER_DIR ??
        "/Applications/Xcode.app/Contents/Developer",
};
const action = process.argv[2] ?? "build";
async function run(executable, args, cwd = clientRoot, capture = false) {
    return await new Promise((resolve, reject) => {
        const child = spawn(executable, args, {
            cwd,
            env: environment,
            stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
        });
        let output = "";
        if (capture) child.stdout.on("data", (data) => (output += data));
        child.once("error", reject);
        child.once("exit", (code) =>
            code === 0
                ? resolve(output)
                : reject(Error(`${executable} exited ${code}`)),
        );
    });
}
async function device() {
    const list = JSON.parse(
        await run(
            "xcrun",
            ["simctl", "list", "devices", "available", "-j"],
            clientRoot,
            true,
        ),
    );
    const devices = Object.entries(list.devices)
        .filter(([runtime]) => runtime.includes(".iOS-"))
        .flatMap(([, entries]) => entries);
    const requested = process.env.SKYNET_IOS_DEVICE;
    const target = requested
        ? devices.find(
              (entry) => entry.udid === requested || entry.name === requested,
          )
        : (devices.find(
              (entry) =>
                  entry.state === "Booted" && entry.name.startsWith("iPhone"),
          ) ??
          devices.find((entry) => entry.name === "iPhone 18 Pro") ??
          devices.find((entry) => entry.name.startsWith("iPhone")));
    if (!target)
        throw Error(
            "没有可用的 iOS 模拟器；可通过 SKYNET_IOS_DEVICE 指定设备名称或 UDID",
        );
    if (target.state !== "Booted")
        await run("xcrun", ["simctl", "boot", target.udid]);
    await run("xcrun", ["simctl", "bootstatus", target.udid, "-b"]);
    return target;
}
try {
    if (!["install", "build", "dev", "test", "archive"].includes(action))
        throw Error(`未知 iOS 操作 ${action}`);
    if (action !== "install") {
        await run(process.execPath, [`${clientRoot}tooling/build-apps.mjs`]);
        const archive = action === "archive";
        const configuration = action === "test" ? "Debug" : "Release";
        const target =
            action === "test" || action === "dev" ? await device() : null;
        await run(
            action === "test" ? process.execPath : "xcodebuild",
            [
                ...(action === "test"
                    ? [`${clientRoot}tooling/test-native.mjs`, "--xcodebuild"]
                    : []),
                "-project",
                "SkynetHost.xcodeproj",
                "-scheme",
                "SkynetHost-iOS",
                "-configuration",
                configuration,
                "-sdk",
                archive ? "iphoneos" : "iphonesimulator",
                "-destination",
                target
                    ? `platform=iOS Simulator,id=${target.udid}`
                    : archive
                      ? "generic/platform=iOS"
                      : "generic/platform=iOS Simulator",
                "-derivedDataPath",
                "DerivedData/Workspace",
                "-jobs",
                "4",
                ...(archive && process.env.SKYNET_APPLE_TEAM
                    ? [`DEVELOPMENT_TEAM=${process.env.SKYNET_APPLE_TEAM}`]
                    : ["CODE_SIGNING_ALLOWED=NO"]),
                ...(archive
                    ? [
                          "-archivePath",
                          `${clientRoot}dist/ios/Skynet Agent.xcarchive`,
                          "archive",
                      ]
                    : [action === "test" ? "test" : "build"]),
            ],
            ios,
        );
        const app = `${ios}/DerivedData/Workspace/Build/Products/${configuration}-iphonesimulator/Skynet Agent.app`;
        if (archive) {
            console.log(
                process.env.SKYNET_APPLE_TEAM
                    ? "已生成 iOS 归档；可在 Xcode Organizer 验证并分发。"
                    : "已生成未签名 iOS 归档；安装真机和分发前需 Apple 开发团队签名。",
            );
        } else if (action === "dev") {
            await run("xcrun", ["simctl", "install", target.udid, app]);
            await run("xcrun", [
                "simctl",
                "launch",
                "--terminate-running-process",
                target.udid,
                "app.skynet.agent",
            ]);
            console.log(`iOS 已启动：${target.name} (${target.udid})`);
        } else if (action === "build") {
            const output = `${clientRoot}dist/ios-simulator/Skynet Agent.app`;
            await mkdir(path.dirname(output), { recursive: true });
            await rm(output, { recursive: true, force: true });
            await cp(app, output, { recursive: true, verbatimSymlinks: true });
            console.log(
                "已生成 iPhone/iPad 通用模拟器 App；真机归档与 App Store 分发需开发团队签名。",
            );
        }
    }
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
