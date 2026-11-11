import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(Widget child) => CupertinoApp(
  home: AppleTheme(
    data: const AppleThemeData(brightness: Brightness.light),
    child: CupertinoPageScaffold(child: Center(child: child)),
  ),
);

void main() {
  final macOS = TargetPlatformVariant.only(TargetPlatform.macOS);

  testWidgets('editable semantics include the persistent field label', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      host(const AppleTextField(label: '名称', placeholder: '输入名称')),
    );
    expect(
      tester.getSemantics(find.byType(EditableText)).label,
      contains('名称'),
    );
    await tester.pumpWidget(const SizedBox());
    semantics.dispose();
  }, variant: macOS);

  testWidgets(
    'confirmations support Escape and avoid destructive Enter defaults',
    (tester) async {
      bool? result;
      var destructive = false;
      await tester.pumpWidget(
        host(
          Builder(
            builder: (context) => AppleButton(
              onPressed: () async {
                result = await showAppleConfirmation(
                  context: context,
                  title: '确认示例',
                  message: '示例说明',
                  destructive: destructive,
                );
              },
              child: const Text('确认入口'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('确认入口'));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(result, isFalse);
      destructive = true;
      result = null;
      await tester.tap(find.text('确认入口'));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(result, isNot(isTrue));
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(result, isFalse);
    },
    variant: macOS,
  );

  testWidgets(
    'buttons support keyboard activation, accessible names and disabled state',
    (tester) async {
      var presses = 0;
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        host(
          AppleButton(
            autofocus: true,
            semanticLabel: '添加项目',
            onPressed: () => presses++,
            child: const Icon(CupertinoIcons.add),
          ),
        ),
      );
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(presses, 1);
      expect(find.bySemanticsLabel('添加项目'), findsOneWidget);
      await tester.pumpWidget(
        host(const AppleButton(onPressed: null, child: Text('不可用'))),
      );
      await tester.tap(find.text('不可用'));
      await tester.pump();
      expect(presses, 1);
      await tester.pumpWidget(const SizedBox());
      semantics.dispose();
    },
    variant: macOS,
  );

  testWidgets(
    'menu restores trigger focus on Escape and skips disabled choices',
    (tester) async {
      var selected = '';
      await tester.pumpWidget(
        host(
          AppleMenuButton(
            label: '打开菜单',
            actions: [
              const AppleMenuAction('不可用选项'),
              AppleMenuAction('按名称', onPressed: () => selected = 'name'),
              AppleMenuAction('按时间', onPressed: () => selected = 'time'),
            ],
          ),
        ),
      );
      await tester.tap(find.text('打开菜单'));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(FocusManager.instance.primaryFocus?.context?.widget, isNotNull);
      final button = tester.widget<CupertinoButton>(
        find.byType(CupertinoButton),
      );
      expect(button.focusNode!.hasFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(selected, isNotEmpty);
    },
    variant: macOS,
  );

  testWidgets('right click opens actions and outside click dismisses', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        AppleMenuButton(
          label: '右键区域',
          contextMenu: true,
          actions: [AppleMenuAction('复制项目', onPressed: () {})],
        ),
      ),
    );
    await tester.tap(find.text('右键区域'), buttons: kSecondaryMouseButton);
    await tester.pumpAndSettle();
    expect(find.text('复制项目'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    final trigger = tester.widget<CupertinoButton>(
      find.byType(CupertinoButton),
    );
    expect(trigger.focusNode!.hasFocus, isTrue);
    await tester.sendKeyEvent(LogicalKeyboardKey.space);
    await tester.pumpAndSettle();
    expect(find.text('复制项目'), findsOneWidget);
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    final menu = tester.state(find.byType(AppleMenuButton));
    expect(menu.mounted, isTrue);
  }, variant: macOS);

  testWidgets('disabled menu and popover triggers do not open overlays', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppleMenuButton(
              label: '禁用菜单',
              enabled: false,
              contextMenu: true,
              actions: [AppleMenuAction('菜单内容', onPressed: () {})],
            ),
            ApplePopoverButton(
              label: '禁用浮层',
              enabled: false,
              builder: (_) => const Text('浮层内容'),
            ),
          ],
        ),
      ),
    );
    await tester.tap(find.text('禁用菜单'));
    await tester.tap(find.text('禁用菜单'), buttons: kSecondaryMouseButton);
    await tester.tap(find.text('禁用浮层'));
    await tester.pumpAndSettle();
    expect(find.text('菜单内容'), findsNothing);
    expect(find.text('浮层内容'), findsNothing);
  }, variant: macOS);

  testWidgets('split view uses consistent bounds for dragging and keyboard', (
    tester,
  ) async {
    tester.view.reset();
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 760,
          height: 300,
          child: AppleSplitView(
            leading: Container(key: const ValueKey('leading')),
            trailing: const Text('详情'),
          ),
        ),
      ),
    );
    final leading = find.byKey(const ValueKey('leading'));
    expect(tester.getSize(leading).width, 240);
    await tester.drag(
      find.byKey(const ValueKey('split-divider')),
      const Offset(-500, 0),
    );
    await tester.pump();
    expect(tester.getSize(leading).width, 190);
    Focus.of(tester.element(find.byKey(const ValueKey('split-divider'))))
        .requestFocus();
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pump();
    expect(tester.getSize(leading).width, 206);
    await tester.sendKeyEvent(LogicalKeyboardKey.home);
    await tester.pump();
    expect(tester.getSize(leading).width, 240);
  }, variant: macOS);

  testWidgets('popover closes with Escape and returns focus', (tester) async {
    await tester.pumpWidget(
      host(
        ApplePopoverButton(
          label: '说明',
          builder: (context) => AppleButton(
            autofocus: true,
            onPressed: () => Navigator.pop(context),
            child: const Text('关闭说明'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('说明'));
    await tester.pumpAndSettle();
    expect(find.text('关闭说明'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    final trigger = tester.widget<CupertinoButton>(
      find.byType(CupertinoButton),
    );
    expect(trigger.focusNode!.hasFocus, isTrue);
  }, variant: macOS);

  test(
    'semantic text, primary actions and field boundaries retain contrast',
    () {
      double contrast(Color a, Color b) {
        final x = a.computeLuminance(), y = b.computeLuminance();
        return ((x > y ? x : y) + .05) / ((x > y ? y : x) + .05);
      }

      for (final brightness in Brightness.values) {
        for (final highContrast in [false, true]) {
          final t = AppleThemeData(
            brightness: brightness,
            highContrast: highContrast,
          );
          for (final background in [t.background, t.surface, t.sidebar]) {
            expect(contrast(t.text, background), greaterThanOrEqualTo(4.5));
            expect(
              contrast(t.secondaryText, background),
              greaterThanOrEqualTo(4.5),
            );
          }
          expect(contrast(t.onAccent, t.accentFill), greaterThanOrEqualTo(4.5));
          expect(contrast(t.controlBorder, t.surface), greaterThanOrEqualTo(3));
          expect(contrast(t.accent, t.surface), greaterThanOrEqualTo(3));
          for (final color in [t.warning, t.danger, t.success, t.information]) {
            for (final background in [t.surface, t.background, t.sidebar]) {
              expect(contrast(color, background), greaterThanOrEqualTo(3));
            }
          }
        }
      }
    },
  );
}
