import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:apple_ui/apple_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/presentation/client_app.dart';
import 'package:skynet_client/presentation/workspace/controller.dart';

import 'support/journey.dart';
import 'support/client_fixture.dart';
import 'support/lifecycle_journey.dart';

void main() {
  testWidgets('view reload and local failure preserve the host runtime', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1180, 820));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final client = TestClient();
    await lifecycleJourney(tester, runtime: client.runtime);
  });
  testWidgets(
    'split transition lays out content at its real width without stretching text',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1180, 820));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final client = TestClient();

      final workspace = client.workspace;
      await tester.pumpWidget(
        ClientApp(
          runtime: client.runtime,
          workspace: workspace,
          nativeMenus: false,
        ),
      );
      await tester.pumpAndSettle();
      await tap(tester, 'launch-settings');
      workspace.arrange(WorkspacePane.settings, true);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final rect = tester.getRect(byKey('app-settings'));
      final size = tester.getSize(byKey('app-settings'));
      expect(rect.width, greaterThan(586));
      expect(rect.width, lessThan(1180));
      expect(rect.width, closeTo(size.width, 0.01));
      expect(tester.takeException(), isNull);
      await tester.pumpAndSettle();
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'navigation animation can reverse and reduced motion converges immediately',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1180, 820));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final client = TestClient();
      final preferences = client.preferences;
      final workspace = client.workspace;
      await tester.pumpWidget(
        ClientApp(
          runtime: client.runtime,
          workspace: workspace,
          nativeMenus: false,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(byKey('launch-chat'));
      await tester.pump();
      final start = tester.getRect(byKey('app-chat'));
      await tester.pump(const Duration(milliseconds: 100));
      final middle = tester.getRect(byKey('app-chat'));
      expect(start.width, closeTo(64, 1));
      expect(middle.width, greaterThan(start.width));
      expect(middle.width, lessThan(1180));
      workspace.showHome();
      await tester.pump();
      expect(tester.getRect(byKey('app-chat')).width, closeTo(middle.width, 1));
      await tester.pumpAndSettle();
      await tap(tester, 'launch-chat');
      await tester.tap(byKey('chat-overview'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 80));
      preferences.update(preferences.value.copyWith(reduceMotion: true));
      await tester.pumpAndSettle();
      expect(workspace.screen, WorkspaceScreen.overview);
      await tap(tester, 'card-chat');
      expect(tester.getSize(byKey('app-chat')), const Size(1180, 820));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    },
  );

  testWidgets(
    'resize during a live drag restores confirmed layout before release',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1180, 820));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final client = TestClient();

      final workspace = client.workspace;
      await tester.pumpWidget(
        ClientApp(
          runtime: client.runtime,
          workspace: workspace,
          nativeMenus: false,
        ),
      );
      await tester.pumpAndSettle();
      await tap(tester, 'launch-chat');
      await tester.drag(byKey('grip-chat'), const Offset(-160, 0));
      await tester.pumpAndSettle();
      final divider = tester.getCenter(byKey('workspace-divider'));
      final gesture = await tester.startGesture(divider);
      await gesture.moveTo(Offset(1164, divider.dy));
      await tester.pumpAndSettle();
      expect(workspace.layout.split, isFalse);
      await tester.binding.setSurfaceSize(const Size(1000, 700));
      await tester.pump();
      await gesture.up();
      await tester.pumpAndSettle();
      expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.desktop]);
      expect(workspace.layout.split, isTrue);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    },
  );
  testWidgets('workspace full interaction journey', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1440, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final client = TestClient();
    final preferences = client.preferences;
    await workspaceJourney(
      tester,
      runtime: client.runtime,
      preferences: preferences,
    );
  });
  testWidgets('narrow settings, 200% type, resize restores pair and state', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1180, 820));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final client = TestClient();
    final workspace = client.workspace;

    await tester.pumpWidget(
      ClientApp(
        runtime: client.runtime,
        workspace: workspace,
        nativeMenus: false,
      ),
    );
    await tester.pumpAndSettle();
    await tap(tester, 'launch-chat');
    await tester.drag(byKey('grip-chat'), const Offset(-160, 0));
    await tester.pumpAndSettle();
    await tap(tester, 'launch-settings');
    await tap(tester, 'category-wallpaper');
    await tester.binding.setSurfaceSize(const Size(390, 700));
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tap(tester, 'settings-back');
    await tap(tester, 'category-motion');
    await tap(tester, 'settings-home');
    await tap(tester, 'dock-settings');
    expect(byKey('settings-page-motion'), findsOneWidget);
    await tester.binding.setSurfaceSize(const Size(1440, 1000));
    await tester.pumpAndSettle();
    expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.settings]);
    expect(byKey('app-chat').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
  testWidgets('cancel drag and continuous keyboard layout retain focus', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1180, 820));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final client = TestClient();
    final workspace = client.workspace;

    await tester.pumpWidget(
      ClientApp(
        runtime: client.runtime,
        workspace: workspace,
        nativeMenus: false,
      ),
    );
    await tester.pumpAndSettle();
    await tap(tester, 'launch-chat');
    final gesture = await tester.startGesture(
      tester.getCenter(byKey('grip-chat')),
    );
    await gesture.moveBy(const Offset(-160, 0));
    await tester.pumpAndSettle();
    expect(workspace.layout.split, isTrue);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(workspace.pair, isNull);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pumpAndSettle();
    expect(workspace.pair, [WorkspacePane.chat, WorkspacePane.desktop]);
    Color? gripColor() =>
        (tester
                    .widget<Container>(
                      find.descendant(
                        of: byKey('grip-chat'),
                        matching: find.byType(Container),
                      ),
                    )
                    .decoration
                as BoxDecoration)
            .color;
    final theme = tester.element(byKey('grip-chat')).apple;
    expect(gripColor(), theme.accent);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.pumpAndSettle();
    expect(workspace.pair, isNull);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pumpAndSettle();
    workspace.launch(WorkspacePane.settings);
    await tester.pumpAndSettle();
    expect(gripColor(), isNot(theme.accent));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
}
