import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

import 'controls.dart';
import 'theme.dart';

class AppleSurface extends StatelessWidget {
  const AppleSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: context.apple.surface,
      borderRadius: BorderRadius.circular(context.apple.surfaceRadius),
      border: Border.all(color: context.apple.border),
    ),
    child: child,
  );
}

class AppleFormRow extends StatelessWidget {
  const AppleFormRow({
    super.key,
    required this.label,
    required this.child,
    this.description,
  });

  final String label;
  final String? description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = context.apple;
    final text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: t.body),
        if (description != null) ...[
          const SizedBox(height: 4),
          Text(description!, style: t.supporting),
        ],
      ],
    );
    return Padding(
      padding: EdgeInsets.all(t.rowPadding),
      child: LayoutBuilder(
        builder: (context, constraints) => constraints.maxWidth < 360
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [text, const SizedBox(height: 8), child],
              )
            : Row(
                children: [
                  Expanded(child: text),
                  const SizedBox(width: 24),
                  child,
                ],
              ),
      ),
    );
  }
}

class AppleSidebarItem extends StatelessWidget {
  const AppleSidebarItem({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final t = context.apple;
    return Semantics(
      selected: selected,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          color: selected ? t.selected : null,
          borderRadius: BorderRadius.circular(t.controlRadius),
        ),
        child: AppleButton(
          variant: AppleButtonVariant.plain,
          onPressed: onPressed,
          child: Row(
            children: [
              Icon(
                icon,
                size: t.iconSize,
                color: selected ? t.accent : t.secondaryText,
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      ),
    );
  }
}

/// A desktop split with the same constraints for mouse, keyboard and AX actions.
class AppleSplitView extends StatefulWidget {
  const AppleSplitView({
    super.key,
    required this.leading,
    required this.trailing,
    this.initialWidth = 240,
    this.minimumLeading = 190,
    this.minimumTrailing = 360,
  });

  final Widget leading;
  final Widget trailing;
  final double initialWidth;
  final double minimumLeading;
  final double minimumTrailing;

  @override
  State<AppleSplitView> createState() => _AppleSplitViewState();
}

class _AppleSplitViewState extends State<AppleSplitView> {
  late double _width = widget.initialWidth;
  bool _focused = false;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      if (constraints.maxWidth <
          widget.minimumLeading + widget.minimumTrailing + 9) {
        return widget.trailing;
      }
      final maxWidth = constraints.maxWidth - widget.minimumTrailing - 9;
      final width = _width.clamp(widget.minimumLeading, maxWidth).toDouble();
      void change(double next) => setState(() {
        _width = next.clamp(widget.minimumLeading, maxWidth).toDouble();
      });
      return Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(width: width, child: widget.leading),
          Semantics(
            label: '调整侧栏宽度',
            slider: true,
            value: '${width.round()}',
            increasedValue:
                '${(width + 16).clamp(widget.minimumLeading, maxWidth).round()}',
            decreasedValue:
                '${(width - 16).clamp(widget.minimumLeading, maxWidth).round()}',
            onIncrease: () => change(width + 16),
            onDecrease: () => change(width - 16),
            child: Focus(
              onFocusChange: (value) => setState(() => _focused = value),
              onKeyEvent: (node, event) {
                if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
                  return KeyEventResult.ignored;
                }
                if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
                  change(width - 16);
                } else if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
                  change(width + 16);
                } else if (event.logicalKey == LogicalKeyboardKey.home) {
                  change(widget.initialWidth);
                } else {
                  return KeyEventResult.ignored;
                }
                return KeyEventResult.handled;
              },
              child: MouseRegion(
                cursor: SystemMouseCursors.resizeColumn,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onHorizontalDragUpdate: (details) =>
                      change(width + details.delta.dx),
                  child: SizedBox(
                    key: const ValueKey('split-divider'),
                    width: 9,
                    child: Center(
                      child: Container(
                        width: _focused ? 3 : 1,
                        color: _focused
                            ? context.apple.accent
                            : context.apple.border,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(child: widget.trailing),
        ],
      );
    },
  );
}
