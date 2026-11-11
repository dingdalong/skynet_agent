import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/support/journey.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('macOS gallery full interaction journey', (tester) async {
    // Framework text injection is deterministic; the actual IME is checked separately.
    tester.testTextInput.register();
    addTearDown(tester.testTextInput.unregister);
    await galleryJourney(tester, nativeMenus: true);
    binding.reportData = {
      'scenario': 'catalog-form-select-theme-menus-dialogs-status-typography',
      'completed': true,
    };
  });
}
