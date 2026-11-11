enum ClientAppearance { system, light, dark }

enum ClientWallpaper { coast, dusk, forest }

class ClientPreferences {
  const ClientPreferences({
    this.appearance = ClientAppearance.system,
    this.wallpaper = ClientWallpaper.coast,
    this.reduceMotion = false,
  });
  final ClientAppearance appearance;
  final ClientWallpaper wallpaper;
  final bool reduceMotion;

  ClientPreferences copyWith({
    ClientAppearance? appearance,
    ClientWallpaper? wallpaper,
    bool? reduceMotion,
  }) => ClientPreferences(
    appearance: appearance ?? this.appearance,
    wallpaper: wallpaper ?? this.wallpaper,
    reduceMotion: reduceMotion ?? this.reduceMotion,
  );
}

abstract interface class PreferencesStore {
  Future<ClientPreferences> read();
  Future<void> write(ClientPreferences preferences);
}

enum PreferenceFailure { read, write }

class PreferencesState {
  const PreferencesState({
    this.value = const ClientPreferences(),
    this.revision = 0,
    this.failure,
  });
  final ClientPreferences value;
  final int revision;
  final PreferenceFailure? failure;
}
