enum WorkspacePane {
  desktop,
  chat,
  settings;

  bool get isApp => this != desktop;
}

enum WorkspaceScreen { home, app, overview }

enum WorkspaceTransition {
  launch,
  home,
  overview,
  resume,
  layout,
  direct,
  close,
}

enum SettingsCategory { appearance, wallpaper, motion }

class WorkspaceLayout {
  WorkspaceLayout(Iterable<WorkspacePane> panes, {this.ratio = 0.5})
    : panes = List.unmodifiable(panes);
  final List<WorkspacePane> panes;
  final double ratio;
  bool get split => panes.length == 2;
}

class WorkspaceState {
  WorkspaceState({
    this.screen = WorkspaceScreen.home,
    this.overviewOrigin = WorkspaceScreen.home,
    this.active = WorkspacePane.chat,
    Iterable<WorkspacePane> opened = const [],
    Iterable<WorkspacePane>? pair,
    this.ratio = 0.5,
    this.transition = WorkspaceTransition.direct,
  }) : opened = List.unmodifiable(opened),
       pair = pair == null ? null : List.unmodifiable(pair);
  final WorkspaceScreen screen;
  final WorkspaceScreen overviewOrigin;
  final WorkspacePane active;
  final List<WorkspacePane> opened;
  final List<WorkspacePane>? pair;
  final double ratio;
  final WorkspaceTransition transition;

  WorkspaceState copyWith({
    WorkspaceScreen? screen,
    WorkspaceScreen? overviewOrigin,
    WorkspacePane? active,
    Iterable<WorkspacePane>? opened,
    Iterable<WorkspacePane>? pair,
    bool clearPair = false,
    double? ratio,
    WorkspaceTransition? transition,
  }) => WorkspaceState(
    screen: screen ?? this.screen,
    overviewOrigin: overviewOrigin ?? this.overviewOrigin,
    active: active ?? this.active,
    opened: opened ?? this.opened,
    pair: clearPair ? null : pair ?? this.pair,
    ratio: ratio ?? this.ratio,
    transition: transition ?? this.transition,
  );
}

class SettingsNavigation {
  const SettingsNavigation({
    this.category = SettingsCategory.appearance,
    this.detail = false,
    this.revision = 0,
  });
  final SettingsCategory category;
  final bool detail;
  final int revision;
}
