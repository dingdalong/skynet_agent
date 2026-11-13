import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
const child = spawn(
    "xcrun",
    [
        "swift-format",
        check ? "lint" : "format",
        check ? "--strict" : "--in-place",
        "--configuration",
        `${root}.swift-format`,
        "--recursive",
        `${root}apps/host/native/Package.swift`,
        `${root}apps/host/native/Sources`,
        `${root}apps/host/native/Tests`,
        `${root}apps/host/macos/SkynetHost-macOS`,
        `${root}apps/host/macos/SkynetHostUITests`,
    ],
    {
        stdio: "inherit",
        env: {
            ...process.env,
            DEVELOPER_DIR:
                process.env.DEVELOPER_DIR ??
                "/Applications/Xcode.app/Contents/Developer",
        },
    },
);
child.once("error", (error) => {
    console.error(error);
    process.exitCode = 1;
});
child.once("exit", (code) => {
    process.exitCode = code ?? 1;
});
