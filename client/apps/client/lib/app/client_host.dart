import 'dart:ui' show AppExitResponse;

import 'package:flutter/widgets.dart';

import '../presentation/client_app.dart';
import '../runtime/client_runtime.dart';

class ClientHost extends StatefulWidget {
  const ClientHost({super.key, required this.runtime});
  final ClientRuntime runtime;
  @override
  State<ClientHost> createState() => _ClientHostState();
}

class _ClientHostState extends State<ClientHost> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(
      onExitRequested: () async {
        await widget.runtime.shutdown();
        return AppExitResponse.exit;
      },
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ClientApp(runtime: widget.runtime);
}
