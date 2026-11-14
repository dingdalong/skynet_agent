require "logger"
require "xcodeproj"
require "fileutils"

root = File.expand_path("..", __dir__)
folder = "#{root}/apps/host/ios"
project_path = "#{folder}/SkynetHost.xcodeproj"
project = File.exist?(project_path) ? Xcodeproj::Project.open(project_path) : Xcodeproj::Project.new(project_path)
target = project.targets.find { |item| item.name == "SkynetHost-iOS" } ||
    project.new_target(:application, "SkynetHost-iOS", :ios, "16.4")
group = project.main_group.groups.find { |item| item.path == "SkynetHost" } ||
    project.main_group.new_group("SkynetHost", "SkynetHost")
group.files.select { |file| file.path == "WorkspaceScene.swift" }.each(&:remove_from_project)
%w[HostApplication.swift HostBridge.swift AppSurface.swift SymbolLoader.m Exports.m].each do |name|
    file = group.files.find { |item| item.path == name } || group.new_file(name)
    target.source_build_phase.add_file_reference(file, true)
end
privacy = group.files.find { |item| item.path == "PrivacyInfo.xcprivacy" } || group.new_file("PrivacyInfo.xcprivacy")
target.resources_build_phase.add_file_reference(privacy, true)
assets = group.files.find { |item| item.path == "Assets.xcassets" } || group.new_file("Assets.xcassets")
target.resources_build_phase.add_file_reference(assets, true)
package = project.root_object.package_references.find { |item| item.isa == "XCLocalSwiftPackageReference" } ||
    project.new(Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
package.relative_path = "../../../native"
project.root_object.package_references << package unless project.root_object.package_references.include?(package)
product = target.package_product_dependencies.find { |item| item.product_name == "SkynetHostCore" } ||
    project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
product.product_name = "SkynetHostCore"
product.package = package
target.package_product_dependencies << product unless target.package_product_dependencies.include?(product)
unless target.frameworks_build_phase.files.any? { |item| item.product_ref == product }
    reference = project.new(Xcodeproj::Project::Object::PBXBuildFile)
    reference.product_ref = product
    target.frameworks_build_phase.files << reference
end
bundle = target.shell_script_build_phases.find { |phase| phase.name == "Bundle React Native code and images" } ||
    target.new_shell_script_build_phase("Bundle React Native code and images")
bundle.shell_script = "export NODE_BINARY=node\nexport FORCE_BUNDLING=1\nexport SKYNET_PLATFORM=ios\nexport RCT_METRO_PORT=8081\n\"$SRCROOT/../../../node_modules/react-native/scripts/react-native-xcode.sh\"\n"
bundle.always_out_of_date = "1"
copy = target.shell_script_build_phases.find { |phase| phase.name == "Copy Skynet applications" } ||
    target.new_shell_script_build_phase("Copy Skynet applications")
copy.shell_script = "mkdir -p \"$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/builtins\"\nrsync -a --delete \"$SRCROOT/../../../dist/builtins/\" \"$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/builtins/\"\n"
copy.always_out_of_date = "1"
target.build_configurations.each do |config|
    config.build_settings.merge!({
        "PRODUCT_NAME" => "Skynet Agent",
        "PRODUCT_MODULE_NAME" => "SkynetHost",
        "PRODUCT_BUNDLE_IDENTIFIER" => "app.skynet.agent",
        "IPHONEOS_DEPLOYMENT_TARGET" => "16.4",
        "TARGETED_DEVICE_FAMILY" => "1,2",
        "INFOPLIST_FILE" => "SkynetHost/Info.plist",
        "SWIFT_VERSION" => "5.0",
        "CLANG_ENABLE_MODULES" => "YES",
        "ENABLE_USER_SCRIPT_SANDBOXING" => "NO",
        "LD_RUNPATH_SEARCH_PATHS" => ["$(inherited)", "@executable_path/Frameworks"],
        "OTHER_LDFLAGS" => ["$(inherited)", "-ObjC", "-lc++"],
        "SUPPORTED_PLATFORMS" => "iphoneos iphonesimulator",
        "SUPPORTS_MACCATALYST" => "NO",
        "CODE_SIGN_STYLE" => "Automatic",
        "MARKETING_VERSION" => "0.1.0",
        "CURRENT_PROJECT_VERSION" => "1",
        "ASSETCATALOG_COMPILER_APPICON_NAME" => "AppIcon",
    })
end
project.save
tests = project.targets.find { |item| item.name == "SkynetHostTests" } ||
    project.new_target(:unit_test_bundle, "SkynetHostTests", :ios, "17.0")
tests.add_dependency(target) unless tests.dependencies.any? { |dependency| dependency.target == target }
test_group = project.main_group.groups.find { |item| item.path == "SkynetHostTests" } ||
    project.main_group.new_group("SkynetHostTests", "SkynetHostTests")
test_file = test_group.files.find { |item| item.path == "MobileHostTests.swift" } || test_group.new_file("MobileHostTests.swift")
tests.source_build_phase.add_file_reference(test_file, true)
shared_test = test_group.files.find { |item| item.name == "EmbeddedRuntimeTests.swift" } ||
    test_group.new_file("../../../../native/apple/Tests/SkynetHostCoreTests/EmbeddedRuntimeTests.swift")
shared_test.name = "EmbeddedRuntimeTests.swift"
tests.source_build_phase.add_file_reference(shared_test, true)
# Hosted tests use the App's already linked static core. Linking it into both
# bundles duplicates Swift/ObjC type identities and Xcode rejects the graph.
tests.package_product_dependencies.delete(product)
tests.frameworks_build_phase.files.select { |item| item.product_ref == product }.each(&:remove_from_project)
tests.build_configurations.each do |config|
    config.build_settings.merge!({
        "PRODUCT_NAME" => "SkynetHostTests",
        "PRODUCT_BUNDLE_IDENTIFIER" => "app.skynet.agent.tests",
        "GENERATE_INFOPLIST_FILE" => "YES",
        "SWIFT_VERSION" => "5.0",
        "IPHONEOS_DEPLOYMENT_TARGET" => "17.0",
        "BUNDLE_LOADER" => "$(TEST_HOST)",
        "TEST_HOST" => "$(BUILT_PRODUCTS_DIR)/Skynet Agent.app/Skynet Agent",
        "SWIFT_INCLUDE_PATHS" => ["$(inherited)", "$(BUILT_PRODUCTS_DIR)", "$(SRCROOT)/../../../native/core/include"],
        "CODE_SIGN_STYLE" => "Automatic",
    })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.add_test_target(tests)
scheme.test_action.build_configuration = "Debug"
scheme.save_as(project_path, "SkynetHost-iOS", true)
