import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Decorative host capabilities; business runtimes never depend on this bridge.
class HostEffects extends ChangeNotifier {
  HostEffects({required this.enabled});
  final bool enabled;
  final _channel = const MethodChannel('skynet/apple-effects');
  bool _disposed = false;
  bool ready = false;
  bool glass = false;
  bool reduceTransparency = false;
  bool highContrast = false;
  bool reduceMotion = false;
  Future<void> _updates = Future.value();
  String? _requestedStyle;

  void start() {
    if (!enabled) return;
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'settingsChanged') _receive(call.arguments);
    });
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      _receive(await _channel.invokeMethod<Object?>('settings'));
    } catch (error, stack) {
      debugPrint('HostEffects.load failed: $error\n$stack');
    }
  }

  void _receive(Object? value) {
    if (_disposed || value is! Map) return;
    ready = true;
    glass = value['glass'] == true;
    reduceTransparency = value['reduceTransparency'] == true;
    highContrast = value['highContrast'] == true;
    reduceMotion = value['reduceMotion'] == true;
    notifyListeners();
  }

  void appearance({
    required bool dark,
    required bool system,
    required int background,
  }) {
    if (!ready || !enabled || _disposed) return;
    final style = '$system:$dark:$background';
    if (_requestedStyle == style) return;
    _requestedStyle = style;
    // Keep older invocations from finishing after newer styles.
    _updates = _updates.then((_) async {
      if (_disposed) return;
      try {
        await _channel.invokeMethod<void>('appearance', {
          'dark': dark,
          'system': system,
          'background': background,
        });
      } catch (error, stack) {
        if (_requestedStyle == style) _requestedStyle = null;
        debugPrint('HostEffects.appearance failed: $error\n$stack');
      }
    });
  }

  @override
  void dispose() {
    _disposed = true;
    if (enabled) _channel.setMethodCallHandler(null);
    super.dispose();
  }
}
