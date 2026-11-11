import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:skynet_client/presentation/preferences.dart';
import 'package:skynet_client/data/preferences_store.dart';

import 'support/client_fixture.dart';
import 'support/test_store.dart';

void main() {
  test('preference codec roundtrip and unknown fields', () {
    const value = ClientPreferences(
      appearance: ClientAppearance.dark,
      wallpaper: ClientWallpaper.forest,
      reduceMotion: true,
    );
    expect(
      encodePreferences(decodePreferences(encodePreferences(value))),
      encodePreferences(value),
    );
    expect(
      encodePreferences(
        decodePreferences('{"appearance":"future","wallpaper":"future"}'),
      ),
      encodePreferences(const ClientPreferences()),
    );
    expect(() => decodePreferences('{bad'), throwsFormatException);
  });
  test('writes are serialized and memory changes immediately', () async {
    final store = TestStore()..gate = Completer<void>();
    final client = TestClient(store: store);
    final preferences = client.preferences;

    preferences.update(
      preferences.value.copyWith(appearance: ClientAppearance.dark),
    );
    preferences.update(
      preferences.value.copyWith(wallpaper: ClientWallpaper.dusk),
    );
    expect(preferences.value.wallpaper, ClientWallpaper.dusk);
    expect(store.values, isEmpty);
    store.gate!.complete();
    await preferences.saved;
    expect(store.values.map((value) => value.wallpaper), [
      ClientWallpaper.coast,
      ClientWallpaper.dusk,
    ]);
    expect(store.values.last.appearance, ClientAppearance.dark);
  });
  test(
    'read and write failure preserve usable memory and later writes recover',
    () async {
      final store = TestStore()..fail = true;
      final client = TestClient(store: store);
      final preferences = client.preferences;

      await client.runtime.initialize();
      expect(preferences.notice, isNotNull);
      preferences.update(preferences.value.copyWith(reduceMotion: true));
      await preferences.saved;
      expect(preferences.value.reduceMotion, isTrue);
      expect(preferences.notice, contains('本次运行'));
      store.fail = false;
      preferences.update(
        preferences.value.copyWith(wallpaper: ClientWallpaper.forest),
      );
      await preferences.saved;
      expect(preferences.notice, isNull);
      expect(store.values.single.reduceMotion, isTrue);
    },
  );
  test(
    'late load cannot overwrite a user change or notify a disposed controller',
    () async {
      final store = TestStore()..loading = Completer<ClientPreferences>();
      final client = TestClient(store: store);
      final preferences = client.preferences;
      final load = client.runtime.initialize();
      preferences.update(
        preferences.value.copyWith(appearance: ClientAppearance.dark),
      );
      store.loading!.complete(const ClientPreferences());
      await load;
      expect(preferences.value.appearance, ClientAppearance.dark);
      await preferences.saved;
    },
  );
}
