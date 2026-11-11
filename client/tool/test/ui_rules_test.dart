import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:test/test.dart';

import '../check_ui_rules.dart';

void main() {
  late Directory fixtures;
  late AnalysisContextCollection collection;
  var sequence = 0;

  setUpAll(() {
    fixtures = Directory('${Directory.current.path}/.dart_tool')
        .createTempSync('ui-rules-');
    collection = AnalysisContextCollection(includedPaths: [fixtures.path]);
  });
  tearDownAll(() async {
    await collection.dispose();
    fixtures.deleteSync(recursive: true);
  });

  Future<List<UiViolation>> check(
    String source, {
    bool theme = false,
    bool icons = false,
  }) async {
    final file = File('${fixtures.path}/case_${sequence++}.dart')
      ..writeAsStringSync('''
import 'package:cupertino_ui/cupertino_ui.dart' as ui;
import 'package:apple_ui/apple_ui.dart' as app;
$source
''');
    final result = await collection
        .contextFor(file.path)
        .currentSession
        .getResolvedUnit(file.path);
    expect(result, isA<ResolvedUnitResult>());
    return checkUiUnit(
      result as ResolvedUnitResult,
      themeDefinitions: theme,
      iconDefinitions: icons,
    );
  }

  test(
    'allows official controls, semantic styles and local layout sizes',
    () async {
      final issues = await check('''
ui.Widget example(ui.BuildContext context) {
  final theme = app.AppleTheme.of(context);
  return ui.Column(children: [
    ui.Text('标题', style: theme.pageTitle),
    ui.Text('说明', style: theme.body.copyWith(color: theme.secondaryText)),
    const ui.Icon(app.AppleIcons.warning),
    const ui.SizedBox(height: 20),
    ui.CupertinoSwitch(value: true, onChanged: (_) {}),
  ]);
}
''');
      expect(issues, isEmpty);
    },
  );

  test('detects prefixed colors, icon constants and raw IconData', () async {
    final issues = await check('''
final color = ui.Color.fromARGB(255, 0, 0, 0);
final systemColor = ui.CupertinoColors.systemBlue;
final icon = ui.CupertinoIcons.add;
final custom = ui.IconData(123);
''');
    expect(issues.where((issue) => issue.rule == 'ui-color'), hasLength(2));
    expect(issues.where((issue) => issue.rule == 'ui-icon'), hasLength(2));
  });

  test('detects typography in constructors, copyWith and apply', () async {
    final issues = await check('''
final explicit = ui.TextStyle(fontSize: 13, fontFamily: 'custom');
final weight = const ui.TextStyle().copyWith(fontWeight: ui.FontWeight.bold);
final line = const ui.TextStyle().copyWith(height: 1.4);
final scaled = const ui.TextStyle().apply(fontSizeFactor: 2);
''');
    expect(issues, hasLength(5));
    expect(issues.every((issue) => issue.rule == 'ui-typography'), isTrue);
  });

  test('resolves typedefs and allows unrelated local class names', () async {
    final issues = await check('''
typedef Tint = ui.Color;
final tint = Tint(0xff000000);
class Color { Color(int value); }
class TextStyle {
  TextStyle({double? fontSize});
  TextStyle copyWith({double? height}) => this;
}
final localColor = Color(1);
final localText = TextStyle(fontSize: 13).copyWith(height: 1.4);
''');
    expect(issues, hasLength(1));
    expect(issues.single.rule, 'ui-color');
  });

  test('ignores comments and example strings', () async {
    final issues = await check('''
// ui.Color(0xff000000); ui.CupertinoIcons.add;
/* ui.TextStyle(fontSize: 13); */
const example = """
ui.Color(0xff000000);
ui.TextStyle(fontWeight: ui.FontWeight.bold);
ui.CupertinoIcons.add;
""";
''');
    expect(issues, isEmpty);
  });

  test('theme and icon definitions have independent exceptions', () async {
    const source = '''
final tint = ui.Color(0xff000000);
final text = ui.TextStyle(fontSize: 13);
final icon = ui.CupertinoIcons.add;
''';
    final themeIssues = await check(source, theme: true);
    expect(themeIssues.map((issue) => issue.rule), ['ui-icon']);
    final iconIssues = await check(source, icons: true);
    expect(iconIssues.map((issue) => issue.rule), [
      'ui-color',
      'ui-typography',
    ]);
  });
}
