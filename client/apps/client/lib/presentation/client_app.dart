import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../runtime/client_runtime.dart';
import '../platform/host_effects.dart';
import 'subapp_boundary.dart';
import 'preferences.dart';
import '../platform/platform_effects.dart';
import 'workspace/controller.dart';
import 'workspace/workspace.dart';

class ClientApp extends StatefulWidget {
  const ClientApp({
    super.key,
    required this.runtime,
    this.workspace,
    this.nativeMenus = true,
  });
  final ClientRuntime runtime;
  final WorkspaceController? workspace;
  final bool nativeMenus;
  @override
  State<ClientApp> createState() => _ClientAppState();
}

class _ClientAppState extends State<ClientApp> with WidgetsBindingObserver {
  late final _effects = HostEffects(enabled: _native);
  late final _preferences = PreferencesController(widget.runtime.preferences);
  late final ErrorWidgetBuilder _previousErrorBuilder;
  late final ErrorWidgetBuilder _errorBuilder = _buildError;
  Widget _buildError(FlutterErrorDetails details) =>
      SubappBuildFailure(details: details);
  bool get _native =>
      widget.nativeMenus &&
      !kIsWeb &&
      defaultTargetPlatform == TargetPlatform.macOS;
  late final WorkspaceController _workspace =
      widget.workspace ??
      WorkspaceController(widget.runtime.workspace, widget.runtime.settings);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _preferences.addListener(_syncHost);
    _workspace.addListener(_syncHost);
    _effects.addListener(_effectsChanged);
    _effects.start();
    _previousErrorBuilder = ErrorWidget.builder;
    ErrorWidget.builder = _errorBuilder;
  }

  void _effectsChanged() {
    if (!mounted) return;
    setState(() {});
    _syncHost();
  }

  @override
  void didChangePlatformBrightness() {
    setState(() {});
    _syncHost();
  }

  @override
  void didChangeAccessibilityFeatures() => setState(() {});
  @override
  void dispose() {
    _preferences.removeListener(_syncHost);
    _workspace.removeListener(_syncHost);
    _effects.removeListener(_effectsChanged);
    _effects.dispose();
    _preferences.dispose();
    if (identical(ErrorWidget.builder, _errorBuilder)) {
      ErrorWidget.builder = _previousErrorBuilder;
    }
    WidgetsBinding.instance.removeObserver(this);
    if (widget.workspace == null) _workspace.dispose();
    super.dispose();
  }

  Brightness get _brightness => switch (_preferences.value.appearance) {
    ClientAppearance.system =>
      WidgetsBinding.instance.platformDispatcher.platformBrightness,
    ClientAppearance.light => Brightness.light,
    ClientAppearance.dark => Brightness.dark,
  };

  void _syncHost() {
    final theme = AppleThemeData(brightness: _brightness);
    final color = _workspace.screen == WorkspaceScreen.home
        ? theme.wallpaperColors(_preferences.value.wallpaper.name).first
        : theme.background;
    _effects.appearance(
      dark: theme.isDark,
      system: _preferences.value.appearance == ClientAppearance.system,
      background: color.toARGB32(),
    );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _preferences,
    builder: (context, _) {
      final system = WidgetsBinding.instance.platformDispatcher;
      final theme = AppleThemeData(
        brightness: _brightness,
        highContrast:
            system.accessibilityFeatures.highContrast || _effects.highContrast,
        reduceTransparency: _effects.reduceTransparency,
      );
      return CupertinoApp(
        title: 'Skynet Agent',
        debugShowCheckedModeBanner: false,
        theme: theme.cupertino,
        locale: const Locale('zh'),
        supportedLocales: const [Locale('zh'), Locale('en')],
        localizationsDelegates: GlobalCupertinoLocalizations.delegates,
        builder: (context, child) => AppleTheme(
          data: theme,
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(
              disableAnimations:
                  _preferences.value.reduceMotion ||
                  _effects.reduceMotion ||
                  MediaQuery.disableAnimationsOf(context),
            ),
            child: AppleFocusVisibility(
              child: AppleMaterialBackend(
                builder: (context, role, radius) =>
                    _effects.glass && role == AppleMaterialRole.floating
                    ? MacOSGlassBackground(dark: theme.isDark, radius: radius)
                    : null,
                child: DefaultTextStyle(style: theme.body, child: child!),
              ),
            ),
          ),
        ),
        home: Builder(
          builder: (context) {
            Widget child = Workspace(
              controller: _workspace,
              runtime: widget.runtime,
              preferences: _preferences,
            );
            if (widget.nativeMenus &&
                !kIsWeb &&
                defaultTargetPlatform == TargetPlatform.macOS) {
              child = PlatformMenuBar(
                menus: [
                  const PlatformMenu(
                    label: 'Skynet',
                    menus: [
                      PlatformProvidedMenuItem(
                        type: PlatformProvidedMenuItemType.about,
                      ),
                      PlatformProvidedMenuItem(
                        type: PlatformProvidedMenuItemType.hide,
                      ),
                      PlatformProvidedMenuItem(
                        type: PlatformProvidedMenuItemType.quit,
                      ),
                    ],
                  ),
                  PlatformMenu(
                    label: '工作区',
                    menus: [
                      PlatformMenuItem(
                        label: '返回桌面',
                        shortcut: const SingleActivator(
                          LogicalKeyboardKey.home,
                          control: true,
                          alt: true,
                        ),
                        onSelected: _workspace.showHome,
                      ),
                      PlatformMenuItem(
                        label: '后台应用',
                        shortcut: const SingleActivator(
                          LogicalKeyboardKey.keyA,
                          control: true,
                          alt: true,
                        ),
                        onSelected: _workspace.showOverview,
                      ),
                      PlatformMenuItem(
                        label: '设置…',
                        shortcut: const SingleActivator(
                          LogicalKeyboardKey.comma,
                          meta: true,
                        ),
                        onSelected: () =>
                            _workspace.launch(WorkspacePane.settings),
                      ),
                    ],
                  ),
                  const PlatformMenu(
                    label: '窗口',
                    menus: [
                      PlatformProvidedMenuItem(
                        type: PlatformProvidedMenuItemType.minimizeWindow,
                      ),
                      PlatformProvidedMenuItem(
                        type: PlatformProvidedMenuItemType.zoomWindow,
                      ),
                      PlatformProvidedMenuItem(
                        type: PlatformProvidedMenuItemType.toggleFullScreen,
                      ),
                    ],
                  ),
                ],
                child: child,
              );
            }
            return child;
          },
        ),
      );
    },
  );
}
