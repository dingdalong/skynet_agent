import 'package:cupertino_ui/cupertino_ui.dart';

import 'theme.dart';
import 'interaction.dart';

enum AppleButtonVariant { primary, secondary, plain, destructive }

class AppleButton extends StatefulWidget {
  const AppleButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.variant = AppleButtonVariant.secondary,
    this.focusNode,
    this.semanticLabel,
    this.autofocus = false,
    this.padding,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final AppleButtonVariant variant;
  final FocusNode? focusNode;
  final String? semanticLabel;
  final bool autofocus;
  final EdgeInsetsGeometry? padding;

  @override
  State<AppleButton> createState() => _AppleButtonState();
}

class _AppleButtonState extends State<AppleButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final t = context.apple;
    final filled =
        widget.variant == AppleButtonVariant.primary ||
        widget.variant == AppleButtonVariant.destructive;
    final background = switch (widget.variant) {
      AppleButtonVariant.primary => t.accentFill,
      AppleButtonVariant.destructive => t.dangerFill,
      AppleButtonVariant.secondary => _hovered ? t.hover : t.surface,
      AppleButtonVariant.plain => _hovered ? t.hover : t.transparent,
    };
    final foreground = filled ? t.onAccent : t.text;
    return Semantics(
      label: widget.semanticLabel,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(t.controlRadius),
            border: Border.all(
              color: widget.variant == AppleButtonVariant.secondary
                  ? t.border
                  : t.transparent,
            ),
          ),
          child: CupertinoButton(
            color: background,
            foregroundColor: foreground,
            disabledColor: t.hover,
            minimumSize: Size(t.controlHeight, t.controlHeight),
            padding:
                widget.padding ??
                EdgeInsets.symmetric(
                  horizontal: t.isTouch ? 16 : 12,
                  vertical: 5,
                ),
            borderRadius: BorderRadius.circular(t.controlRadius - 1),
            focusNode: widget.focusNode,
            focusColor: AppleFocusVisibility.of(context)
                ? t.accent.withValues(alpha: 0.65)
                : t.transparent,
            autofocus: widget.autofocus,
            onPressed: widget.onPressed,
            child: DefaultTextStyle.merge(
              style: (filled ? t.emphasizedButton : t.button).copyWith(
                color: widget.onPressed == null ? t.secondaryText : foreground,
              ),
              child: IconTheme(
                data: IconThemeData(size: t.iconSize, color: foreground),
                child: widget.child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppleTextField extends StatefulWidget {
  const AppleTextField({
    super.key,
    required this.label,
    this.controller,
    this.focusNode,
    this.placeholder,
    this.error,
    this.obscureText = false,
    this.enabled = true,
    this.maxLines = 1,
    this.onChanged,
  });

  final String label;
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? placeholder;
  final String? error;
  final bool obscureText;
  final bool enabled;
  final int maxLines;
  final ValueChanged<String>? onChanged;

  @override
  State<AppleTextField> createState() => _AppleTextFieldState();
}

class _AppleTextFieldState extends State<AppleTextField> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final t = context.apple;
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: (value) => setState(() => _focused = value),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            label: widget.label,
            child: CupertinoTextField(
              controller: widget.controller,
              focusNode: widget.focusNode,
              placeholder: widget.placeholder,
              obscureText: widget.obscureText,
              enabled: widget.enabled,
              maxLines: widget.maxLines,
              onChanged: widget.onChanged,
              style: t.body,
              placeholderStyle: t.body.copyWith(color: t.secondaryText),
              padding: EdgeInsets.symmetric(
                horizontal: 10,
                vertical: t.isTouch ? 12 : 7,
              ),
              decoration: BoxDecoration(
                color: widget.enabled ? t.surface : t.background,
                border: Border.all(
                  color: widget.error != null
                      ? t.danger
                      : _focused
                      ? t.accent
                      : t.controlBorder,
                  width: _focused ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(t.controlRadius),
              ),
            ),
          ),
          if (widget.error != null)
            Padding(
              padding: const EdgeInsets.only(top: 5),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  widget.error!,
                  style: t.caption.copyWith(color: t.danger),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
