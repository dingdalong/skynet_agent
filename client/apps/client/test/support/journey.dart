import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:skynet_client/presentation/client_app.dart';
import 'package:skynet_client/runtime/client_runtime.dart';
import 'package:skynet_client/presentation/preferences.dart';
import 'package:skynet_client/presentation/workspace/controller.dart';

Finder byKey(String key) => find.byKey(ValueKey(key));
Future<void> tap(WidgetTester tester, String key) async {
  debugPrint(
    'Workspace action: $key, lifecycle=${tester.binding.lifecycleState}, '
    'frames=${tester.binding.framesEnabled}',
  );
  await tester.tap(byKey(key));
  try {
    await tester.pumpAndSettle(
      const Duration(milliseconds: 100),
      EnginePhase.sendSemanticsUpdate,
      const Duration(seconds: 12),
    );
  } catch (error) {
    debugPrint(
      'Workspace wait failed: $key, lifecycle=${tester.binding.lifecycleState}, '
      'frames=${tester.binding.framesEnabled}, '
      'callbacks=${tester.binding.transientCallbackCount}',
    );
    rethrow;
  }
  expect(tester.takeException(), isNull, reason: key);
}

Future<void> workspaceJourney(
  WidgetTester tester, {
  required PreferencesController preferences,
  required ClientRuntime runtime,
  bool nativeMenus = false,
}) async {
  final workspace = WorkspaceController(runtime.workspace, runtime.settings);
  await tester.pumpWidget(
    ClientApp(runtime: runtime, workspace: workspace, nativeMenus: nativeMenus),
  );
  await tester.pumpAndSettle();
  await tap(tester, 'desktop-overview');
  expect(find.text('没有后台应用'), findsOneWidget);
  await tap(tester, 'overview-home');
  await tap(tester, 'launch-chat');
  expect(workspace.screen, WorkspaceScreen.app);
  await tester.drag(byKey('grip-chat'), const Offset(-160, 0));
  await tester.pumpAndSettle();
  expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.desktop]);
  expect(tester.takeException(), isNull);
  var divider = tester.getCenter(byKey('workspace-divider'));
  final width = workspace.size.width;
  final gesture = await tester.startGesture(divider);
  await gesture.moveTo(Offset(4 + (width - 8) / 3, divider.dy));
  await tester.pump();
  await gesture.up();
  await tester.pumpAndSettle();
  expect(workspace.ratio, closeTo(1 / 3, 0.01));
  await tap(tester, 'launch-settings');
  expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.settings]);
  await tap(tester, 'category-appearance');
  await tap(tester, 'appearance-light');
  expect(preferences.value.appearance, ClientAppearance.light);
  await tap(tester, 'appearance-dark');
  expect(preferences.value.appearance, ClientAppearance.dark);
  await tap(tester, 'appearance-system');
  expect(preferences.value.appearance, ClientAppearance.system);
  await tap(tester, 'category-wallpaper');
  await tap(tester, 'wallpaper-forest');
  await tap(tester, 'settings-overview');
  await tap(tester, 'card-settings');
  expect(byKey('settings-page-wallpaper'), findsOneWidget);
  await tap(tester, 'settings-home');
  await tap(tester, 'dock-chat');
  expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.settings]);
  divider = tester.getCenter(byKey('workspace-divider'));
  final resize = await tester.startGesture(divider);
  await resize.moveTo(Offset(width - 16, divider.dy));
  await tester.pumpAndSettle();
  expect(workspace.layout.panes, [WorkspacePane.chat]);
  await resize.moveTo(divider);
  await tester.pumpAndSettle();
  await resize.up();
  await tester.pumpAndSettle();
  expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.settings]);
  await tap(tester, 'chat-overview');
  await tester.drag(byKey('card-chat'), const Offset(0, -100));
  await tester.pumpAndSettle();
  expect(workspace.opened, [WorkspacePane.settings]);
  await tap(tester, 'overview-home');
  await tap(tester, 'launch-settings');
  expect(byKey('settings-page-wallpaper'), findsOneWidget);
  await tap(tester, 'category-motion');
  await tap(tester, 'reduce-motion');
  await preferences.saved;
  expect(preferences.value.reduceMotion, isTrue);
  await tap(tester, 'settings-home');
  expect(workspace.screen, WorkspaceScreen.home);
  await tap(tester, 'launch-settings');
  await tap(tester, 'settings-overview');
  await tester.drag(byKey('card-settings'), const Offset(0, -100));
  await tester.pumpAndSettle();
  expect(workspace.opened, isEmpty);
  // Profile builds omit key debug names, so provide the physical key directly.
  await tester.sendKeyEvent(
    LogicalKeyboardKey.escape,
    physicalKey: PhysicalKeyboardKey.escape,
  );
  await tester.pumpAndSettle();
  expect(workspace.screen, WorkspaceScreen.home);
  expect(tester.takeException(), isNull);
  await tester.pumpWidget(const SizedBox());
  await tester.pumpAndSettle();
  workspace.dispose();
}
