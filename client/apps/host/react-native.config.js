const {
    bundleCommand,
    startCommand,
} = require("@react-native/community-cli-plugin");

module.exports = {
    reactNativePath: "../../node_modules/react-native-macos",
    commands: [bundleCommand, startCommand],
    project: { macos: { sourceDir: "macos" } },
};
