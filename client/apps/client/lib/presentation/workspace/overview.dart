import 'dart:math' as math;

import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

import 'controller.dart';
import 'controls.dart';

class OverviewGeometry {
  OverviewGeometry(Size size, List<List<WorkspacePane>> groups, double ratio) {
    final widths = [
      for (final group in groups)
        math.min(
          group.length == 2 ? 600.0 : 320.0,
          math.max(
            120.0,
            (size.width - 48 - (groups.length - 1) * 24) /
                math.max(1, groups.length),
          ),
        ),
    ];
    final total =
        widths.fold(0.0, (a, b) => a + b) + math.max(0, groups.length - 1) * 24;
    var x = (size.width - total) / 2;
    final y = math.min(size.height - 240, math.max(112.0, size.height * 0.27));
    for (var i = 0; i < groups.length; i++) {
      final group = groups[i];
      final width = widths[i];
      groupRects.add(Rect.fromLTWH(x, y, width, 232));
      for (var j = 0; j < group.length; j++) {
        final fraction = group.length == 1 ? 1.0 : (j == 0 ? ratio : 1 - ratio);
        panes[group[j]] = Rect.fromLTWH(
          x + (j == 0 ? 0 : width * ratio),
          y + 40,
          width * fraction,
          192,
        );
      }
      x += width + 24;
    }
  }
  final panes = <WorkspacePane, Rect>{};
  final groupRects = <Rect>[];
}

class WorkspaceOverview extends StatelessWidget {
  const WorkspaceOverview({
    super.key,
    required this.controller,
    required this.geometry,
    required this.homeFocus,
    required this.cardFocus,
    required this.onCardDown,
    required this.onResume,
    required this.dragged,
    required this.dragDistance,
    required this.returning,
  });
  final WorkspaceController controller;
  final OverviewGeometry geometry;
  final FocusNode homeFocus;
  final Map<WorkspacePane, FocusNode> cardFocus;
  final void Function(PointerDownEvent, WorkspacePane) onCardDown;
  final ValueChanged<WorkspacePane> onResume;
  final WorkspacePane? dragged;
  final double dragDistance;
  final bool returning;
  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    final groups = controller.groups;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: controller.showHome,
      child: ColoredBox(
        color: theme.glassTint.withValues(alpha: 0.3),
        child: Stack(
          children: [
            Positioned(
              top: 24,
              left: 32,
              right: 24,
              child: Row(
                children: [
                  Expanded(child: Text('后台应用', style: theme.pageTitle)),
                  WorkspaceIconButton(
                    key: const ValueKey('overview-home'),
                    label: '返回桌面',
                    icon: AppleIcons.home,
                    focusNode: homeFocus,
                    onPressed: controller.showHome,
                  ),
                ],
              ),
            ),
            if (groups.isEmpty)
              Center(child: Text('没有后台应用', style: theme.body)),
            for (var i = 0; i < groups.length; i++)
              AnimatedPositioned.fromRect(
                key: ValueKey(groups[i].where((pane) => pane.isApp).last.name),
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : AppleMotion.layout,
                curve: AppleMotion.curve,
                rect: geometry.groupRects[i],
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      height: 40,
                      child: Row(
                        children: [
                          for (final pane in groups[i]) ...[
                            AppIcon(pane, size: 22),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                pane.label,
                                style: theme.label,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: AppleSpacing.small),
                          ],
                        ],
                      ),
                    ),
                    Expanded(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var j = 0; j < groups[i].length; j++)
                            Expanded(
                              flex: groups[i].length == 1
                                  ? 1000
                                  : ((j == 0
                                                ? controller.ratio
                                                : 1 - controller.ratio) *
                                            1000)
                                        .round(),
                              child: _card(context, groups[i][j]),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _card(BuildContext context, WorkspacePane pane) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final offset = pane == dragged && !reduced ? dragDistance : 0.0;
    return TweenAnimationBuilder<double>(
      key: ValueKey('card-motion-${pane.name}'),
      tween: Tween(end: offset),
      duration: returning && !reduced ? AppleMotion.layout : Duration.zero,
      curve: AppleMotion.curve,
      builder: (context, distance, child) => Transform.translate(
        offset: Offset(0, -distance),
        child: Opacity(
          opacity: (1 - distance / 350).clamp(0.25, 1.0),
          child: child,
        ),
      ),
      child: Listener(
        onPointerDown: (event) => onCardDown(event, pane),
        child: Focus(
          onKeyEvent: (node, event) => KeyEventResult.ignored,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(context.apple.surfaceRadius),
              boxShadow: context.apple.floatingShadow,
            ),
            child: CupertinoButton(
              key: ValueKey('card-${pane.name}'),
              focusNode: cardFocus[pane],
              focusColor: AppleFocusVisibility.of(context)
                  ? context.apple.accent.withValues(alpha: 0.65)
                  : context.apple.transparent,
              padding: EdgeInsets.zero,
              onPressed: () => onResume(pane),
              child: Semantics(
                label: '继续使用${pane.label}',
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(
                    context.apple.surfaceRadius,
                  ),
                  child: PanePreview(pane: pane, category: controller.category),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class PanePreview extends StatelessWidget {
  const PanePreview({super.key, required this.pane, required this.category});
  final WorkspacePane pane;
  final SettingsCategory category;
  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    return ExcludeSemantics(
      child: ColoredBox(
        color: theme.surface,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(AppleSpacing.medium),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: theme.border)),
              ),
              child: Text(pane.label, style: theme.caption),
            ),
            if (pane == WorkspacePane.settings)
              Expanded(
                child: ColoredBox(
                  color: theme.background,
                  child: Padding(
                    padding: const EdgeInsets.all(AppleSpacing.large),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(category.label, style: theme.label),
                        const SizedBox(height: AppleSpacing.medium),
                        Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: theme.surface,
                            borderRadius: BorderRadius.circular(
                              theme.controlRadius,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            if (pane == WorkspacePane.desktop)
              const Expanded(
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppIcon(WorkspacePane.chat, size: 36),
                      SizedBox(width: 12),
                      AppIcon(WorkspacePane.settings, size: 36),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
