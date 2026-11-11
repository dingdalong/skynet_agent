import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/presentation/preferences.dart';
import 'package:skynet_client/presentation/workspace/controller.dart';
import 'package:skynet_client/runtime/client_runtime.dart';

class MemoryPreferences implements PreferencesStore {
  ClientPreferences value = const ClientPreferences();
  @override
  Future<ClientPreferences> read() async => value;
  @override
  Future<void> write(ClientPreferences preferences) async {
    value = preferences;
  }
}

class TestClient {
  TestClient({PreferencesStore? store}) {
    runtime = ClientRuntime(
      store: store ?? MemoryPreferences(),
      log: debugPrint,
    );
    preferences = PreferencesController(runtime.preferences);
    workspace = WorkspaceController(runtime.workspace, runtime.settings);
    addTearDown(() {
      workspace.dispose();
      preferences.dispose();
      // Widget-test teardown runs outside its fake clock. Await asynchronous
      // writes/shutdown in the test body; leases can always close synchronously.
      runtime.workspace.close();
      runtime.settings.close();
      runtime.app(WorkspacePane.chat).close();
      runtime.app(WorkspacePane.settings).close();
      runtime.preferences.close();
    });
  }
  late final ClientRuntime runtime;
  late final PreferencesController preferences;
  late final WorkspaceController workspace;
}
