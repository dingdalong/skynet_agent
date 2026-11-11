import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:integration_test/integration_test.dart';
import 'package:skynet_client/presentation/preferences.dart';
import 'package:skynet_client/data/preferences_store.dart';
import 'package:skynet_client/runtime/client_runtime.dart';

import '../test/support/journey.dart';
import '../test/support/lifecycle_journey.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized()
    ..framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;
  testWidgets('macOS workspace native interaction and persistence', (
    tester,
  ) async {
    debugPrint('Native verification: read preferences');
    final store = LocalPreferencesStore();
    final previous = await store.read();
    final runtime = ClientRuntime(store: store, log: debugPrint);
    final preferences = PreferencesController(runtime.preferences);
    try {
      debugPrint('Native verification: reset preferences');
      await store.write(const ClientPreferences());
      await runtime.initialize();
      debugPrint('Native verification: read platform settings');
      final nativeSettings = await const MethodChannel('skynet/apple-effects')
          .invokeMapMethod<String, Object?>('settings');
      expect(nativeSettings?['glass'], isA<bool>());
      expect(nativeSettings?['reduceTransparency'], isA<bool>());
      expect(nativeSettings?['highContrast'], isA<bool>());
      // Keep first-use costs in the report and compare the same warm journey.
      for (final reportKey in ['workspace_frames', 'workspace_repeat_frames']) {
        preferences.update(const ClientPreferences());
        await preferences.saved;
        await binding.watchPerformance(() async {
          await workspaceJourney(
            tester,
            preferences: preferences,
            runtime: runtime,
            nativeMenus: true,
          );
        }, reportKey: reportKey);
      }
      final reloaded = await store.read();
      expect(reloaded.wallpaper, ClientWallpaper.forest);
      expect(reloaded.reduceMotion, isTrue);
      await lifecycleJourney(tester, runtime: runtime, nativeMenus: true);
      expect((await store.read()).wallpaper, ClientWallpaper.dusk);
      binding.reportData!.addAll({
        'scenario': 'desktop-split-settings-overview-close-persistence',
        'completed': true,
        'lifecycleRecoveryCompleted': true,
        'nativeSettings': nativeSettings,
      });
    } finally {
      await store.write(previous);
      preferences.dispose();
      await runtime.shutdown();
    }
  });
}
