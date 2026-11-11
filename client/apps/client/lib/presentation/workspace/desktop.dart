import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

import 'controller.dart';
import 'controls.dart';

class WorkspaceDesktop extends StatelessWidget {
  const WorkspaceDesktop({
    super.key,
    required this.controller,
    required this.launch,
    required this.homeFocus,
  });
  final WorkspaceController controller;
  final void Function(WorkspacePane, BuildContext) launch;
  final FocusNode homeFocus;
  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppleSpacing.xlarge),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text('Skynet', style: theme.label)),
                WorkspaceIconButton(
                  key: const ValueKey('desktop-overview'),
                  label: '后台应用',
                  icon: AppleIcons.overview,
                  onPressed: controller.showOverview,
                ),
              ],
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Wrap(
                  spacing: AppleSpacing.xlarge,
                  runSpacing: AppleSpacing.xlarge,
                  children: [
                    for (final pane in [
                      WorkspacePane.chat,
                      WorkspacePane.settings,
                    ])
                      Builder(
                        builder: (context) {
                          final origin = GlobalKey();
                          final alreadyVisible =
                              controller.screen == WorkspaceScreen.app &&
                              controller.layout.panes.contains(pane);
                          return SizedBox(
                            width: 104,
                            child: WorkspaceLaunchButton(
                              key: ValueKey('launch-${pane.name}'),
                              label: '打开${pane.label}',
                              focusNode: pane == WorkspacePane.chat
                                  ? homeFocus
                                  : null,
                              onPressed: alreadyVisible
                                  ? null
                                  : () => launch(pane, origin.currentContext!),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  AppIcon(pane, key: origin),
                                  const SizedBox(height: AppleSpacing.medium),
                                  Text(
                                    alreadyVisible
                                        ? '${pane.label} · 已打开'
                                        : pane.label,
                                    style: theme.supporting.copyWith(
                                      color: theme.text,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
            if (controller.screen == WorkspaceScreen.home)
              Center(
                child: AppleMaterialSurface(
                  key: const ValueKey('workspace-dock'),
                  role: AppleMaterialRole.floating,
                  radius: 26,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (final pane in [
                          WorkspacePane.chat,
                          WorkspacePane.settings,
                        ])
                          Padding(
                            padding: EdgeInsets.only(
                              left: pane == WorkspacePane.settings ? 12 : 0,
                            ),
                            child: Builder(
                              builder: (context) {
                                final origin = GlobalKey();
                                return SizedBox(
                                  width: 56,
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      WorkspaceLaunchButton(
                                        key: ValueKey('dock-${pane.name}'),
                                        label: '打开${pane.label}',
                                        onPressed: () => launch(
                                          pane,
                                          origin.currentContext!,
                                        ),
                                        child: AppIcon(
                                          pane,
                                          key: origin,
                                          size: 52,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        width: 3,
                                        height: 3,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color:
                                              controller.opened.contains(pane)
                                              ? theme.text
                                              : theme.transparent,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
