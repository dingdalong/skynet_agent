import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

import 'controls.dart';
import 'layout.dart';
import 'theme.dart';

/// Uses touch-oriented Cupertino actions or a compact desktop confirmation.
/// Destructive confirmations deliberately have no Enter binding.
Future<bool?> showAppleConfirmation({
  required BuildContext context,
  required String title,
  required String message,
  String confirmLabel = '继续',
  bool destructive = false,
}) {
  final t = context.apple;
  Widget bind(BuildContext routeContext, Widget child) => CallbackShortcuts(
    bindings: {
      const SingleActivator(LogicalKeyboardKey.escape): () =>
          Navigator.pop(routeContext, false),
      if (!destructive)
        const SingleActivator(LogicalKeyboardKey.enter): () =>
            Navigator.pop(routeContext, true),
    },
    child: FocusScope(autofocus: true, child: child),
  );
  if (t.isTouch) {
    return showCupertinoDialog<bool>(
      context: context,
      builder: (routeContext) => bind(
        routeContext,
        CupertinoAlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            CupertinoDialogAction(
              onPressed: () => Navigator.pop(routeContext, false),
              child: const Text('取消'),
            ),
            CupertinoDialogAction(
              isDefaultAction: !destructive,
              isDestructiveAction: destructive,
              onPressed: () => Navigator.pop(routeContext, true),
              child: Text(confirmLabel),
            ),
          ],
        ),
      ),
    );
  }
  return showGeneralDialog<bool>(
    context: context,
    barrierDismissible: false,
    barrierColor: t.scrim,
    transitionDuration: Duration.zero,
    pageBuilder: (routeContext, animation, secondaryAnimation) => AppleTheme(
      data: t,
      child: bind(
        routeContext,
        Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: SingleChildScrollView(
                child: Semantics(
                  scopesRoute: true,
                  explicitChildNodes: true,
                  namesRoute: true,
                  label: title,
                  child: AppleSurface(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: t.sectionTitle),
                        const SizedBox(height: 12),
                        Text(message, style: t.body),
                        const SizedBox(height: 24),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Wrap(
                            spacing: 12,
                            runSpacing: 8,
                            children: [
                              AppleButton(
                                autofocus: destructive,
                                onPressed: () =>
                                    Navigator.pop(routeContext, false),
                                child: const Text('取消'),
                              ),
                              AppleButton(
                                autofocus: !destructive,
                                variant: destructive
                                    ? AppleButtonVariant.destructive
                                    : AppleButtonVariant.primary,
                                onPressed: () =>
                                    Navigator.pop(routeContext, true),
                                child: Text(confirmLabel),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
