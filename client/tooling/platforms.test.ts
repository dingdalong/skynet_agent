import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defaultPlatform, requireBuildPlatform } from "./platforms/index.mjs";

describe("platform build preflight", () => {
    it("selects the host target and rejects unsupported platforms instead of falling back to macOS", () => {
        expect(defaultPlatform("darwin")).toBe("macos");
        expect(defaultPlatform("win32")).toBe("windows");
        expect(defaultPlatform("linux")).toBe("linux");
        expect(requireBuildPlatform("macos", "darwin").status).toBe(
            "supported",
        );
        expect(() => requireBuildPlatform("macos", "linux")).toThrow("darwin");
        for (const name of [
            "ios",
            "android",
            "windows",
            "linux",
            "web",
            "typo",
        ])
            expect(() => requireBuildPlatform(name, "darwin")).toThrow();
    });

    it("fails the real CLI before starting any build for an unsupported or misspelled target", () => {
        const script = fileURLToPath(new URL("./build.mjs", import.meta.url));
        for (const args of [
            ["build", "--platform", "windows"],
            ["build", "--platform", "linux"],
            ["build", "--platfrom", "macos"],
            ["build", "--platform"],
        ]) {
            const result = spawnSync(process.execPath, [script, ...args], {
                encoding: "utf8",
            });
            expect(result.status, result.stderr).toBe(2);
            expect(result.stdout).toBe("");
        }
    });
});
