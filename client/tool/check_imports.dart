import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

List<String> importViolations(String path, String source) {
  final layer = path.split('/').first;
  final violations = <String>[];
  final unit = parseString(content: source, throwIfDiagnostics: false).unit;
  for (final directive in unit.directives) {
    if (directive is! UriBasedDirective) continue;
    final uris = [
      directive.uri.stringValue,
      if (directive is ImportDirective)
        ...directive.configurations.map((item) => item.uri.stringValue),
      if (directive is ExportDirective)
        ...directive.configurations.map((item) => item.uri.stringValue),
    ].whereType<String>();
    for (final uri in uris) {
      final internal = uri.startsWith('package:skynet_client/')
          ? uri.substring('package:skynet_client/'.length)
          : uri.contains(':')
          ? null
          : Uri.file('/$path').resolve(uri).path.substring(1);
      final target = internal?.split('/').first;
      final pureDart =
          uri.startsWith('dart:') &&
          !{
            'dart:io',
            'dart:ffi',
            'dart:ui',
            'dart:isolate',
            'dart:js_interop',
          }.contains(uri);
      final allowed = switch (layer) {
        'domain' => pureDart || target == 'domain',
        'runtime' =>
          pureDart ||
              uri == 'dart:isolate' ||
              {'domain', 'runtime'}.contains(target),
        'data' =>
          pureDart ||
              {'domain', 'data'}.contains(target) ||
              (uri.startsWith('package:') && internal == null),
        'presentation' =>
          uri != 'dart:io' &&
              uri != 'dart:ffi' &&
              uri != 'dart:isolate' &&
              target != 'data' &&
              (!uri.startsWith('package:') ||
                  internal != null ||
                  {'flutter', 'cupertino_ui', 'apple_ui'}.contains(
                    uri.substring('package:'.length).split('/').first,
                  )),
        _ => true,
      };
      if (!allowed) violations.add('$path: $layer cannot depend on $uri');
    }
  }
  return violations;
}

void main() {
  final root = Directory.fromUri(
    Platform.script.resolve('../apps/client/lib/'),
  );
  final violations = <String>[];
  for (final file in root.listSync(recursive: true).whereType<File>()) {
    if (!file.path.endsWith('.dart')) continue;
    violations.addAll(
      importViolations(
        file.path.substring(root.path.length),
        file.readAsStringSync(),
      ),
    );
  }
  if (violations.isNotEmpty) {
    stderr.writeln(violations.join('\n'));
    exitCode = 1;
  } else {
    stdout.writeln('Client import boundaries passed');
  }
}
