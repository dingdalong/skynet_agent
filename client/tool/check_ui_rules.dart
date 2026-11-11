import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';

class UiViolation {
  const UiViolation(this.rule, this.offset, this.message);

  final String rule;
  final int offset;
  final String message;
}

/// Uses resolved elements so prefixes, typedefs and unrelated class names work.
List<UiViolation> checkUiUnit(
  ResolvedUnitResult result, {
  bool themeDefinitions = false,
  bool iconDefinitions = false,
}) {
  final visitor = _UiRulesVisitor(themeDefinitions, iconDefinitions);
  result.unit.accept(visitor);
  return visitor.violations;
}

class _UiRulesVisitor extends RecursiveAstVisitor<void> {
  _UiRulesVisitor(this.themeDefinitions, this.iconDefinitions);

  final bool themeDefinitions;
  final bool iconDefinitions;
  final violations = <UiViolation>[];

  static const _fontArguments = {
    'fontSize',
    'fontWeight',
    'fontFamily',
    'fontFamilyFallback',
    'fontStyle',
    'fontFeatures',
    'fontVariations',
    'height',
    'leadingDistribution',
    'letterSpacing',
    'wordSpacing',
    'fontSizeFactor',
    'fontSizeDelta',
    'fontWeightDelta',
    'heightFactor',
    'heightDelta',
    'letterSpacingFactor',
    'letterSpacingDelta',
    'wordSpacingFactor',
    'wordSpacingDelta',
  };

  bool _isFramework(Element? element, String name) {
    final uri = element?.library?.uri.toString() ?? '';
    return element?.name == name &&
        (uri == 'dart:ui' ||
            uri.startsWith('package:flutter/') ||
            uri.startsWith('package:cupertino_ui/'));
  }

  void _report(String rule, AstNode node, String message) =>
      violations.add(UiViolation(rule, node.offset, message));

  void _checkFontArguments(ArgumentList arguments) {
    if (themeDefinitions) return;
    for (final argument in arguments.arguments.whereType<NamedArgument>()) {
      if (_fontArguments.contains(argument.name.lexeme)) {
        _report(
          'ui-typography',
          argument,
          '文字规格集中在 AppleThemeData 中；在此引用文字角色。',
        );
      }
    }
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final type = node.staticType?.element;
    if (!themeDefinitions && _isFramework(type, 'Color')) {
      _report('ui-color', node, '颜色集中在 AppleThemeData 中；在此引用语义颜色。');
    }
    if (!iconDefinitions && _isFramework(type, 'IconData')) {
      _report('ui-icon', node, '图标定义集中在 AppleIcons 中。');
    }
    if (_isFramework(type, 'TextStyle')) {
      _checkFontArguments(node.argumentList);
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (_isFramework(node.methodName.element?.enclosingElement, 'TextStyle')) {
      _checkFontArguments(node.argumentList);
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    if (!themeDefinitions &&
        (_isFramework(node.element, 'CupertinoColors') ||
            _isFramework(node.element, 'Colors'))) {
      _report('ui-color', node, '系统颜色在主题中映射；在此引用语义颜色。');
    }
    if (!iconDefinitions &&
        (_isFramework(node.element, 'CupertinoIcons') ||
            _isFramework(node.element, 'Icons'))) {
      _report('ui-icon', node, '在此引用 AppleIcons 中的语义图标。');
    }
    super.visitSimpleIdentifier(node);
  }
}

Future<void> main() async {
  final workspace = File.fromUri(Platform.script).parent.parent;
  final libraries = [
    for (final group in ['apps', 'packages'])
      for (final package in Directory(
        '${workspace.path}/$group',
      ).listSync().whereType<Directory>())
        if (Directory('${package.path}/lib').existsSync())
          Directory('${package.path}/lib'),
  ];
  final collection = AnalysisContextCollection(
    includedPaths: libraries.map((directory) => directory.path).toList(),
  );
  var count = 0;
  var failures = 0;
  try {
    for (final library in libraries) {
      final files =
          library
              .listSync(recursive: true, followLinks: false)
              .whereType<File>()
              .where(
                (file) =>
                    file.path.endsWith('.dart') &&
                    !RegExp(r'\.(g|freezed|mocks)\.dart$').hasMatch(file.path),
              )
              .toList()
            ..sort((a, b) => a.path.compareTo(b.path));
      for (final file in files) {
        final relative = file.path.substring(workspace.path.length + 1);
        final result = await collection
            .contextFor(file.path)
            .currentSession
            .getResolvedUnit(file.path);
        if (result is! ResolvedUnitResult) {
          stderr.writeln('$relative: 无法解析 Dart 文件。');
          failures++;
          continue;
        }
        count++;
        final violations = checkUiUnit(
          result,
          themeDefinitions: relative == 'packages/apple_ui/lib/src/theme.dart',
          iconDefinitions: relative == 'packages/apple_ui/lib/src/icons.dart',
        );
        for (final violation in violations) {
          final location = result.lineInfo.getLocation(violation.offset);
          stderr.writeln(
            '$relative:${location.lineNumber}:${location.columnNumber} '
            '[${violation.rule}] ${violation.message}',
          );
        }
        failures += violations.length;
      }
    }
  } finally {
    await collection.dispose();
  }
  stdout.writeln('UI 规范检查：$count 个文件，$failures 项问题。');
  if (failures > 0) exitCode = 1;
}
