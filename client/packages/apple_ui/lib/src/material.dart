import 'dart:ui' as ui;

import 'package:cupertino_ui/cupertino_ui.dart';

import 'theme.dart';

enum AppleMaterialRole { floating, navigation }

typedef AppleMaterialBuilder = Widget? Function(
  BuildContext context,
  AppleMaterialRole role,
  double radius,
);

/// Hosts may supply a native background; content and input remain in Flutter.
class AppleMaterialBackend extends InheritedWidget {
  const AppleMaterialBackend({
    super.key,
    required this.builder,
    required super.child,
  });
  final AppleMaterialBuilder builder;
  @override
  bool updateShouldNotify(AppleMaterialBackend oldWidget) =>
      builder != oldWidget.builder;
}

class AppleMaterialSurface extends StatelessWidget {
  const AppleMaterialSurface({
    super.key,
    required this.child,
    this.role = AppleMaterialRole.navigation,
    this.radius = 0,
  });
  final Widget child;
  final AppleMaterialRole role;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    final opaque = theme.highContrast || theme.reduceTransparency;
    final native = opaque
        ? null
        : context
              .dependOnInheritedWidgetOfExactType<AppleMaterialBackend>()
              ?.builder(context, role, radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: role == AppleMaterialRole.floating
            ? theme.floatingShadow
            : null,
      ),
      child: ClipRSuperellipse(
        borderRadius: BorderRadius.circular(radius),
        child: Stack(
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: ExcludeSemantics(
                  child:
                      native ??
                      BackdropFilter(
                        filter: ui.ImageFilter.blur(
                          sigmaX: opaque ? 0 : 24,
                          sigmaY: opaque ? 0 : 24,
                        ),
                        child: ColoredBox(
                          color: opaque
                              ? theme.surface
                              : theme.glassTint.withValues(
                                  alpha: theme.isDark ? 0.72 : 0.65,
                                ),
                        ),
                      ),
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(radius),
                border: role == AppleMaterialRole.floating
                    ? Border.all(color: opaque ? theme.border : theme.glassEdge)
                    : null,
              ),
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}
