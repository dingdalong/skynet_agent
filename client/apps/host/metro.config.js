const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const root = path.resolve(__dirname, "../..");

module.exports = mergeConfig(getDefaultConfig(__dirname), {
    watchFolders: [root],
    resolver: {
        platforms: ["macos", "ios", "android", "windows", "native"],
        nodeModulesPaths: [path.join(root, "node_modules")],
        resolveRequest(context, moduleName, platform) {
            const aliases = {
                "@skynet/workspace": path.join(
                    root,
                    "packages/workspace/src/Workspace.tsx",
                ),
                "@skynet/workspace/platform": path.join(
                    root,
                    "packages/workspace/src/platform.tsx",
                ),
                "@skynet/host-bridge": path.join(
                    root,
                    "packages/host-bridge/src/index.ts",
                ),
                "@skynet/contracts": path.join(
                    root,
                    "packages/contracts/src/index.ts",
                ),
                "@skynet/tokens": path.join(root, "packages/tokens/theme.ts"),
            };
            const name =
                platform === "macos" &&
                (moduleName === "react-native" ||
                    moduleName.startsWith("react-native/"))
                    ? moduleName.replace("react-native", "react-native-macos")
                    : (aliases[moduleName] ?? moduleName);
            return context.resolveRequest(context, name, platform);
        },
    },
});
