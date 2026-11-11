import 'package:cupertino_ui/cupertino_ui.dart';

import 'controls.dart';
import 'icons.dart';
import 'theme.dart';

enum AppleStatusKind { warning, error, success, information }

/// Inline feedback with a consistent meaning, icon, text and optional recovery.
class AppleStatusMessage extends StatelessWidget {
  const AppleStatusMessage({
    super.key,
    required this.kind,
    required this.message,
    this.description,
    this.actionLabel,
    this.onAction,
    this.liveRegion = true,
  }) : assert(onAction == null || actionLabel != null);

  final AppleStatusKind kind;
  final String message;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool liveRegion;

  @override
  Widget build(BuildContext context) {
    final t = context.apple;
    final (name, icon, color) = switch (kind) {
      AppleStatusKind.warning => ('警告', AppleIcons.warning, t.warning),
      AppleStatusKind.error => ('错误', AppleIcons.error, t.danger),
      AppleStatusKind.success => ('成功', AppleIcons.success, t.success),
      AppleStatusKind.information => (
        '信息',
        AppleIcons.information,
        t.information,
      ),
    };
    return Semantics(
      container: true,
      liveRegion: liveRegion,
      label: name,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ExcludeSemantics(
            child: Icon(icon, size: t.iconSize, color: color),
          ),
          const SizedBox(width: AppleSpacing.small),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(message, style: t.label),
                if (description != null) ...[
                  const SizedBox(height: AppleSpacing.xsmall),
                  Text(description!, style: t.body),
                ],
                if (actionLabel != null) ...[
                  const SizedBox(height: AppleSpacing.small),
                  Semantics(
                    container: true,
                    child: AppleButton(
                      onPressed: onAction,
                      child: Text(actionLabel!),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
