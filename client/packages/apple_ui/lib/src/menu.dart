import 'dart:math' as math;

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

import 'controls.dart';
import 'icons.dart';
import 'layout.dart';
import 'theme.dart';

@immutable
class AppleMenuAction {
  const AppleMenuAction(
    this.label, {
    this.icon,
    this.onPressed,
    this.destructive = false,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool destructive;
}

class AppleMenuButton extends StatefulWidget {
  const AppleMenuButton({
    super.key,
    required this.label,
    required this.actions,
    this.contextMenu = false,
    this.enabled = true,
  });

  final String label;
  final List<AppleMenuAction> actions;
  final bool contextMenu;
  final bool enabled;

  @override
  State<AppleMenuButton> createState() => _AppleMenuButtonState();
}

class _AppleMenuButtonState extends State<AppleMenuButton> {
  final _controller = MenuController();
  final _focus = FocusNode();

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.apple;
    return CupertinoMenuAnchor(
      controller: _controller,
      childFocusNode: _focus,
      enableSwipe: false,
      consumeOutsideTaps: true,
      constraints: const BoxConstraints(minWidth: 200, maxWidth: 300),
      menuChildren: [
        for (final action in widget.actions)
          CupertinoMenuItem(
            onPressed: action.onPressed,
            isDestructiveAction: action.destructive,
            leading: action.icon == null
                ? null
                : Icon(action.icon, size: t.iconSize),
            padding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: t.isTouch ? 12 : 8,
            ),
            child: Text(
              action.label,
              style: t.body.copyWith(
                color: action.onPressed == null
                    ? t.secondaryText
                    : action.destructive
                    ? t.danger
                    : t.text,
              ),
            ),
          ),
      ],
      builder: (context, controller, child) => GestureDetector(
        onSecondaryTapDown: widget.enabled && widget.contextMenu
            ? (details) {
                _focus.requestFocus();
                controller.open(position: details.localPosition);
              }
            : null,
        child: AppleButton(
          focusNode: _focus,
          onPressed: widget.enabled
              ? () => controller.isOpen ? controller.close() : controller.open()
              : null,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(widget.label),
              const SizedBox(width: 8),
              Icon(
                widget.contextMenu ? AppleIcons.more : AppleIcons.expand,
                size: 12,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ApplePopoverButton extends StatefulWidget {
  const ApplePopoverButton({
    super.key,
    required this.label,
    required this.builder,
    this.enabled = true,
  });

  final String label;
  final WidgetBuilder builder;
  final bool enabled;

  @override
  State<ApplePopoverButton> createState() => _ApplePopoverButtonState();
}

class _ApplePopoverButtonState extends State<ApplePopoverButton> {
  final _anchor = GlobalKey();
  final _focus = FocusNode();

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  Future<void> _open() async {
    final box = _anchor.currentContext!.findRenderObject()! as RenderBox;
    final origin = box.localToGlobal(Offset.zero);
    final size = MediaQuery.sizeOf(context);
    final width = math.min(320.0, size.width - 32);
    final left = origin.dx.clamp(16.0, size.width - width - 16).toDouble();
    final top = math.min(origin.dy + box.size.height + 8, size.height / 2);
    final theme = context.apple;
    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '关闭浮层',
      barrierColor: theme.transparent,
      transitionDuration: Duration.zero,
      pageBuilder: (routeContext, animation, secondaryAnimation) => AppleTheme(
        data: theme,
        child: CallbackShortcuts(
          bindings: {
            const SingleActivator(LogicalKeyboardKey.escape): () =>
                Navigator.pop(routeContext),
          },
          child: Stack(
            children: [
              Positioned(
                left: left,
                top: top,
                width: width,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: size.height - top - 16,
                  ),
                  child: SingleChildScrollView(
                    child: AppleSurface(
                      child: FocusScope(
                        autofocus: true,
                        child: widget.builder(routeContext),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (mounted) _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) => AppleButton(
    key: _anchor,
    focusNode: _focus,
    onPressed: widget.enabled ? _open : null,
    child: Text(widget.label),
  );
}
