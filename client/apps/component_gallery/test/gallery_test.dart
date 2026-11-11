import 'package:component_gallery/catalog.dart';
import 'package:component_gallery/gallery_app.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/journey.dart';

void main() {
  testWidgets(
    'touch previews remain usable at narrow width and 200 percent text',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(const GalleryApp(nativeMenus: false));
      await tester.pumpAndSettle();
      await chooseMenu(tester, '桌面密度', '触控密度');
      await chooseMenu(tester, '文字 100%', '文字 200%');
      await tester.binding.setSurfaceSize(const Size(440, 1000));
      await tester.pumpAndSettle();
      for (final page in galleryPages) {
        await tester.tap(find.byKey(const ValueKey('toggle-directory')));
        await tester.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('catalog-list')),
          findsOneWidget,
          reason: 'directory for ${page.id}',
        );
        final nav = find.byKey(ValueKey('nav-${page.id}'));
        await tester.scrollUntilVisible(
          nav,
          100,
          scrollable: find.descendant(
            of: find.byKey(const ValueKey('catalog-list')),
            matching: find.byType(Scrollable),
          ),
        );
        await tester.pumpAndSettle();
        expect(nav.hitTestable(), findsOneWidget);
        await tester.tap(nav);
        await tester.pump(const Duration(milliseconds: 400));
        expect(
          tester.takeException(),
          isNull,
          reason: 'narrow touch ${page.id}',
        );
      }
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    },
  );

  testWidgets('catalog, form correction, themes, state and dialogs', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await galleryJourney(tester, nativeMenus: false);
  });

  testWidgets(
    'every component page renders and narrow windows retain navigation',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(const GalleryApp(nativeMenus: false));
      await tester.pumpAndSettle();
      for (final page in galleryPages) {
        await tester.tap(find.byKey(ValueKey('nav-${page.id}')));
        await tester.pump(const Duration(milliseconds: 400));
        expect(tester.takeException(), isNull, reason: page.id);
      }
      await tester.tap(find.byKey(const ValueKey('nav-foundations')));
      await tester.pumpAndSettle();
      await chooseMenu(tester, '文字 100%', '文字 200%');
      await tester.binding.setSurfaceSize(const Size(440, 900));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.bySemanticsLabel('组件目录'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('catalog-search')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    },
  );
}
