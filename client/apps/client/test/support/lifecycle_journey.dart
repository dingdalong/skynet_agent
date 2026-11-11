import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/presentation/client_app.dart';
import 'package:skynet_client/presentation/preferences.dart';
import 'package:skynet_client/runtime/client_runtime.dart';
import 'package:skynet_client/runtime/workspace.dart';
import 'package:skynet_client/domain/workspace.dart';

import 'journey.dart';

Future<void> lifecycleJourney(
  WidgetTester tester, {
  required ClientRuntime runtime,
  bool nativeMenus = false,
}) async {
  final preferences = PreferencesController(runtime.preferences);
  try {
    await tester.pumpWidget(
      ClientApp(runtime: runtime, nativeMenus: nativeMenus),
    );
    await tester.pumpAndSettle();
    await tap(tester, 'launch-settings');
    await tap(tester, 'category-wallpaper');
    await tap(tester, 'wallpaper-dusk');
    final actor = runtime.settings;
    final revision = runtime.app(WorkspacePane.settings).state.viewRevision;
    runtime.reloadView(WorkspacePane.settings);
    await tester.pumpAndSettle();
    expect(identical(runtime.settings, actor), isTrue);
    expect(byKey('settings-page-wallpaper'), findsOneWidget);
    expect(preferences.value.wallpaper, ClientWallpaper.dusk);

    runtime.guard(
      WorkspacePane.settings,
      revision + 1,
      () => throw StateError('lifecycle verification: recoverable callback'),
    );
    await tester.pumpAndSettle();
    expect(find.text('此应用暂时无法显示'), findsOneWidget);
    await tap(tester, 'settings-home');
    await tap(tester, 'launch-chat');
    expect(byKey('chat-content'), findsOneWidget);
    await tap(tester, 'chat-home');
    await tap(tester, 'dock-settings');
    await tester.tap(find.text('重新加载界面').hitTestable());
    await tester.pumpAndSettle();
    expect(byKey('settings-page-wallpaper'), findsOneWidget);

    // Replacing the entire Flutter view still leaves the injected host alive.
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
    expect(runtime.preferences.closed, isFalse);
    expect(runtime.workspace.state.screen, WorkspaceScreen.app);
    await tester.pumpWidget(
      ClientApp(runtime: runtime, nativeMenus: nativeMenus),
    );
    await tester.pumpAndSettle();
    expect(byKey('settings-page-wallpaper'), findsOneWidget);
    expect(preferences.value.wallpaper, ClientWallpaper.dusk);
    expect(runtime.app(WorkspacePane.chat).state.failed, isFalse);
    runtime.workspace.dispatch(ShowHome());
    await tester.pumpAndSettle();
    await preferences.saved;
    expect(tester.takeException(), isNull);
  } finally {
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
    preferences.dispose();
  }
}
