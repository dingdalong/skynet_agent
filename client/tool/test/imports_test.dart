import 'package:test/test.dart';

import '../check_imports.dart';

void main() {
  test('domain and runtime reject UI, plugins and indirect layer exports', () {
    expect(
      importViolations(
        'domain/state.dart',
        "import 'package:flutter/widgets.dart';",
      ),
      hasLength(1),
    );
    expect(
      importViolations(
        'runtime/chat.dart',
        "export '../data/preferences_store.dart';",
      ),
      hasLength(1),
    );
    expect(
      importViolations(
        'runtime/chat.dart',
        "import '../domain/workspace.dart'; import 'dart:async';",
      ),
      isEmpty,
    );
  });
  test('presentation rejects storage and direct worker creation', () {
    expect(
      importViolations(
        'presentation/page.dart',
        "import 'dart:isolate'; import 'package:shared_preferences/shared_preferences.dart';",
      ),
      hasLength(2),
    );
    expect(
      importViolations(
        'presentation/page.dart',
        "import '../runtime/workspace.dart'; import 'package:cupertino_ui/cupertino_ui.dart';",
      ),
      isEmpty,
    );
  });
  test('conditional imports cannot bypass the boundary', () {
    expect(
      importViolations(
        'domain/state.dart',
        "import 'state_stub.dart' if (dart.library.io) '../platform/native.dart';",
      ),
      hasLength(1),
    );
  });
}
