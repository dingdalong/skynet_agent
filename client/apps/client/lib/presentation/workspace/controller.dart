import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../../domain/workspace.dart';
import '../../runtime/actor.dart';
import '../../runtime/workspace.dart';

export '../../domain/workspace.dart';

extension WorkspacePaneLabel on WorkspacePane {
  String get label => switch (this) {
    WorkspacePane.desktop => '桌面',
    WorkspacePane.chat => 'Chat',
    WorkspacePane.settings => '设置',
  };
}

extension SettingsCategoryLabel on SettingsCategory {
  String get label => switch (this) {
    SettingsCategory.appearance => '外观',
    SettingsCategory.wallpaper => '壁纸',
    SettingsCategory.motion => '动态效果',
  };
}

/// Adapts runtime snapshots to Flutter; owns only live layout and drag preview.
class WorkspaceController extends ChangeNotifier {
  WorkspaceController(this.runtime, this.settings) {
    _workspace = runtime.attach((snapshot) {
      _preview = null;
      _dragSize = null;
      _changed(snapshot.state.transition);
    });
    _settings = settings.attach((_) => notifyListeners());
  }
  final WorkspaceRuntime runtime;
  final SettingsRuntime settings;
  late final ActorSubscription<WorkspaceState, WorkspaceMessage> _workspace;
  late final ActorSubscription<SettingsNavigation, SettingsMessage> _settings;
  WorkspaceState get _state => _workspace.snapshot.state;
  WorkspaceScreen get screen => _state.screen;
  WorkspacePane get active => _state.active;
  List<WorkspacePane> get _opened => _state.opened;
  List<WorkspacePane>? get _pair => _state.pair;
  double get ratio => _state.ratio;
  SettingsCategory get category => _settings.snapshot.state.category;
  bool get settingsDetail => _settings.snapshot.state.detail;
  int get settingsRevision => _settings.snapshot.state.revision;
  WorkspaceTransition transition = WorkspaceTransition.direct;
  WorkspaceLayout? _preview;
  double? _snap;
  Size? _dragSize;
  Size size = Size.zero;

  @override
  void dispose() {
    _workspace.detach();
    _settings.detach();
    super.dispose();
  }

  List<WorkspacePane> get opened => List.unmodifiable(_opened);
  List<WorkspacePane>? get pair =>
      _pair == null ? null : List.unmodifiable(_pair!);
  bool get canSplit => size.width >= 768;
  bool get dragging => _dragSize != null;
  WorkspaceLayout get confirmed =>
      WorkspaceLayout(_pair ?? [active], ratio: ratio);
  WorkspaceLayout get layout {
    if (screen == WorkspaceScreen.home) {
      return WorkspaceLayout([WorkspacePane.desktop]);
    }
    final current = _preview ?? confirmed;
    return current.split && !canSplit ? WorkspaceLayout([active]) : current;
  }

  List<List<WorkspacePane>> get groups => [
    ?_pair,
    for (final pane in _opened)
      if (_pair == null || !_pair!.contains(pane)) [pane],
  ];

  void _changed(WorkspaceTransition next) {
    transition = next;
    notifyListeners();
  }

  void resize(Size next) {
    if (size == next) return;
    size = next;
    _preview = null;
    _dragSize = null;
    transition = WorkspaceTransition.direct;
  }

  double boundedRatio(double value) {
    final minimum = math.max(1 / 3, 360 / math.max(720, size.width - 8));
    return value.clamp(minimum, 1 - minimum);
  }

  void launch(WorkspacePane pane) => _workspace.dispatch(LaunchApp(pane));
  void showHome() => _workspace.dispatch(ShowHome());
  void showOverview() => _workspace.dispatch(ShowOverview());
  void dismissOverview() => _workspace.dispatch(DismissOverview());
  void close(WorkspacePane pane) => _workspace.dispatch(CloseApp(pane));
  void focus(WorkspacePane pane) => _workspace.dispatch(FocusApp(pane));

  WorkspaceLayout arranged(WorkspacePane pane, bool left) {
    if (_pair == null) {
      return WorkspaceLayout(
        left ? [pane, WorkspacePane.desktop] : [WorkspacePane.desktop, pane],
      );
    }
    final index = left ? 0 : 1;
    return _pair![index] == pane
        ? confirmed
        : WorkspaceLayout(_pair!.reversed.toList(), ratio: 1 - ratio);
  }

  void arrange(WorkspacePane pane, bool left) {
    if (!canSplit) return;
    _workspace.dispatch(SetLayout(arranged(pane, left), pane));
  }

  void fullscreen(WorkspacePane pane) => _workspace.dispatch(
    SetLayout(WorkspaceLayout([pane], ratio: ratio), pane),
  );

  void selectCategory(SettingsCategory next) =>
      _settings.dispatch(SelectCategory(next));
  void settingsBack() => _settings.dispatch(SettingsBack());

  void beginDrag() {
    _dragSize = size;
    _preview = null;
    _snap = null;
  }

  bool _validDrag() => _dragSize != null && _dragSize == size;
  void previewApp(WorkspacePane pane, double dx, double dy, Offset position) {
    if (!_validDrag() || !canSplit) return;
    final valid =
        dx.abs() >= 72 &&
        dx.abs() > dy.abs() &&
        (Offset.zero & size).contains(position);
    final next = valid ? arranged(pane, dx < 0) : null;
    if (listEquals(next?.panes, _preview?.panes) &&
        next?.ratio == _preview?.ratio) {
      return;
    }
    _preview = next;
    _changed(WorkspaceTransition.layout);
  }

  void previewDivider(double x) {
    if (!_validDrag() || _pair == null) return;
    final width = size.width - 8;
    final raw = (x - 4) / width;
    if (_snap != null && (raw - _snap!).abs() * width > 32) _snap = null;
    if (_snap == null) {
      final points =
          [1 / 3, 0.5, 2 / 3]
              .where((value) => (boundedRatio(value) - value).abs() < 0.00001)
              .toList()
            ..sort((a, b) => (a - raw).abs().compareTo((b - raw).abs()));
      if (points.isNotEmpty && (points.first - raw).abs() * width <= 20) {
        _snap = points.first;
      }
    }
    final exit = x <= 48
        ? _pair![1]
        : x >= size.width - 48
        ? _pair![0]
        : null;
    final exiting = _preview?.split == false;
    _preview = WorkspaceLayout(
      exit == null ? _pair! : [exit],
      ratio: boundedRatio(_snap ?? raw),
    );
    _changed(
      exit != null || exiting
          ? WorkspaceTransition.layout
          : WorkspaceTransition.direct,
    );
  }

  void finishDrag() {
    if (!_validDrag()) {
      cancelDrag();
      return;
    }
    final next = _preview;
    _preview = null;
    _dragSize = null;
    if (next == null) {
      _changed(WorkspaceTransition.layout);
    } else if (next.split) {
      _workspace.dispatch(SetLayout(next, active));
    } else {
      fullscreen(next.panes.single);
    }
  }

  void cancelDrag({bool notify = true}) {
    _preview = null;
    _dragSize = null;
    if (notify) _changed(WorkspaceTransition.layout);
  }

  void adjustRatio(double value) {
    _workspace.dispatch(
      SetLayout(
        WorkspaceLayout(_pair ?? [active], ratio: boundedRatio(value)),
        active,
      ),
    );
  }
}
