import 'package:apple_ui/apple_ui.dart';
import 'package:component_gallery/gallery_app.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> selectPage(WidgetTester tester, String id) async {
  final nav = find.byKey(ValueKey('nav-$id'));
  await waitForUi(
    tester,
    () => nav.evaluate().isNotEmpty,
    'show catalog entry $id',
  );
  await tester.ensureVisible(nav);
  await tester.tap(nav);
  // The feedback page deliberately contains an indefinitely animated spinner.
  await tester.pump(const Duration(milliseconds: 400));
  expect(find.byKey(ValueKey('content-$id')), findsOneWidget);
}

Future<void> waitForUi(
  WidgetTester tester,
  bool Function() ready,
  String description,
) async {
  for (var frame = 0; frame < 160; frame++) {
    await tester.pump(const Duration(milliseconds: 50));
    if (ready()) return;
  }
  throw StateError('UI did not $description within 8 seconds.');
}

Future<void> chooseMenu(
  WidgetTester tester,
  String trigger,
  String choice,
) async {
  debugPrint('Gallery menu: $trigger → $choice');
  await tester.ensureVisible(find.text(trigger).first);
  await tester.tap(find.text(trigger).first);
  final option = find.widgetWithText(CupertinoMenuItem, choice);
  await waitForUi(
    tester,
    () => option.hitTestable().evaluate().isNotEmpty,
    'show $choice',
  );
  debugPrint('Gallery menu: selecting $choice');
  await tester.tap(option.last);
  await waitForUi(
    tester,
    () => find.byType(CupertinoMenuItem).evaluate().isEmpty,
    'close after choosing $choice',
  );
}

Finder input(String key) => find.descendant(
  of: find.byKey(ValueKey(key)),
  matching: find.byType(CupertinoTextField),
);

Future<void> galleryJourney(
  WidgetTester tester, {
  required bool nativeMenus,
}) async {
  await tester.pumpWidget(GalleryApp(nativeMenus: nativeMenus));
  await tester.pumpAndSettle();
  debugPrint('Gallery journey: catalog and search');
  expect(find.text('语义颜色'), findsOneWidget);

  final search = find.descendant(
    of: find.byKey(const ValueKey('catalog-search')),
    matching: find.byType(EditableText),
  );
  await tester.enterText(search, '没有这类组件');
  await tester.pump();
  expect(find.textContaining('没有匹配的组件'), findsOneWidget);
  await tester.enterText(search, 'buttons');
  await tester.pump();
  await selectPage(tester, 'buttons');
  await tester.tap(find.text('主要操作'));
  await tester.pumpAndSettle();
  expect(find.text('操作结果：已点按主要操作'), findsOneWidget);
  await tester.enterText(search, '');
  await tester.pump();

  await selectPage(tester, 'inputs');
  debugPrint('Gallery journey: form validation and correction');
  await tester.ensureVisible(find.byKey(const ValueKey('validate-form')));
  await tester.tap(find.byKey(const ValueKey('validate-form')));
  await tester.pumpAndSettle();
  expect(find.text('请输入名称。'), findsOneWidget);
  await tester.ensureVisible(input('name-field'));
  await tester.enterText(input('name-field'), '中文组件示例');
  await tester.ensureVisible(input('email-field'));
  await tester.enterText(input('email-field'), 'demo@example.com');
  await tester.ensureVisible(find.byKey(const ValueKey('validate-form')));
  await tester.tap(find.byKey(const ValueKey('validate-form')));
  await tester.pumpAndSettle();
  expect(find.text('操作结果：表单验证通过'), findsOneWidget);

  await chooseMenu(tester, '跟随系统', '深色外观');
  debugPrint('Gallery journey: appearance, density, text scaling and reset');
  await chooseMenu(tester, '桌面密度', '触控密度');
  expect(
    tester.widget<CupertinoTextField>(input('name-field')).controller!.text,
    '中文组件示例',
  );
  await chooseMenu(tester, '文字 100%', '文字 200%');
  expect(tester.takeException(), isNull);
  expect(
    tester.widget<CupertinoTextField>(input('name-field')).controller!.text,
    '中文组件示例',
  );
  await chooseMenu(tester, '文字 200%', '文字 100%');
  await tester.ensureVisible(find.byKey(const ValueKey('reset-demo')));
  await tester.tap(find.byKey(const ValueKey('reset-demo')));
  await tester.pumpAndSettle();
  expect(
    tester.widget<CupertinoTextField>(input('name-field')).controller!.text,
    isEmpty,
  );

  await selectPage(tester, 'selection');
  debugPrint('Gallery journey: selection controls');
  await chooseMenu(tester, '选择排序方式', '按修改时间');
  expect(find.text('操作结果：排序方式已更新：modified'), findsOneWidget);
  await tester.ensureVisible(find.byKey(const ValueKey('demo-select')));
  await tester.tap(find.byKey(const ValueKey('demo-select')));
  await tester.pumpAndSettle();
  expect(find.byIcon(AppleIcons.checkmark), findsOneWidget);
  expect(
    tester
        .widget<CupertinoMenuItem>(
          find.widgetWithText(CupertinoMenuItem, '暂不可用'),
        )
        .onPressed,
    isNull,
  );
  await tester.sendKeyEvent(LogicalKeyboardKey.escape);
  await tester.pumpAndSettle();
  expect(find.text('按修改时间'), findsOneWidget);
  final selectButton = find.descendant(
    of: find.byKey(const ValueKey('demo-select')),
    matching: find.byType(CupertinoButton),
  );
  expect(
    tester.widget<CupertinoButton>(selectButton).focusNode!.hasFocus,
    isTrue,
  );
  await tester.ensureVisible(find.byKey(const ValueKey('demo-switch')));
  await tester.tap(find.byKey(const ValueKey('demo-switch')));
  await tester.pumpAndSettle();
  expect(find.text('操作结果：提醒已关闭'), findsOneWidget);

  await selectPage(tester, 'menus');
  debugPrint('Gallery journey: disabled and enabled menus');
  await tester.tap(find.byKey(const ValueKey('enable-controls')));
  await tester.pumpAndSettle();
  await tester.tap(find.text('更多操作'));
  await tester.pumpAndSettle();
  expect(find.text('复制链接'), findsNothing);
  await tester.tap(find.byKey(const ValueKey('enable-controls')));
  await tester.pumpAndSettle();
  await chooseMenu(tester, '更多操作', '复制链接');
  expect(find.text('操作结果：已选择：复制链接'), findsOneWidget);

  await selectPage(tester, 'dialogs');
  debugPrint('Gallery journey: dialog cancellation and confirmation');
  await tester.ensureVisible(find.byKey(const ValueKey('open-confirm')));
  await tester.tap(find.byKey(const ValueKey('open-confirm')));
  await tester.pumpAndSettle();
  await tester.sendKeyEvent(LogicalKeyboardKey.escape);
  await tester.pumpAndSettle();
  expect(find.text('操作结果：已取消更改'), findsOneWidget);
  await tester.tap(find.byKey(const ValueKey('open-confirm')));
  await tester.pumpAndSettle();
  await tester.tap(find.text('应用更改'));
  await tester.pumpAndSettle();
  expect(find.text('操作结果：已应用更改'), findsOneWidget);
  await selectPage(tester, 'feedback');
  debugPrint('Gallery journey: consistent feedback, typography and themes');
  final title = find.descendant(
    of: find.byKey(const ValueKey('content-feedback')),
    matching: find.text('反馈与状态'),
  );
  expect(
    tester.widget<Text>(title).style,
    tester.element(title).apple.pageTitle,
  );
  for (final (current, next) in [('深色外观', '浅色外观'), ('浅色外观', '深色外观')]) {
    await chooseMenu(tester, current, next);
    for (final (kind, icon) in [
      (AppleStatusKind.warning, AppleIcons.warning),
      (AppleStatusKind.error, AppleIcons.error),
      (AppleStatusKind.success, AppleIcons.success),
      (AppleStatusKind.information, AppleIcons.information),
    ]) {
      final message = find.byKey(ValueKey('status-${kind.name}'));
      await tester.ensureVisible(message);
      await tester.pump();
      final glyph = tester.widget<Icon>(
        find.descendant(of: message, matching: find.byType(Icon)).first,
      );
      final theme = tester.element(message).apple;
      expect(glyph.icon, icon);
      expect(glyph.color, switch (kind) {
        AppleStatusKind.warning => theme.warning,
        AppleStatusKind.error => theme.danger,
        AppleStatusKind.success => theme.success,
        AppleStatusKind.information => theme.information,
      });
    }
  }
  await tester.ensureVisible(find.text('重试'));
  final semantics = tester.ensureSemantics();
  await tester.pump();
  expect(tester.getSemantics(find.text('重试')).label, '重试');
  await tester.tap(find.text('重试'));
  await tester.pump();
  expect(find.text('操作结果：重试成功'), findsOneWidget);
  semantics.dispose();
  await chooseMenu(tester, '辅助功能', '开启增强对比度');
  await chooseMenu(tester, '桌面密度', '触控密度');
  await chooseMenu(tester, '文字 100%', '文字 200%');
  await tester.ensureVisible(find.byKey(const ValueKey('status-warning')));
  await tester.pump();
  expect(tester.takeException(), isNull);
  await tester.pumpWidget(const SizedBox());
  await tester.pumpAndSettle();
}
