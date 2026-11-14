const {
    bundleCommand,
    startCommand,
} = require("@react-native/community-cli-plugin");
const ios = require("@react-native-community/cli-platform-ios");

module.exports = {
    reactNativePath:
        process.env.SKYNET_PLATFORM === "ios"
            ? "../../node_modules/react-native"
            : "../../node_modules/react-native-macos",
    commands: [bundleCommand, startCommand],
    platforms: {
        ios: { projectConfig: ios.projectConfig, dependencyConfig: ios.dependencyConfig },
    },
    project: { macos: { sourceDir: "macos" }, ios: { sourceDir: "ios" } },
};
