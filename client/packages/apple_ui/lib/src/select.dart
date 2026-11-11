import 'dart:math' as math;

import 'package:cupertino_ui/cupertino_ui.dart';

import 'controls.dart';
import 'icons.dart';
import 'theme.dart';

@immutable
class AppleSelectOption<T extends Object> {
  const AppleSelectOption(this.value, this.label, {this.enabled = true});

  final T value;
  final String label;
  final bool enabled;
}

/// A controlled, single-choice popup. Use an action menu for commands instead.
class AppleSelect<T extends Object> extends StatefulWidget {
  const AppleSelect({
    super.key,
    required this.label,
    required this.options,
    required this.onChanged,
    this.value,
    this.placeholder = '请选择',
  });

  final String label;
  final List<AppleSelectOption<T>> options;
  final ValueChanged<T>? onChanged;
  final T? value;
  final String placeholder;

  @override
  State<AppleSelect<T>> createState() => _AppleSelectState<T>();
}

class _AppleSelectState<T extends Object> extends State<AppleSelect<T>> {
  final _controller = MenuController();
  final _focus = FocusNode();

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    assert(
      widget.options.map((option) => option.value).toSet().length ==
          widget.options.length,
      'AppleSelect option values must be unique.',
    );
    final selected = widget.options
        .where((option) => option.value == widget.value)
        .firstOrNull;
    assert(
      widget.value == null || selected != null,
      'AppleSelect value must match an option.',
    );
    final enabled =
        widget.onChanged != null &&
        widget.options.any((option) => option.enabled);
    final t = context.apple;
    final viewport = MediaQuery.sizeOf(context);
    final menuWidth = math.min(360.0, math.max(0.0, viewport.width - 32));
    final display = selected?.label ?? widget.placeholder;
    return CupertinoMenuAnchor(
      controller: _controller,
      childFocusNode: _focus,
      enableSwipe: false,
      consumeOutsideTaps: true,
      constraints: BoxConstraints(
        minWidth: math.min(200, menuWidth),
        maxWidth: menuWidth,
        maxHeight: viewport.height * .5,
      ),
      menuChildren: [
        for (final option in widget.options)
          MergeSemantics(
            child: Semantics(
              selected: option.value == widget.value,
              child: CupertinoMenuItem(
                onPressed: enabled && option.enabled
                    ? () => widget.onChanged!(option.value)
                    : null,
                trailing: option.value == widget.value
                    ? ExcludeSemantics(
                        child: Icon(AppleIcons.checkmark, size: t.iconSize),
                      )
                    : SizedBox(width: t.iconSize),
                padding: EdgeInsets.symmetric(
                  horizontal: AppleSpacing.medium,
                  vertical: t.isTouch
                      ? AppleSpacing.medium
                      : AppleSpacing.small,
                ),
                child: Text(
                  option.label,
                  style: t.body.copyWith(
                    color: enabled && option.enabled ? t.text : t.secondaryText,
                  ),
                ),
              ),
            ),
          ),
      ],
      builder: (context, controller, child) => LayoutBuilder(
        builder: (context, constraints) => SizedBox(
          width: math.min(240, constraints.maxWidth),
          child: Semantics(
            value: display,
            child: AppleButton(
              focusNode: _focus,
              semanticLabel: widget.label,
              onPressed: enabled
                  ? () => controller.isOpen
                        ? controller.close()
                        : controller.open()
                  : null,
              child: ExcludeSemantics(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        display,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: AppleSpacing.small),
                    Icon(AppleIcons.expand, size: t.iconSize),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
