import '../domain/workspace.dart';
import 'actor.dart';

sealed class WorkspaceMessage {}

class LaunchApp extends WorkspaceMessage {
  LaunchApp(this.pane);
  final WorkspacePane pane;
}

class CloseApp extends WorkspaceMessage {
  CloseApp(this.pane);
  final WorkspacePane pane;
}

class ShowHome extends WorkspaceMessage {}

class ShowOverview extends WorkspaceMessage {}

class DismissOverview extends WorkspaceMessage {}

class SetLayout extends WorkspaceMessage {
  SetLayout(this.layout, this.active);
  final WorkspaceLayout layout;
  final WorkspacePane active;
}

class FocusApp extends WorkspaceMessage {
  FocusApp(this.pane);
  final WorkspacePane pane;
}

class WorkspaceRuntime extends StateActor<WorkspaceState, WorkspaceMessage> {
  WorkspaceRuntime({
    required super.log,
    required super.onFault,
    required this.onClose,
  }) : super('workspace', WorkspaceState());
  final void Function(WorkspacePane) onClose;

  @override
  WorkspaceState reduce(WorkspaceState s, WorkspaceMessage message) {
    switch (message) {
      case LaunchApp(:final pane):
        if (!pane.isApp) return reduce(s, ShowHome());
        var pair = s.pair;
        if (s.screen == WorkspaceScreen.app &&
            pair != null &&
            pair.contains(WorkspacePane.desktop) &&
            !pair.contains(pane)) {
          pair = [
            for (final item in pair)
              item == WorkspacePane.desktop ? pane : item,
          ];
        } else if (pair != null && !pair.contains(pane)) {
          pair = null;
        }
        return s.copyWith(
          screen: WorkspaceScreen.app,
          active: pane,
          opened: s.opened.contains(pane) ? s.opened : [...s.opened, pane],
          pair: pair,
          clearPair: pair == null,
          transition: s.screen == WorkspaceScreen.overview
              ? WorkspaceTransition.resume
              : WorkspaceTransition.launch,
        );
      case ShowHome():
        return s.copyWith(
          screen: WorkspaceScreen.home,
          transition: WorkspaceTransition.home,
        );
      case ShowOverview():
        return s.copyWith(
          screen: WorkspaceScreen.overview,
          overviewOrigin: s.screen == WorkspaceScreen.overview
              ? s.overviewOrigin
              : s.screen,
          transition: WorkspaceTransition.overview,
        );
      case DismissOverview():
        return s.copyWith(
          screen: s.opened.isEmpty ? WorkspaceScreen.home : s.overviewOrigin,
          transition: WorkspaceTransition.resume,
        );
      case CloseApp(:final pane):
        if (!pane.isApp || !s.opened.contains(pane)) return s;
        final opened = s.opened.where((item) => item != pane).toList();
        var pair = s.pair;
        if (pair != null && pair.contains(pane)) {
          final remaining = pair.firstWhere((item) => item != pane);
          pair = remaining.isApp
              ? [
                  for (final item in pair)
                    item == pane ? WorkspacePane.desktop : item,
                ]
              : null;
        }
        return s.copyWith(
          opened: opened,
          pair: pair,
          clearPair: pair == null,
          active: s.active == pane && opened.isNotEmpty
              ? opened.last
              : s.active,
          screen: opened.isEmpty && s.screen == WorkspaceScreen.app
              ? WorkspaceScreen.home
              : s.screen,
          transition: WorkspaceTransition.close,
        );
      case SetLayout(:final layout, :final active):
        return s.copyWith(
          pair: layout.split ? layout.panes : null,
          clearPair: !layout.split,
          ratio: layout.ratio,
          active: active.isApp ? active : s.active,
          screen: !layout.split && layout.panes.single == WorkspacePane.desktop
              ? WorkspaceScreen.home
              : WorkspaceScreen.app,
          transition: WorkspaceTransition.layout,
        );
      case FocusApp(:final pane):
        return pane == s.active || !s.opened.contains(pane)
            ? s
            : s.copyWith(active: pane, transition: WorkspaceTransition.direct);
    }
  }

  @override
  void committed(WorkspaceMessage message, WorkspaceState previous) {
    if (message case CloseApp(:final pane)
        when previous.opened.contains(pane)) {
      onClose(pane);
    }
  }
}

sealed class SettingsMessage {}

class SelectCategory extends SettingsMessage {
  SelectCategory(this.category);
  final SettingsCategory category;
}

class SettingsBack extends SettingsMessage {}

class ResetSettings extends SettingsMessage {}

class SettingsRuntime extends StateActor<SettingsNavigation, SettingsMessage> {
  SettingsRuntime({required super.log, required super.onFault})
    : super('settings', const SettingsNavigation());

  @override
  SettingsNavigation reduce(SettingsNavigation s, SettingsMessage message) =>
      switch (message) {
        SelectCategory(:final category) => SettingsNavigation(
          category: category,
          detail: true,
          revision: s.revision,
        ),
        SettingsBack() => SettingsNavigation(
          category: s.category,
          revision: s.revision,
        ),
        ResetSettings() => SettingsNavigation(revision: s.revision + 1),
      };
}
