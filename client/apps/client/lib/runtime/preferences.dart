import 'dart:async';

import '../domain/preferences.dart';
import 'actor.dart';

sealed class PreferencesMessage {}

class UpdatePreferences extends PreferencesMessage {
  UpdatePreferences(this.value);
  final ClientPreferences value;
}

class _Loaded extends PreferencesMessage {
  _Loaded(this.revision, this.value, this.failure);
  final int revision;
  final ClientPreferences? value;
  final PreferenceFailure? failure;
}

class _Saved extends PreferencesMessage {
  _Saved(this.revision, this.failure);
  final int revision;
  final PreferenceFailure? failure;
}

class PreferencesRuntime
    extends StateActor<PreferencesState, PreferencesMessage> {
  PreferencesRuntime(this.store, {required super.log, required super.onFault})
    : super('preferences', const PreferencesState());

  final PreferencesStore store;
  Future<void> _saves = Future.value();
  Future<void>? _loading;
  Future<void> get saved => _saves;

  Future<void> load() => _loading ??= _load();

  Future<void> _load() async {
    final revision = state.revision;
    try {
      final value = await store.read();
      dispatch(_Loaded(revision, value, null));
    } catch (error, stack) {
      log('preferences.read revision=$revision failed: $error\n$stack');
      dispatch(_Loaded(revision, null, PreferenceFailure.read));
    }
  }

  @override
  PreferencesState reduce(
    PreferencesState current,
    PreferencesMessage message,
  ) => switch (message) {
    UpdatePreferences(:final value) => PreferencesState(
      value: value,
      revision: current.revision + 1,
      failure: current.failure,
    ),
    _Loaded(:final revision, :final value, :final failure)
        when revision == current.revision =>
      PreferencesState(
        value: value ?? current.value,
        revision: revision,
        failure: failure,
      ),
    _Saved(:final revision, :final failure) when revision == current.revision =>
      PreferencesState(
        value: current.value,
        revision: revision,
        failure: failure,
      ),
    _ => current,
  };

  @override
  void committed(PreferencesMessage message, PreferencesState previous) {
    if (message case UpdatePreferences(:final value)) {
      final revision = state.revision;
      _saves = _saves.then((_) async {
        try {
          await store.write(value);
          dispatch(_Saved(revision, null));
        } catch (error, stack) {
          log('preferences.write revision=$revision failed: $error\n$stack');
          dispatch(_Saved(revision, PreferenceFailure.write));
        }
      });
    }
  }

  Future<void> shutdown() async {
    // Stop accepting new commands before waiting for already submitted writes.
    close();
    await _loading;
    await _saves;
  }
}
