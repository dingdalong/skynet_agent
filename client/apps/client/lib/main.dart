import 'package:cupertino_ui/cupertino_ui.dart';

import 'app/client_host.dart';
import 'data/preferences_store.dart';
import 'runtime/client_runtime.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final runtime = ClientRuntime(
    store: LocalPreferencesStore(),
    log: debugPrint,
  );
  await runtime.initialize();
  runApp(ClientHost(runtime: runtime));
}
