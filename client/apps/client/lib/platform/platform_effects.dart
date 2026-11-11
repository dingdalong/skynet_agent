import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

/// Decorative platform view only; Flutter owns all input and semantics.
class MacOSGlassBackground extends StatefulWidget {
  const MacOSGlassBackground({
    super.key,
    required this.dark,
    required this.radius,
  });
  final bool dark;
  final double radius;
  @override
  State<MacOSGlassBackground> createState() => _MacOSGlassBackgroundState();
}

class _MacOSGlassBackgroundState extends State<MacOSGlassBackground> {
  MethodChannel? _channel;

  @override
  void didUpdateWidget(MacOSGlassBackground oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.dark != widget.dark) _update();
  }

  Future<void> _update() async {
    await _channel?.invokeMethod<void>('appearance', {'dark': widget.dark});
  }

  @override
  Widget build(BuildContext context) => AppKitView(
    viewType: 'skynet/apple-glass',
    creationParamsCodec: const StandardMessageCodec(),
    creationParams: {'dark': widget.dark, 'radius': widget.radius},
    onPlatformViewCreated: (id) {
      _channel = MethodChannel('skynet/apple-glass/$id');
      _update();
    },
  );
}
