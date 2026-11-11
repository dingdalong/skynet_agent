import 'dart:async';

import '../domain/preferences.dart';
import '../domain/workspace.dart';
import 'actor.dart';
import 'preferences.dart';
import 'workspace.dart';

class SubappStatus {
  const SubappStatus({this.viewRevision = 0, this.failed = false});
  final int viewRevision;
  final bool failed;
}

sealed class SubappMessage {}

class FailView extends SubappMessage {}

class ReloadView extends SubappMessage {}

class SubappRuntime extends StateActor<SubappStatus, SubappMessage> {
  SubappRuntime(String name, {required super.log, required super.onFault})
    : super(name, const SubappStatus());

  @override
  SubappStatus reduce(SubappStatus s, SubappMessage message) =>
      switch (message) {
        FailView() =>
          s.failed
              ? s
              : SubappStatus(viewRevision: s.viewRevision + 1, failed: true),
        ReloadView() => SubappStatus(viewRevision: s.viewRevision + 1),
      };
}

/// Created before runApp; no Widget owns the lifetime of this object.
class ClientRuntime {
  ClientRuntime({required PreferencesStore store, required this.log}) {
    for (final pane in WorkspacePane.values.where((pane) => pane.isApp)) {
      _apps[pane] = SubappRuntime(
        pane.name,
        log: log,
        onFault: (error, stack) =>
            log('subapp ${pane.name} fault: $error\n$stack'),
      );
    }
    preferences = PreferencesRuntime(
      store,
      log: log,
      onFault: (error, stack) => fail(WorkspacePane.settings, error, stack),
    );
    settings = SettingsRuntime(
      log: log,
      onFault: (error, stack) => fail(WorkspacePane.settings, error, stack),
    );
    workspace = WorkspaceRuntime(
      log: log,
      onFault: (error, stack) => log('workspace fault: $error\n$stack'),
      onClose: (pane) {
        if (pane == WorkspacePane.settings) settings.dispatch(ResetSettings());
        // Closing the view resets navigation, never submitted business work.
        _apps[pane]!.dispatch(ReloadView());
      },
    );
    log('ClientRuntime initialized: workspace, settings, chat, preferences');
  }

  final RuntimeLog log;
  final _apps = <WorkspacePane, SubappRuntime>{};
  SubappRuntime app(WorkspacePane pane) => _apps[pane]!;
  late final PreferencesRuntime preferences;
  late final SettingsRuntime settings;
  late final WorkspaceRuntime workspace;
  Future<void>? _shutdown;

  Future<void> initialize() => preferences.load();

  void fail(
    WorkspacePane pane,
    Object error,
    StackTrace stack, {
    int? viewRevision,
    String operation = 'callback',
  }) {
    if (app(pane).closed ||
        (viewRevision != null &&
            app(pane).state.viewRevision != viewRevision)) {
      return;
    }
    log(
      'subapp=${pane.name} operation=$operation '
      'viewRevision=${app(pane).state.viewRevision} '
      'sequence=${app(pane).sequence} failed: $error\n$stack',
    );
    app(pane).dispatch(FailView());
  }

  void guard(
    WorkspacePane pane,
    int viewRevision,
    FutureOr<void> Function() action,
  ) {
    if (app(pane).closed || app(pane).state.viewRevision != viewRevision) {
      return;
    }
    unawaited(
      Future<void>.sync(action).catchError((Object error, StackTrace stack) {
        fail(pane, error, stack, viewRevision: viewRevision);
      }),
    );
  }

  void reloadView(WorkspacePane pane) => app(pane).dispatch(ReloadView());

  Future<void> shutdown() => _shutdown ??= _close();
  Future<void> _close() async {
    workspace.close();
    settings.close();
    for (final app in _apps.values) {
      app.close();
    }
    await preferences.shutdown();
    log('ClientRuntime shutdown complete');
  }
}
