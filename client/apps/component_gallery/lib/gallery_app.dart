import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'catalog.dart';
import 'demos.dart';

enum GalleryAppearance { system, light, dark }

class GalleryApp extends StatefulWidget {
  const GalleryApp({super.key, this.nativeMenus = true});
  final bool nativeMenus;

  @override
  State<GalleryApp> createState() => _GalleryAppState();
}

class _GalleryAppState extends State<GalleryApp> with WidgetsBindingObserver {
  final _search = TextEditingController();
  final _searchFocus = FocusNode(debugLabel: 'Component search');
  final _contentScroll = ScrollController();
  final _directoryScroll = ScrollController();
  GalleryAppearance _appearance = GalleryAppearance.system;
  AppleDensity _density = AppleDensity.desktop;
  GalleryPage _page = galleryPages.first;
  double _textScale = 1;
  double? _previewWidth;
  bool _enabled = true;
  bool _highContrast = false;
  bool _reduceMotion = false;
  bool _showCode = false;
  bool _showDirectory = false;
  int _revision = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    debugPrint('ComponentGallery initialized: macOS component catalog');
  }

  @override
  void didChangePlatformBrightness() => setState(() {});

  @override
  void didChangeAccessibilityFeatures() => setState(() {});

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _search.dispose();
    _searchFocus.dispose();
    _contentScroll.dispose();
    _directoryScroll.dispose();
    super.dispose();
  }

  void _reset() => setState(() {
    _density = AppleDensity.desktop;
    _textScale = 1;
    _previewWidth = null;
    _enabled = true;
    _highContrast = false;
    _reduceMotion = false;
    _revision++;
  });

  void _focusSearch() {
    if (!_showDirectory) setState(() => _showDirectory = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchFocus.requestFocus();
    });
  }

  @override
  Widget build(BuildContext context) {
    final brightness = switch (_appearance) {
      GalleryAppearance.system =>
        WidgetsBinding.instance.platformDispatcher.platformBrightness,
      GalleryAppearance.light => Brightness.light,
      GalleryAppearance.dark => Brightness.dark,
    };
    final shellTheme = AppleThemeData(
      brightness: brightness,
      highContrast:
          _highContrast ||
          WidgetsBinding
              .instance
              .platformDispatcher
              .accessibilityFeatures
              .highContrast,
    );
    return CupertinoApp(
      title: 'Apple UI · 组件画廊',
      debugShowCheckedModeBanner: false,
      theme: shellTheme.cupertino,
      locale: const Locale('zh'),
      supportedLocales: const [Locale('zh'), Locale('en')],
      localizationsDelegates: GlobalCupertinoLocalizations.delegates,
      builder: (context, child) => AppleTheme(
        data: shellTheme,
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.textScalerOf(context).scale(_textScale),
            ),
            highContrast: _highContrast || MediaQuery.highContrastOf(context),
            disableAnimations:
                _reduceMotion || MediaQuery.disableAnimationsOf(context),
          ),
          child: AppleFocusVisibility(
            child: DefaultTextStyle(style: shellTheme.body, child: child!),
          ),
        ),
      ),
      home: Builder(
        builder: (context) {
          Widget child = CallbackShortcuts(
            bindings: {
              const SingleActivator(LogicalKeyboardKey.keyF, meta: true):
                  _focusSearch,
              const SingleActivator(
                LogicalKeyboardKey.keyR,
                meta: true,
                shift: true,
              ): _reset,
            },
            child: FocusTraversalGroup(child: _shell(context)),
          );
          if (widget.nativeMenus &&
              !kIsWeb &&
              defaultTargetPlatform == TargetPlatform.macOS) {
            child = PlatformMenuBar(
              menus: [
                const PlatformMenu(
                  label: '组件画廊',
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
                const PlatformMenu(
                  label: '编辑',
                  menus: [
                    PlatformMenuItem(
                      label: '撤销',
                      shortcut: SingleActivator(
                        LogicalKeyboardKey.keyZ,
                        meta: true,
                      ),
                      onSelectedIntent: UndoTextIntent(
                        SelectionChangedCause.toolbar,
                      ),
                    ),
                    PlatformMenuItem(
                      label: '重做',
                      shortcut: SingleActivator(
                        LogicalKeyboardKey.keyZ,
                        meta: true,
                        shift: true,
                      ),
                      onSelectedIntent: RedoTextIntent(
                        SelectionChangedCause.toolbar,
                      ),
                    ),
                    PlatformMenuItemGroup(
                      members: [
                        PlatformMenuItem(
                          label: '剪切',
                          shortcut: SingleActivator(
                            LogicalKeyboardKey.keyX,
                            meta: true,
                          ),
                          onSelectedIntent: CopySelectionTextIntent.cut(
                            SelectionChangedCause.toolbar,
                          ),
                        ),
                        PlatformMenuItem(
                          label: '拷贝',
                          shortcut: SingleActivator(
                            LogicalKeyboardKey.keyC,
                            meta: true,
                          ),
                          onSelectedIntent: CopySelectionTextIntent.copy,
                        ),
                        PlatformMenuItem(
                          label: '粘贴',
                          shortcut: SingleActivator(
                            LogicalKeyboardKey.keyV,
                            meta: true,
                          ),
                          onSelectedIntent: PasteTextIntent(
                            SelectionChangedCause.toolbar,
                          ),
                        ),
                        PlatformMenuItem(
                          label: '全选',
                          shortcut: SingleActivator(
                            LogicalKeyboardKey.keyA,
                            meta: true,
                          ),
                          onSelectedIntent: SelectAllTextIntent(
                            SelectionChangedCause.toolbar,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                PlatformMenu(
                  label: '显示',
                  menus: [
                    PlatformMenuItem(
                      label: '搜索组件',
                      shortcut: const SingleActivator(
                        LogicalKeyboardKey.keyF,
                        meta: true,
                      ),
                      onSelected: _focusSearch,
                    ),
                    PlatformMenuItem(
                      label: '重置示例',
                      shortcut: const SingleActivator(
                        LogicalKeyboardKey.keyR,
                        meta: true,
                        shift: true,
                      ),
                      onSelected: _reset,
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
  }

  Widget _shell(BuildContext context) {
    final t = context.apple;
    return CupertinoPageScaffold(
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 840;
            final content = Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 14, 24, 14),
                  decoration: BoxDecoration(
                    color: t.surface,
                    border: Border(bottom: BorderSide(color: t.border)),
                  ),
                  child: Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 20,
                    runSpacing: 12,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!wide) ...[
                            AppleButton(
                              key: const ValueKey('toggle-directory'),
                              semanticLabel: '组件目录',
                              variant: AppleButtonVariant.plain,
                              onPressed: () => setState(() {
                                _showDirectory = !_showDirectory;
                              }),
                              child: const Icon(AppleIcons.sidebar),
                            ),
                            const SizedBox(width: 8),
                          ],
                          Text(
                            '组件',
                            style: t.body.copyWith(color: t.secondaryText),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            child: Icon(
                              AppleIcons.disclosure,
                              size: 10,
                              color: t.secondaryText,
                            ),
                          ),
                          Text(_page.title, style: t.label),
                        ],
                      ),
                      SizedBox(
                        width: 160,
                        child: AppleSelect<GalleryAppearance>(
                          label: '外观',
                          value: _appearance,
                          options: const [
                            AppleSelectOption(GalleryAppearance.system, '跟随系统'),
                            AppleSelectOption(GalleryAppearance.light, '浅色外观'),
                            AppleSelectOption(GalleryAppearance.dark, '深色外观'),
                          ],
                          onChanged: (value) =>
                              setState(() => _appearance = value),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!wide && _showDirectory)
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: constraints.maxHeight * .45,
                    ),
                    child: _directory(context),
                  ),
                Expanded(child: _content(context)),
              ],
            );
            return wide
                ? AppleSplitView(
                    leading: _directory(context),
                    trailing: content,
                    minimumTrailing: 530,
                  )
                : content;
          },
        ),
      ),
    );
  }

  Widget _directory(BuildContext context) {
    final t = context.apple;
    final pages = galleryPages
        .where((page) => page.matches(_search.text))
        .toList();
    return ColoredBox(
      color: t.sidebar,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 22, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: t.accentFill,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      AppleIcons.components,
                      color: t.onAccent,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Apple UI', style: t.label),
                        Text('组件画廊', style: t.caption),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Semantics(
              label: '搜索组件',
              child: CupertinoSearchTextField(
                key: const ValueKey('catalog-search'),
                controller: _search,
                focusNode: _searchFocus,
                placeholder: '搜索组件',
                style: t.body,
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: pages.isEmpty
                  ? Center(
                      child: Text(
                        '没有匹配的组件\n试试“按钮”或“菜单”',
                        textAlign: TextAlign.center,
                        style: t.caption,
                      ),
                    )
                  : ListView(
                      key: const ValueKey('catalog-list'),
                      controller: _directoryScroll,
                      primary: false,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(left: 10, bottom: 8),
                          child: Text('组件目录', style: t.caption),
                        ),
                        for (final page in pages)
                          AppleSidebarItem(
                            key: ValueKey('nav-${page.id}'),
                            label: page.title,
                            icon: page.icon,
                            selected: page.id == _page.id,
                            onPressed: () => setState(() {
                              if (_contentScroll.hasClients) {
                                _contentScroll.jumpTo(0);
                              }
                              _page = page;
                              _showDirectory = false;
                            }),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _content(BuildContext context) {
    final t = context.apple;
    return CupertinoScrollbar(
      controller: _contentScroll,
      child: SingleChildScrollView(
        controller: _contentScroll,
        primary: false,
        key: ValueKey('content-${_page.id}'),
        padding: const EdgeInsets.all(28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(_page.english.toUpperCase(), style: t.eyebrow),
            const SizedBox(height: 6),
            Text(_page.title, style: t.pageTitle),
            const SizedBox(height: 10),
            Text(
              _page.description,
              style: t.body.copyWith(color: t.secondaryText),
            ),
            const SizedBox(height: 24),
            _controls(context),
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.centerLeft,
              child: CupertinoSlidingSegmentedControl<bool>(
                groupValue: _showCode,
                children: const {
                  false: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text('交互预览'),
                  ),
                  true: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text('用法与规范'),
                  ),
                },
                onValueChanged: (v) {
                  if (v != null) setState(() => _showCode = v);
                },
              ),
            ),
            const SizedBox(height: 24),
            if (_showCode)
              _documentation(context)
            else
              LayoutBuilder(
                builder: (context, constraints) {
                  final theme = AppleThemeData(
                    brightness: t.brightness,
                    density: _density,
                    highContrast: t.highContrast,
                  );
                  return Align(
                    alignment: Alignment.topCenter,
                    child: SizedBox(
                      width: _previewWidth == null
                          ? constraints.maxWidth
                          : _previewWidth!
                                .clamp(0, constraints.maxWidth)
                                .toDouble(),
                      child: AppleTheme(
                        data: theme,
                        child: CupertinoTheme(
                          data: theme.cupertino,
                          child: DefaultTextStyle(
                            style: theme.body,
                            child: ComponentDemo(
                              key: ValueKey('${_page.id}-$_revision'),
                              page: _page.id,
                              enabled: _enabled,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            const SizedBox(height: 28),
            Container(height: 1, color: t.border),
            const SizedBox(height: 16),
            Text('基于官方 Cupertino · 以当前 macOS 校验桌面体验', style: t.caption),
          ],
        ),
      ),
    );
  }

  Widget _controls(BuildContext context) {
    final t = context.apple;
    return AppleSurface(
      padding: const EdgeInsets.all(12),
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 160,
            child: AppleSelect<AppleDensity>(
              label: '输入密度',
              value: _density,
              options: const [
                AppleSelectOption(AppleDensity.desktop, '桌面密度'),
                AppleSelectOption(AppleDensity.touch, '触控密度'),
              ],
              onChanged: (value) => setState(() => _density = value),
            ),
          ),
          SizedBox(
            width: 160,
            child: AppleSelect<double>(
              label: '预览宽度',
              value: _previewWidth ?? 0,
              options: const [
                AppleSelectOption(0, '自适应宽度'),
                AppleSelectOption(390, '390 pt · 手机'),
                AppleSelectOption(834, '834 pt · 平板'),
              ],
              onChanged: (value) =>
                  setState(() => _previewWidth = value == 0 ? null : value),
            ),
          ),
          SizedBox(
            width: 160,
            child: AppleSelect<double>(
              label: '文字缩放',
              value: _textScale,
              options: const [
                AppleSelectOption(1, '文字 100%'),
                AppleSelectOption(1.3, '文字 130%'),
                AppleSelectOption(2, '文字 200%'),
              ],
              onChanged: (value) => setState(() => _textScale = value),
            ),
          ),
          AppleMenuButton(
            label: '辅助功能',
            actions: [
              AppleMenuAction(
                '${_highContrast ? '关闭' : '开启'}增强对比度',
                onPressed: () => setState(() => _highContrast = !_highContrast),
              ),
              AppleMenuAction(
                '${_reduceMotion ? '关闭' : '开启'}减少动效',
                onPressed: () => setState(() => _reduceMotion = !_reduceMotion),
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('启用', style: t.body),
              const SizedBox(width: 4),
              Semantics(
                label: '启用示例控件',
                child: CupertinoSwitch(
                  key: const ValueKey('enable-controls'),
                  value: _enabled,
                  onChanged: (v) => setState(() => _enabled = v),
                ),
              ),
            ],
          ),
          AppleButton(
            key: const ValueKey('reset-demo'),
            semanticLabel: '重置示例',
            variant: AppleButtonVariant.plain,
            onPressed: _reset,
            child: const Icon(AppleIcons.reset),
          ),
        ],
      ),
    );
  }

  Widget _documentation(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text('使用建议', style: context.apple.sectionTitle),
      const SizedBox(height: 10),
      Text(_page.guidance, style: context.apple.body),
      const SizedBox(height: 24),
      AppleSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: Text('Dart', style: context.apple.caption)),
                AppleButton(
                  semanticLabel: '复制代码',
                  variant: AppleButtonVariant.plain,
                  onPressed: () =>
                      Clipboard.setData(ClipboardData(text: _page.code)),
                  child: const Icon(AppleIcons.copy),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SelectableRegion(
              selectionControls: cupertinoDesktopTextSelectionControls,
              child: Text(_page.code, style: context.apple.code),
            ),
          ],
        ),
      ),
      const SizedBox(height: 20),
      Text('状态检查：正常、悬停、按压、键盘焦点、禁用、选中、浅色与深色。', style: context.apple.caption),
    ],
  );
}
