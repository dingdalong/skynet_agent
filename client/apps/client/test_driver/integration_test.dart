import 'dart:convert';
import 'dart:io';

import 'package:integration_test/integration_test_driver.dart';

Future<void> main() => integrationDriver(
  responseDataCallback: (data) async {
    final directory = Directory('../../test-artifacts/macos-visual');
    await directory.create(recursive: true);
    await File('${directory.path}/native-performance.json')
        .writeAsString('${const JsonEncoder.withIndent('  ').convert(data)}\n');
  },
);
