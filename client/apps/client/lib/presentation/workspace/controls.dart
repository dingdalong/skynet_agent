import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

import 'controller.dart';

IconData paneIcon(WorkspacePane pane) => switch (pane) {
  WorkspacePane.desktop => AppleIcons.home,
  WorkspacePane.chat => AppleIcons.chat,
  WorkspacePane.settings => AppleIcons.settings,
};
IconData categoryIcon(SettingsCategory category) => switch (category) {
  SettingsCategory.appearance => AppleIcons.appearance,
  SettingsCategory.wallpaper => AppleIcons.wallpaper,
  SettingsCategory.motion => AppleIcons.motion,
};

class WorkspaceIconButton extends StatelessWidget {
  const WorkspaceIconButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.focusNode,
  });
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final FocusNode? focusNode;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 44,
    height: 44,
    child: AppleButton(
      variant: AppleButtonVariant.plain,
      semanticLabel: label,
      focusNode: focusNode,
      onPressed: onPressed,
      padding: EdgeInsets.zero,
      child: Icon(icon, size: 19),
    ),
  );
}

class AppIcon extends StatelessWidget {
  const AppIcon(this.pane, {super.key, this.size = 64});
  final WorkspacePane pane;
  final double size;
  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    return Container(
      width: size,
      height: size,
      decoration: ShapeDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: pane == WorkspacePane.chat
              ? theme.chatIconGradient
              : theme.settingsIconGradient,
        ),
        shape: RoundedSuperellipseBorder(
          borderRadius: BorderRadius.circular(size * 0.25),
          side: BorderSide(
            color: theme.highlight.withValues(alpha: 0.45),
            width: 0.7,
          ),
        ),
        shadows: theme.appIconShadow,
      ),
      child: Icon(
        paneIcon(pane),
        color: pane == WorkspacePane.chat
            ? theme.onAccent
            : theme.settingsIconForeground,
        size: size * 0.55,
      ),
    );
  }
}

class WorkspaceWallpaper extends StatelessWidget {
  const WorkspaceWallpaper({
    super.key,
    required this.name,
    required this.child,
  });
  final String name;
  final Widget child;
  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: _WallpaperPainter(context.apple, name),
    child: child,
  );
}

class _WallpaperPainter extends CustomPainter {
  const _WallpaperPainter(this.theme, this.name);
  final AppleThemeData theme;
  final String name;
  @override
  void paint(Canvas canvas, Size size) {
    final bounds = Offset.zero & size;
    final colors = theme.wallpaperColors(name);
    canvas.drawRect(
      bounds,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ).createShader(bounds),
    );
    final sweep = Path()
      ..moveTo(-size.width * 0.1, size.height * 1.15)
      ..cubicTo(
        size.width * 0.18,
        size.height * 0.5,
        size.width * 0.65,
        size.height * 0.27,
        size.width * 1.1,
        size.height * 0.12,
      )
      ..lineTo(size.width * 1.1, size.height * 1.1)
      ..close();
    canvas.drawPath(
      sweep,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.highlight.withValues(alpha: theme.isDark ? 0.07 : 0.22),
            colors.last.withValues(alpha: 0.06),
          ],
        ).createShader(bounds),
    );
    canvas.drawPath(
      sweep,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8
        ..color = theme.highlight.withValues(alpha: 0.14),
    );
    final lower = Path()
      ..moveTo(-size.width * 0.1, size.height * 1.05)
      ..cubicTo(
        size.width * 0.3,
        size.height * 0.83,
        size.width * 0.82,
        size.height * 0.68,
        size.width * 1.1,
        size.height * 0.72,
      )
      ..lineTo(size.width * 1.1, size.height * 1.1)
      ..close();
    canvas.drawPath(
      lower,
      Paint()
        ..color = colors.last.withValues(alpha: theme.isDark ? 0.15 : 0.09),
    );
  }

  @override
  bool shouldRepaint(_WallpaperPainter oldDelegate) =>
      oldDelegate.name != name ||
      oldDelegate.theme.brightness != theme.brightness;
}

class WorkspaceLaunchButton extends StatefulWidget {
  const WorkspaceLaunchButton({
    super.key,
    required this.child,
    required this.label,
    required this.onPressed,
    this.focusNode,
  });
  final Widget child;
  final String label;
  final VoidCallback? onPressed;
  final FocusNode? focusNode;
  @override
  State<WorkspaceLaunchButton> createState() => _WorkspaceLaunchButtonState();
}

class _WorkspaceLaunchButtonState extends State<WorkspaceLaunchButton> {
  bool _hovered = false;
  bool _pressed = false;
  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    final reduced = MediaQuery.disableAnimationsOf(context);
    return MouseRegion(
      cursor: widget.onPressed == null
          ? SystemMouseCursors.basic
          : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() {
        _hovered = false;
        _pressed = false;
      }),
      child: Listener(
        onPointerDown: (_) => setState(() => _pressed = true),
        onPointerUp: (_) => setState(() => _pressed = false),
        onPointerCancel: (_) => setState(() => _pressed = false),
        child: AnimatedSlide(
          offset: !reduced && _hovered && widget.onPressed != null
              ? const Offset(0, -0.025)
              : Offset.zero,
          duration: reduced ? Duration.zero : AppleMotion.feedback,
          curve: AppleMotion.curve,
          child: AnimatedScale(
            scale: !reduced && _pressed && widget.onPressed != null ? 0.96 : 1,
            duration: reduced ? Duration.zero : AppleMotion.feedback,
            child: CupertinoButton(
              focusNode: widget.focusNode,
              focusColor: AppleFocusVisibility.of(context)
                  ? theme.accent.withValues(alpha: 0.65)
                  : theme.transparent,
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              borderRadius: BorderRadius.circular(18),
              onPressed: widget.onPressed,
              child: Semantics(
                label: widget.label,
                excludeSemantics: true,
                child: widget.child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
