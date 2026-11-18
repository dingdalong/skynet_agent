require "logger"
require "xcodeproj"

root = File.expand_path("..", __dir__)
project_path = "#{root}/apps/host/macos/SkynetHost.xcodeproj"
project = Xcodeproj::Project.open(project_path)
project.targets.select { |target| target.name.end_with?("-iOS") }.each(&:remove_from_project)
target = project.targets.find { |item| item.name == "SkynetHost-macOS" }
group = project.main_group.groups.find { |item| item.path == "SkynetHost-macOS" }
group.files.select { |file| file.path == "AppDelegate.swift" }.each(&:remove_from_project)
group.files.select { |file| file.path&.end_with?(".entitlements") }.each(&:remove_from_project)
%w[HostApplication.swift HostBridge.swift AppSurface.swift WorkspaceScene.swift Exports.m].each do |name|
    file = group.files.find { |item| item.path == name } || group.new_file(name)
    target.source_build_phase.add_file_reference(file, true)
end
target.shell_script_build_phases.each do |phase|
    if phase.name == "Bundle React Native code and images"
        phase.shell_script = "export NODE_BINARY=node\nexport FORCE_BUNDLING=1\n\"$SRCROOT/../../../node_modules/react-native-macos/scripts/react-native-xcode.sh\"\n"
    end
end
copy = target.shell_script_build_phases.find { |phase| phase.name == "Copy Skynet applications" } ||
    target.new_shell_script_build_phase("Copy Skynet applications")
copy.shell_script = "node \"$SRCROOT/../../../tooling/copy-resources.mjs\" \"$TARGET_BUILD_DIR/$CONTENTS_FOLDER_PATH\"\n"
target.build_configurations.each do |config|
    config.build_settings["PRODUCT_NAME"] = "Skynet Agent"
    config.build_settings["PRODUCT_BUNDLE_IDENTIFIER"] = "app.skynet.agent"
    config.build_settings["ENABLE_APP_SANDBOX"] = "NO"
    # Ad-hoc signatures have no Team ID for hardened library validation.
    # Distribution must sign the host and embedded engines with one identity.
    config.build_settings["ENABLE_HARDENED_RUNTIME"] = "NO"
    config.build_settings["CODE_SIGN_ENTITLEMENTS"] = ""
    config.build_settings["ENABLE_USER_SCRIPT_SANDBOXING"] = "NO"
    config.build_settings["SWIFT_INCLUDE_PATHS"] = ["$(inherited)", "$(SRCROOT)/../../../native/.build/out/Products/$(CONFIGURATION)", "$(SRCROOT)/../../../native/apple/Sources/AgentRuntime", "$(SRCROOT)/../../../native/core/include"]
    config.build_settings["LIBRARY_SEARCH_PATHS"] = ["$(inherited)", "$(SRCROOT)/../../../native/.build/out/Products/$(CONFIGURATION)", "$(SRCROOT)/../../../native/.build/c-core"]
    config.build_settings["OTHER_LDFLAGS"] = ["$(inherited)", "-lSkynetHostCore", "-lagent_runtime", "-lc++", "-framework", "WebKit", "-framework", "JavaScriptCore"]
    config.build_settings["SWIFT_VERSION"] = "5.0"
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, "SkynetHost-macOS", true)
