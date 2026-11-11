import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/domain/workspace.dart';
import 'package:skynet_client/presentation/subapp_boundary.dart';

import 'support/client_fixture.dart';

void main() {
  testWidgets(
    'descendant build failure recovers locally and keeps a sibling usable',
    (tester) async {
      final client = TestClient();
      final previous = ErrorWidget.builder;
      ErrorWidget.builder = (details) => SubappBuildFailure(details: details);
      var broken = true;
      try {
        await tester.pumpWidget(
          CupertinoApp(
            home: AppleTheme(
              data: const AppleThemeData(brightness: Brightness.light),
              child: Row(
                children: [
                  Expanded(
                    child: SubappBoundary(
                      runtime: client.runtime,
                      pane: WorkspacePane.settings,
                      builder: (_) => Builder(
                        builder: (_) {
                          if (broken) throw StateError('settings build failed');
                          return const Text('Recovered settings');
                        },
                      ),
                    ),
                  ),
                  Expanded(
                    child: SubappBoundary(
                      runtime: client.runtime,
                      pane: WorkspacePane.chat,
                      builder: (_) => const Text('Healthy Chat'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
        expect(tester.takeException(), isA<StateError>());
        await tester.pumpAndSettle();
        expect(find.text('Healthy Chat'), findsOneWidget);
        expect(find.text('此应用暂时无法显示'), findsOneWidget);
        expect(client.runtime.app(WorkspacePane.chat).state.failed, isFalse);
        broken = false;
        await tester.tap(find.text('重新加载界面'));
        await tester.pumpAndSettle();
        expect(find.text('Recovered settings'), findsOneWidget);
        expect(
          client.runtime.app(WorkspacePane.settings).state.failed,
          isFalse,
        );
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox());
        ErrorWidget.builder = previous;
      }
    },
  );
}
