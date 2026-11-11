import 'dart:ui' show Tristate;

import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(
  Widget child, {
  AppleDensity density = AppleDensity.desktop,
  double scale = 1,
}) {
  final theme = AppleThemeData(brightness: Brightness.light, density: density);
  return CupertinoApp(
    theme: theme.cupertino,
    home: AppleTheme(
      data: theme,
      child: Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: CupertinoPageScaffold(child: Center(child: child)),
        ),
      ),
    ),
  );
}

void main() {
  final macOS = TargetPlatformVariant.only(TargetPlatform.macOS);

  testWidgets(
    'select retains value, marks selection and skips disabled items',
    (tester) async {
      String? value;
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (context, update) => AppleSelect<String>(
              label: '排序方式',
              value: value,
              options: const [
                AppleSelectOption('disabled', '不可用', enabled: false),
                AppleSelectOption('name', '按名称'),
                AppleSelectOption('date', '按日期'),
              ],
              onChanged: (next) => update(() => value = next),
            ),
          ),
        ),
      );
      expect(find.bySemanticsLabel('排序方式'), findsOneWidget);
      await tester.tap(find.text('请选择'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<CupertinoMenuItem>(
              find.widgetWithText(CupertinoMenuItem, '不可用'),
            )
            .onPressed,
        isNull,
      );
      await tester.tap(find.widgetWithText(CupertinoMenuItem, '按日期'));
      await tester.pumpAndSettle();
      expect(value, 'date');
      expect(find.text('按日期'), findsOneWidget);
      expect(
        tester
            .widget<CupertinoButton>(find.byType(CupertinoButton))
            .focusNode!
            .hasFocus,
        isTrue,
      );
      await tester.tap(find.text('按日期'));
      await tester.pumpAndSettle();
      final selected = find.widgetWithText(CupertinoMenuItem, '按日期');
      expect(
        tester
            .getSemantics(selected)
            .getSemanticsData()
            .flagsCollection
            .isSelected,
        Tristate.isTrue,
      );
      expect(find.byIcon(AppleIcons.checkmark), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(value, 'date');
      await tester.pumpWidget(const SizedBox());
      semantics.dispose();
    },
    variant: macOS,
  );

  testWidgets('select cancels without changing value and supports keyboard', (
    tester,
  ) async {
    String? value;
    await tester.pumpWidget(
      host(
        AppleSelect<String>(
          label: '排序',
          options: const [
            AppleSelectOption('disabled', '不可用', enabled: false),
            AppleSelectOption('name', '按名称'),
            AppleSelectOption('date', '按日期'),
          ],
          onChanged: (next) => value = next,
        ),
      ),
    );
    await tester.tap(find.text('请选择'));
    await tester.pumpAndSettle();
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(value, isNull);
    final trigger = tester.widget<CupertinoButton>(
      find.byType(CupertinoButton),
    );
    expect(trigger.focusNode!.hasFocus, isTrue);
    await tester.sendKeyEvent(LogicalKeyboardKey.space);
    await tester.pumpAndSettle();
    await tester.tapAt(const Offset(5, 5));
    await tester.pumpAndSettle();
    expect(value, isNull);
    await tester.tap(find.text('请选择'));
    await tester.pumpAndSettle();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pumpAndSettle();
    expect(value, anyOf('name', 'date'));
    expect(trigger.focusNode!.hasFocus, isTrue);
  }, variant: macOS);

  testWidgets('select is disabled without a callback or available choices', (
    tester,
  ) async {
    for (final options in [
      <AppleSelectOption<String>>[],
      [const AppleSelectOption('a', '不可用', enabled: false)],
    ]) {
      await tester.pumpWidget(
        host(
          AppleSelect<String>(
            label: '排序',
            options: options,
            onChanged: (_) => fail('Disabled select must not notify.'),
          ),
        ),
      );
      expect(
        tester.widget<CupertinoButton>(find.byType(CupertinoButton)).onPressed,
        isNull,
      );
    }
    await tester.pumpWidget(
      host(
        const AppleSelect<String>(
          label: '排序',
          value: 'a',
          options: [AppleSelectOption('a', '按名称')],
          onChanged: null,
        ),
      ),
    );
    expect(find.text('按名称'), findsOneWidget);
    expect(
      tester.widget<CupertinoButton>(find.byType(CupertinoButton)).onPressed,
      isNull,
    );
  }, variant: macOS);

  testWidgets('select validates option identity and the controlled value', (
    tester,
  ) async {
    for (final (options, value) in [
      (const [AppleSelectOption('a', '甲'), AppleSelectOption('a', '乙')], null),
      (const [AppleSelectOption('a', '甲')], 'missing'),
    ]) {
      await tester.pumpWidget(
        host(
          AppleSelect<String>(
            label: '排序',
            value: value,
            options: options,
            onChanged: (_) {},
          ),
        ),
      );
      expect(tester.takeException(), isAssertionError);
      await tester.pumpWidget(const SizedBox());
    }
  }, variant: macOS);

  testWidgets('touch select scrolls long choices at 200 percent text', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(360, 500));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    String? value;
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 180,
          child: AppleSelect<String>(
            label: '长选项',
            options: [
              for (var i = 0; i < 30; i++)
                AppleSelectOption('$i', '选项 $i：用于测试长中文内容与滚动'),
            ],
            onChanged: (next) => value = next,
          ),
        ),
        density: AppleDensity.touch,
        scale: 2,
      ),
    );
    await tester.tap(find.text('请选择'));
    await tester.pumpAndSettle();
    final last = find.widgetWithText(CupertinoMenuItem, '选项 29：用于测试长中文内容与滚动');
    await tester.ensureVisible(last);
    await tester.pumpAndSettle();
    expect(last.hitTestable(), findsOneWidget);
    await tester.tap(last);
    await tester.pumpAndSettle();
    expect(value, '29');
    expect(tester.takeException(), isNull);
  }, variant: macOS);

  testWidgets('status messages expose meaning, text and recovery action', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    var recovered = 0;
    for (final (kind, name, icon) in [
      (AppleStatusKind.warning, '警告', AppleIcons.warning),
      (AppleStatusKind.error, '错误', AppleIcons.error),
      (AppleStatusKind.success, '成功', AppleIcons.success),
      (AppleStatusKind.information, '信息', AppleIcons.information),
    ]) {
      await tester.pumpWidget(
        host(
          AppleStatusMessage(
            kind: kind,
            message: '任务状态',
            description: '当前说明',
            actionLabel: '重试',
            onAction: () => recovered++,
          ),
        ),
      );
      expect(find.byIcon(icon), findsOneWidget);
      expect(find.text('任务状态'), findsOneWidget);
      expect(find.text('当前说明'), findsOneWidget);
      final node = tester.getSemantics(find.byType(AppleStatusMessage));
      expect(node.label, contains(name));
      expect(node.label, contains('任务状态'));
      expect(node.label, contains('当前说明'));
      expect(node.getSemanticsData().flagsCollection.isLiveRegion, isTrue);
      expect(tester.getSemantics(find.byType(CupertinoButton)).label, '重试');
      expect(
        tester
            .getSemantics(find.byType(CupertinoButton))
            .getSemanticsData()
            .flagsCollection
            .isButton,
        isTrue,
      );
      await tester.tap(find.text('重试'));
      await tester.pump();
    }
    expect(recovered, 4);
    await tester.pumpWidget(const SizedBox());
    semantics.dispose();
  }, variant: macOS);

  testWidgets(
    'status wraps long text and supports a disabled recovery action',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        host(
          const AppleStatusMessage(
            kind: AppleStatusKind.error,
            message: '当前任务无法完成，请检查网络连接并稍后再试',
            description: '这里是较长的中文说明，文字放大时应自然换行。',
            actionLabel: '重试',
            liveRegion: false,
          ),
          density: AppleDensity.touch,
          scale: 2,
        ),
      );
      expect(
        tester.widget<CupertinoButton>(find.byType(CupertinoButton)).onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
    variant: macOS,
  );
}
