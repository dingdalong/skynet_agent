import 'package:flutter/foundation.dart';

import '../domain/preferences.dart';
import '../runtime/actor.dart';
import '../runtime/preferences.dart';

export '../domain/preferences.dart';

class PreferencesController extends ChangeNotifier {
  PreferencesController(this.runtime) {
    _subscription = runtime.attach((_) => notifyListeners());
  }
  final PreferencesRuntime runtime;
  late final ActorSubscription<PreferencesState, PreferencesMessage>
  _subscription;

  ClientPreferences get value => _subscription.snapshot.state.value;
  String? get notice => switch (_subscription.snapshot.state.failure) {
    PreferenceFailure.read => '无法读取偏好，已使用默认设置。',
    PreferenceFailure.write => '无法保存偏好，当前设置仅在本次运行生效。',
    null => null,
  };

  Future<void> get saved => runtime.saved;
  void update(ClientPreferences value) =>
      _subscription.dispatch(UpdatePreferences(value));

  @override
  void dispose() {
    _subscription.detach();
    super.dispose();
  }
}
