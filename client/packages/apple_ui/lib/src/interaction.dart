import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

/// Keeps keyboard focus available without painting rings after pointer input.
class AppleFocusVisibility extends StatefulWidget {
  const AppleFocusVisibility({super.key, required this.child});
  final Widget child;

  static bool of(BuildContext context) =>
      (context
              .dependOnInheritedWidgetOfExactType<_FocusVisibility>()
              ?.visible ??
          true) ||
      MediaQuery.accessibleNavigationOf(context);

  @override
  State<AppleFocusVisibility> createState() => _AppleFocusVisibilityState();
}

class _AppleFocusVisibilityState extends State<AppleFocusVisibility> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    HardwareKeyboard.instance.addHandler(_key);
  }

  bool _key(KeyEvent event) {
    if (event is KeyDownEvent && !_visible) setState(() => _visible = true);
    return false;
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_key);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Listener(
    onPointerDown: (_) {
      if (_visible) setState(() => _visible = false);
    },
    child: _FocusVisibility(visible: _visible, child: widget.child),
  );
}

class _FocusVisibility extends InheritedWidget {
  const _FocusVisibility({required this.visible, required super.child});
  final bool visible;
  @override
  bool updateShouldNotify(_FocusVisibility oldWidget) =>
      visible != oldWidget.visible;
}
