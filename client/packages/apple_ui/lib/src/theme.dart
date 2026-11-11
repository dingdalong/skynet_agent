import 'package:cupertino_ui/cupertino_ui.dart';

enum AppleDensity { desktop, touch }

/// Project tokens, informed by HIG roles and checked in the macOS app.
/// These values are project choices, not a table of mandatory Apple constants.
@immutable
class AppleThemeData {
  const AppleThemeData({
    required this.brightness,
    this.density = AppleDensity.desktop,
    this.highContrast = false,
    this.reduceTransparency = false,
  });

  final Brightness brightness;
  final AppleDensity density;
  final bool highContrast;
  final bool reduceTransparency;

  bool get isDark => brightness == Brightness.dark;
  bool get isTouch => density == AppleDensity.touch;
  double get controlHeight => isTouch ? 44 : 30;
  double get bodySize => isTouch ? 17 : 14;
  double get iconSize => isTouch ? 20 : 16;
  double get rowPadding => isTouch ? 14 : 10;
  double get controlRadius => 8;
  double get surfaceRadius => 12;
  Color get background =>
      isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF5F5F7);
  Color get surface =>
      isDark ? const Color(0xFF29292B) : const Color(0xFFFFFFFF);
  Color get sidebar =>
      isDark ? const Color(0xFF232325) : const Color(0xFFEBEBEE);
  Color get text => isDark ? const Color(0xFFF5F5F7) : const Color(0xFF1D1D1F);
  Color get secondaryText => highContrast
      ? text
      : isDark
      ? const Color(0xFFB8B8BF)
      : const Color(0xFF626269);
  Color get border => highContrast
      ? secondaryText
      : isDark
      ? const Color(0xFF48484D)
      : const Color(0xFFD5D5DB);
  Color get accent =>
      isDark ? const Color(0xFF84BFFF) : const Color(0xFF005DBB);
  Color get controlBorder => highContrast
      ? text
      : isDark
      ? const Color(0xFF929299)
      : const Color(0xFF85858C);
  Color get accentFill => const Color(0xFF0063C6);
  Color get onAccent => const Color(0xFFFFFFFF);
  Color get selected =>
      isDark ? const Color(0xFF193C60) : const Color(0xFFD6E6F9);
  Color get danger =>
      isDark ? const Color(0xFFFF9B94) : const Color(0xFFB4231C);
  Color get dangerFill => const Color(0xFFB4231C);
  Color get warning =>
      isDark ? const Color(0xFFFFDF8A) : const Color(0xFF855000);
  Color get success =>
      isDark ? const Color(0xFF8BE0A9) : const Color(0xFF1B6E39);
  Color get information => accent;
  Color get transparent => const Color(0x00000000);
  Color get scrim => const Color(0x33000000);
  Color get hover => isDark ? const Color(0xFF38383C) : const Color(0xFFE4E4E9);
  List<Color> get chatIconGradient => const [
    Color(0xFF59ACFF),
    Color(0xFF0864D8),
  ];
  List<Color> get settingsIconGradient => const [
    Color(0xFFF9FAFC),
    Color(0xFFB9C4D2),
  ];
  Color get settingsIconForeground => const Color(0xFF4A586C);
  Color get highlight => const Color(0xFFFFFFFF);
  Color get shadow => const Color(0xFF12243F);
  Color get glassTint =>
      isDark ? const Color(0xFF30343E) : const Color(0xFFF3F6FF);
  Color get glassEdge =>
      isDark ? const Color(0x55FFFFFF) : const Color(0xB3FFFFFF);
  List<BoxShadow> get floatingShadow => [
    BoxShadow(
      color: shadow.withValues(alpha: isDark ? 0.28 : 0.13),
      blurRadius: 28,
      offset: const Offset(0, 10),
    ),
    BoxShadow(
      color: shadow.withValues(alpha: 0.05),
      blurRadius: 4,
      offset: const Offset(0, 1),
    ),
  ];
  List<BoxShadow> get appIconShadow => [
    BoxShadow(
      color: shadow.withValues(alpha: isDark ? 0.3 : 0.18),
      blurRadius: 16,
      offset: const Offset(0, 6),
    ),
  ];
  List<Color> wallpaperColors(String name) => switch (name) {
    'dusk' =>
      isDark
          ? const [Color(0xFF61445A), Color(0xFF18243D)]
          : const [Color(0xFFF1D0D1), Color(0xFF888EC6)],
    'forest' =>
      isDark
          ? const [Color(0xFF3D5344), Color(0xFF142A32)]
          : const [Color(0xFFEEF0D0), Color(0xFF66979A)],
    _ =>
      isDark
          ? const [Color(0xFF303D6A), Color(0xFF16233C)]
          : const [Color(0xFFDBE2FA), Color(0xFF7D95D4)],
  };

  TextStyle get body => const CupertinoTextThemeData().textStyle.copyWith(
    fontSize: bodySize,
    height: 1.4,
    color: text,
  );
  TextStyle get caption =>
      body.copyWith(fontSize: isTouch ? 13 : 12, color: secondaryText);
  TextStyle get supporting =>
      body.copyWith(fontSize: isTouch ? 15 : 13, color: secondaryText);
  TextStyle get sectionTitle =>
      body.copyWith(fontSize: isTouch ? 24 : 17, fontWeight: FontWeight.w600);
  TextStyle get pageTitle => sectionTitle.copyWith(fontSize: isTouch ? 28 : 26);
  TextStyle get label => body.copyWith(fontWeight: FontWeight.w600);
  TextStyle get code => body.copyWith(fontFamily: 'monospace');
  TextStyle get eyebrow => caption.copyWith(letterSpacing: 1.2);
  TextStyle get button => body.copyWith(fontWeight: FontWeight.w400);
  TextStyle get emphasizedButton => body.copyWith(fontWeight: FontWeight.w500);

  CupertinoThemeData get cupertino => CupertinoThemeData(
    brightness: brightness,
    primaryColor: accent,
    primaryContrastingColor: onAccent,
    scaffoldBackgroundColor: background,
    barBackgroundColor: surface,
    textTheme: CupertinoTextThemeData(
      textStyle: body,
      actionTextStyle: body.copyWith(color: accent),
      navTitleTextStyle: label,
    ),
  );
}

/// Preferred spacing steps; layout-specific measurements remain local.
abstract final class AppleSpacing {
  static const double xsmall = 4;
  static const double small = 8;
  static const double medium = 12;
  static const double large = 16;
  static const double xlarge = 24;
  static const double xxlarge = 32;
}

abstract final class AppleMotion {
  static const feedback = Duration(milliseconds: 120);
  static const layout = Duration(milliseconds: 220);
  static const navigation = Duration(milliseconds: 320);
  static const dismiss = Duration(milliseconds: 180);
  static const curve = Cubic(0.2, 0.8, 0.2, 1);
}

class AppleTheme extends InheritedWidget {
  const AppleTheme({super.key, required this.data, required super.child});

  final AppleThemeData data;

  static AppleThemeData of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppleTheme>()!.data;

  @override
  bool updateShouldNotify(AppleTheme oldWidget) => data != oldWidget.data;
}

extension AppleThemeContext on BuildContext {
  AppleThemeData get apple => AppleTheme.of(this);
}
