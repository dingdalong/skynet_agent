import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/presentation/workspace/controller.dart';

import 'support/client_fixture.dart';

void main() {
  test(
    'Escape from empty overview returns home after closing its original app',
    () {
      final workspace = TestClient().workspace..resize(const Size(1180, 820));
      workspace.launch(WorkspacePane.chat);
      workspace.showOverview();
      workspace.close(WorkspacePane.chat);
      workspace.dismissOverview();
      expect(workspace.screen, WorkspaceScreen.home);
    },
  );
  late WorkspaceController w;
  setUp(() {
    w = TestClient().workspace..resize(const Size(1440, 900));
  });
  test('single instance, pair inherits ratio, swapping mirrors ratio', () {
    w.launch(WorkspacePane.chat);
    w.arrange(WorkspacePane.chat, true);
    w.adjustRatio(0.6);
    w.launch(WorkspacePane.settings);
    expect(w.pair, [WorkspacePane.chat, WorkspacePane.settings]);
    expect(w.ratio, 0.6);
    w.showHome();
    w.launch(WorkspacePane.chat);
    expect(w.opened, [WorkspacePane.chat, WorkspacePane.settings]);
    expect(w.ratio, 0.6);
    w.arrange(WorkspacePane.chat, false);
    expect(w.pair, [WorkspacePane.settings, WorkspacePane.chat]);
    expect(w.ratio, 0.4);
    w.showOverview();
    w.launch(WorkspacePane.settings);
    expect(w.pair, [WorkspacePane.settings, WorkspacePane.chat]);
  });
  test('reversible split and fullscreen, cancel and resize preserve confirmed state', () {
    w.launch(WorkspacePane.chat);
    w.beginDrag();
    w.previewApp(WorkspacePane.chat, -100, 0, const Offset(100, 30));
    expect(w.layout.panes, [WorkspacePane.chat, WorkspacePane.desktop]);
    expect(w.pair, isNull);
    w.previewApp(WorkspacePane.chat, 0, 0, const Offset(200, 30));
    w.finishDrag();
    expect(w.pair, isNull);
    w.arrange(WorkspacePane.chat, false);
    w.adjustRatio(0.6);
    w.beginDrag();
    w.previewDivider(16);
    expect(w.layout.panes, [WorkspacePane.chat]);
    w.cancelDrag();
    expect(w.pair, [WorkspacePane.desktop, WorkspacePane.chat]);
    expect(w.ratio, 0.6);
    w.beginDrag();
    w.previewDivider(16);
    w.resize(const Size(1000, 700));
    w.finishDrag();
    expect(w.pair, [WorkspacePane.desktop, WorkspacePane.chat]);
    expect(w.ratio, 0.6);
    w.resize(const Size(600, 700));
    expect(w.layout.panes, [WorkspacePane.chat]);
    w.resize(const Size(1440, 900));
    expect(w.layout.panes, [WorkspacePane.desktop, WorkspacePane.chat]);
  });
  test('three snaps, hysteresis and only valid points in narrow split', () {
    w.launch(WorkspacePane.chat);
    w.arrange(WorkspacePane.chat, true);
    for (final point in [1 / 3, 0.5, 2 / 3]) {
      w.beginDrag();
      w.previewDivider(4 + (1440 - 8) * point + 10);
      expect(w.layout.ratio, closeTo(point, 0.00001));
      w.previewDivider(4 + (1440 - 8) * point + (point == 2 / 3 ? -28 : 28));
      expect(w.layout.ratio, closeTo(point, 0.00001));
      w.cancelDrag();
    }
    w.resize(const Size(800, 700));
    w.beginDrag();
    w.previewDivider(4 + (800 - 8) / 3);
    expect(w.layout.ratio * 792, greaterThanOrEqualTo(360));
    w.cancelDrag();
  });
  test('close pair member reveals desktop; settings navigation resets only on close', () {
    w.launch(WorkspacePane.chat);
    w.arrange(WorkspacePane.chat, true);
    w.launch(WorkspacePane.settings);
    w.selectCategory(SettingsCategory.wallpaper);
    w.showHome();
    w.launch(WorkspacePane.settings);
    expect(w.category, SettingsCategory.wallpaper);
    w.close(WorkspacePane.chat);
    expect(w.pair, [WorkspacePane.desktop, WorkspacePane.settings]);
    w.close(WorkspacePane.settings);
    expect(w.opened, isEmpty);
    expect(w.category, SettingsCategory.appearance);
    w.showOverview();
    expect(w.groups, isEmpty);
    w.showHome();
    expect(w.screen, WorkspaceScreen.home);
  });
}
