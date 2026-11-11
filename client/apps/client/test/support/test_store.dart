import 'dart:async';

import 'package:skynet_client/domain/preferences.dart';

class TestStore implements PreferencesStore {
  final values = <ClientPreferences>[];
  bool fail = false;
  Completer<void>? gate;
  Completer<ClientPreferences>? loading;
  @override
  Future<ClientPreferences> read() async {
    if (fail) throw const FormatException('invalid stored preference');
    return loading?.future ?? const ClientPreferences();
  }

  @override
  Future<void> write(ClientPreferences value) async {
    await gate?.future;
    if (fail) throw StateError('storage unavailable');
    values.add(value);
  }
}
