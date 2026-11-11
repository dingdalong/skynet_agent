import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/domain/workspace.dart';
import 'package:skynet_client/presentation/preferences.dart';
import 'package:skynet_client/runtime/preferences.dart';
import 'package:skynet_client/runtime/workspace.dart';

import 'support/client_fixture.dart';
import 'support/test_store.dart';

void main() {
  test(
    'reentrant preference commands run after all current subscribers',
    () async {
      final client = TestClient();
      final actor = client.runtime.preferences;
      final observed = <String>[];
      final first = actor.attach((snapshot) {
        if (snapshot.state.revision == 1) {
          observed.add('first:1');
          actor.dispatch(
            UpdatePreferences(
              snapshot.state.value.copyWith(wallpaper: ClientWallpaper.forest),
            ),
          );
        }
      });
      final second = actor.attach((snapshot) {
        observed.add('second:${snapshot.state.revision}');
      });
      actor.dispatch(
        UpdatePreferences(
          const ClientPreferences(appearance: ClientAppearance.dark),
        ),
      );
      expect(observed.take(3), ['first:1', 'second:1', 'second:2']);
      expect(actor.state.value.wallpaper, ClientWallpaper.forest);
      expect(actor.state.value.appearance, ClientAppearance.dark);
      first.detach();
      second.detach();
      await actor.saved;
    },
  );

  test(
    'new views get the latest snapshot; detached senders cannot mutate state',
    () async {
      final store = TestStore()..gate = Completer<void>();
      final client = TestClient(store: store);
      final runtime = client.runtime;
      final old = runtime.preferences.attach((_) {});
      old.dispatch(
        UpdatePreferences(
          const ClientPreferences(wallpaper: ClientWallpaper.dusk),
        ),
      );
      old.detach();
      final next = runtime.preferences.attach((_) {});
      expect(next.snapshot.state.value.wallpaper, ClientWallpaper.dusk);
      expect(
        old.dispatch(UpdatePreferences(const ClientPreferences())),
        isFalse,
      );
      runtime.reloadView(WorkspacePane.settings);
      expect(runtime.preferences.closed, isFalse);
      store.gate!.complete();
      await runtime.preferences.saved;
      expect(store.values.single.wallpaper, ClientWallpaper.dusk);
      next.detach();
    },
  );

  test(
    'subscriber failure belongs to settings; another app remains usable',
    () async {
      final client = TestClient();
      final runtime = client.runtime;
      final bad = runtime.preferences.attach(
        (_) => throw StateError('view failed'),
      );
      client.preferences.update(const ClientPreferences(reduceMotion: true));
      expect(bad.active, isFalse);
      expect(runtime.app(WorkspacePane.settings).state.failed, isTrue);
      expect(runtime.app(WorkspacePane.chat).state.failed, isFalse);
      runtime.workspace.dispatch(LaunchApp(WorkspacePane.chat));
      expect(runtime.workspace.state.active, WorkspacePane.chat);
      runtime.reloadView(WorkspacePane.settings);
      expect(runtime.app(WorkspacePane.settings).state.failed, isFalse);
      expect(runtime.preferences.state.value.reduceMotion, isTrue);
      await runtime.preferences.saved;
    },
  );

  test(
    'late callback failures from a replaced view cannot fail its successor',
    () async {
      final client = TestClient();
      final runtime = client.runtime;
      final done = Completer<void>();
      final revision = runtime.app(WorkspacePane.settings).state.viewRevision;
      runtime.guard(WorkspacePane.settings, revision, () => done.future);
      runtime.reloadView(WorkspacePane.settings);
      done.completeError(StateError('old callback failed'));
      await Future<void>.delayed(Duration.zero);
      expect(runtime.app(WorkspacePane.settings).state.failed, isFalse);
      var called = false;
      runtime.guard(WorkspacePane.settings, revision, () {
        called = true;
      });
      expect(called, isFalse);
    },
  );

  test(
    'host shutdown rejects new commands and waits for submitted persistence',
    () async {
      final store = TestStore()..gate = Completer<void>();
      final client = TestClient(store: store);
      client.preferences.update(const ClientPreferences(reduceMotion: true));
      var stopped = false;
      final shutdown = client.runtime.shutdown().then((_) {
        stopped = true;
      });
      await Future<void>.delayed(Duration.zero);
      expect(stopped, isFalse);
      client.preferences.update(const ClientPreferences());
      store.gate!.complete();
      await shutdown;
      expect(store.values.single.reduceMotion, isTrue);
      expect(client.runtime.preferences.closed, isTrue);
    },
  );

  test('workspace snapshots do not alias mutable collections', () {
    final panes = [WorkspacePane.chat];
    final state = WorkspaceState(opened: panes);
    final layout = WorkspaceLayout(panes);
    panes.add(WorkspacePane.settings);
    expect(state.opened, [WorkspacePane.chat]);
    expect(layout.panes, [WorkspacePane.chat]);
    expect(() => state.opened.clear(), throwsUnsupportedError);
  });
}
