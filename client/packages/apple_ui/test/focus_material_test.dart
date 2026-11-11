import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'pointer keeps focus without a ring; keyboard restores visible focus and activation',
    (tester) async {
      final node = FocusNode();
      addTearDown(node.dispose);
      var presses = 0;
      const theme = AppleThemeData(brightness: Brightness.light);
      await tester.pumpWidget(
        CupertinoApp(
          home: AppleTheme(
            data: theme,
            child: AppleFocusVisibility(
              child: Center(
                child: AppleButton(
                  focusNode: node,
                  onPressed: () => presses++,
                  child: const Text('操作'),
                ),
              ),
            ),
          ),
        ),
      );
      node.requestFocus();
      await tester.pump();
      CupertinoButton button() =>
          tester.widget<CupertinoButton>(find.byType(CupertinoButton));
      expect(node.hasFocus, isTrue);
      expect(button().focusColor, theme.transparent);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(presses, 1);
      expect(button().focusColor, isNot(theme.transparent));
      await tester.tap(find.text('操作'));
      await tester.pumpAndSettle();
      expect(presses, 2);
      expect(node.hasFocus, isTrue);
      expect(button().focusColor, theme.transparent);
      await tester.pumpWidget(const SizedBox());
    },
    variant: TargetPlatformVariant.only(TargetPlatform.macOS),
  );

  testWidgets(
    'material respects opaque accessibility preferences before using a native backend',
    (tester) async {
      var nativeBuilds = 0;
      Future<void> show(AppleThemeData theme) async {
        await tester.pumpWidget(
          CupertinoApp(
            home: AppleTheme(
              data: theme,
              child: AppleMaterialBackend(
                builder: (_, _, _) {
                  nativeBuilds++;
                  return const SizedBox(key: ValueKey('native-background'));
                },
                child: const Center(
                  child: AppleMaterialSurface(
                    child: SizedBox(width: 180, height: 80),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
      }

      await show(const AppleThemeData(brightness: Brightness.light));
      expect(nativeBuilds, greaterThan(0));
      final count = nativeBuilds;
      await show(
        const AppleThemeData(
          brightness: Brightness.light,
          reduceTransparency: true,
        ),
      );
      expect(nativeBuilds, count);
      expect(
        tester.widget<ColoredBox>(find.byType(ColoredBox).last).color,
        const AppleThemeData(brightness: Brightness.light).surface,
      );
      await show(
        const AppleThemeData(brightness: Brightness.dark, highContrast: true),
      );
      expect(nativeBuilds, count);
      expect(
        tester.widget<ColoredBox>(find.byType(ColoredBox).last).color,
        const AppleThemeData(brightness: Brightness.dark).surface,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
