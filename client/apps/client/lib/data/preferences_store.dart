import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../domain/preferences.dart';

String encodePreferences(ClientPreferences value) => jsonEncode({
  'appearance': value.appearance.name,
  'wallpaper': value.wallpaper.name,
  'reduceMotion': value.reduceMotion,
});

ClientPreferences decodePreferences(String? source) {
  if (source == null) return const ClientPreferences();
  final data = jsonDecode(source);
  if (data is! Map<String, dynamic>) {
    throw const FormatException('Preferences must be an object');
  }
  return ClientPreferences(
    appearance:
        ClientAppearance.values
            .where((item) => item.name == data['appearance'])
            .firstOrNull ??
        ClientAppearance.system,
    wallpaper:
        ClientWallpaper.values
            .where((item) => item.name == data['wallpaper'])
            .firstOrNull ??
        ClientWallpaper.coast,
    reduceMotion: data['reduceMotion'] == true,
  );
}

class LocalPreferencesStore implements PreferencesStore {
  final _storage = SharedPreferencesAsync();
  static const _key = 'skynet.client.workspace.preferences.v1';

  @override
  Future<ClientPreferences> read() async =>
      decodePreferences(await _storage.getString(_key));

  @override
  Future<void> write(ClientPreferences preferences) =>
      _storage.setString(_key, encodePreferences(preferences));
}
