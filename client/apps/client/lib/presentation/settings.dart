import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

import 'preferences.dart';
import 'subapp_boundary.dart';
import 'workspace/controller.dart';
import 'workspace/controls.dart';

class SettingsApp extends StatefulWidget {
  const SettingsApp({
    super.key,
    required this.workspace,
    required this.preferences,
  });
  final WorkspaceController workspace;
  final PreferencesController preferences;
  @override
  State<SettingsApp> createState() => _SettingsAppState();
}

class _SettingsAppState extends State<SettingsApp> {
  final _scroll = ScrollController();
  void _update(ClientPreferences value) {
    if (!mounted) return;
    final scope = context.getInheritedWidgetOfExactType<SubappScope>()!;
    scope.run(() => widget.preferences.update(value));
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final wide = constraints.maxWidth >= 680;
      final w = widget.workspace;
      final theme = context.apple;
      final directory = Padding(
        padding: const EdgeInsets.all(AppleSpacing.medium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppleSpacing.small),
              child: Text(
                wide ? '偏好设置' : '设置',
                style: wide ? theme.caption : theme.pageTitle,
              ),
            ),
            const SizedBox(height: AppleSpacing.medium),
            for (final category in SettingsCategory.values)
              AppleSidebarItem(
                key: ValueKey('category-${category.name}'),
                label: category.label,
                icon: categoryIcon(category),
                selected: wide && category == w.category,
                onPressed: () => w.selectCategory(category),
              ),
          ],
        ),
      );
      if (!wide && !w.settingsDetail) {
        return SingleChildScrollView(child: directory);
      }
      final detail = ListView(
        key: const ValueKey('settings-scroll'),
        controller: _scroll,
        padding: const EdgeInsets.all(AppleSpacing.xxlarge),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: AppleSpacing.small,
                    children: [
                      if (!wide)
                        WorkspaceIconButton(
                          key: const ValueKey('settings-back'),
                          label: '返回设置列表',
                          icon: AppleIcons.back,
                          onPressed: w.settingsBack,
                        ),
                      Semantics(
                        header: true,
                        child: Text(w.category.label, style: theme.pageTitle),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppleSpacing.xlarge),
                  KeyedSubtree(
                    key: ValueKey('settings-page-${w.category.name}'),
                    child: _page(context),
                  ),
                  if (widget.preferences.notice != null) ...[
                    const SizedBox(height: AppleSpacing.xlarge),
                    AppleStatusMessage(
                      kind: AppleStatusKind.warning,
                      message: widget.preferences.notice!,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      );
      return Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (wide)
            Container(
              width: 228,
              color: theme.sidebar,
              child: SingleChildScrollView(child: directory),
            ),
          Expanded(child: detail),
        ],
      );
    },
  );

  Widget _choices(BuildContext context, List<Widget> choices) => LayoutBuilder(
    builder: (context, constraints) {
      final textScale = MediaQuery.textScalerOf(context).scale(14) / 14;
      final columns = constraints.maxWidth >= 520 * textScale.clamp(1, 1.5)
          ? 3
          : constraints.maxWidth >= 340 * textScale
          ? 2
          : 1;
      final width = (constraints.maxWidth - (columns - 1) * 12) / columns;
      return Wrap(
        spacing: 12,
        runSpacing: 16,
        children: [
          for (final choice in choices) SizedBox(width: width, child: choice),
        ],
      );
    },
  );

  Widget _page(BuildContext context) {
    final p = widget.preferences;
    final theme = context.apple;
    return switch (widget.workspace.category) {
      SettingsCategory.appearance => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RadioGroup<ClientAppearance>(
            groupValue: p.value.appearance,
            onChanged: (value) {
              if (value != null) _update(p.value.copyWith(appearance: value));
            },
            child: _choices(context, [
              for (final item in ClientAppearance.values)
                _SettingChoice(
                  key: ValueKey('appearance-${item.name}'),
                  label: switch (item) {
                    ClientAppearance.system => '跟随系统',
                    ClientAppearance.light => '浅色',
                    ClientAppearance.dark => '深色',
                  },
                  selected: p.value.appearance == item,
                  onPressed: () => _update(p.value.copyWith(appearance: item)),
                  indicator: CupertinoRadio<ClientAppearance>(value: item),
                  preview: _AppearancePreview(
                    brightness: switch (item) {
                      ClientAppearance.system => theme.brightness,
                      ClientAppearance.light => Brightness.light,
                      ClientAppearance.dark => Brightness.dark,
                    },
                  ),
                ),
            ]),
          ),
          const SizedBox(height: AppleSpacing.large),
          Text('外观即时应用到整个工作区。跟随系统时自动同步 macOS 外观。', style: theme.supporting),
        ],
      ),
      SettingsCategory.wallpaper => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _choices(context, [
            for (final item in ClientWallpaper.values)
              _SettingChoice(
                key: ValueKey('wallpaper-${item.name}'),
                label: switch (item) {
                  ClientWallpaper.coast => '海岸',
                  ClientWallpaper.dusk => '暮色',
                  ClientWallpaper.forest => '林间',
                },
                selected: p.value.wallpaper == item,
                onPressed: () => _update(p.value.copyWith(wallpaper: item)),
                preview: WorkspaceWallpaper(
                  name: item.name,
                  child: const SizedBox.expand(),
                ),
              ),
          ]),
          const SizedBox(height: AppleSpacing.large),
          Text('壁纸即时应用。返回桌面即可查看。', style: theme.supporting),
        ],
      ),
      SettingsCategory.motion => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppleSurface(
            child: AppleFormRow(
              label: '减少动态效果',
              description: '以即时状态变化代替位移和缩放。',
              child: Semantics(
                label: '减少动态效果',
                child: CupertinoSwitch(
                  key: const ValueKey('reduce-motion'),
                  value: p.value.reduceMotion,
                  onChanged: (value) =>
                      _update(p.value.copyWith(reduceMotion: value)),
                ),
              ),
            ),
          ),
          const SizedBox(height: AppleSpacing.medium),
          Text('系统开启减少动态效果时，同样遵循系统偏好。', style: theme.supporting),
        ],
      ),
    };
  }
}

class _SettingChoice extends StatelessWidget {
  const _SettingChoice({
    super.key,
    required this.label,
    required this.selected,
    required this.onPressed,
    required this.preview,
    this.indicator,
  });
  final String label;
  final bool selected;
  final VoidCallback onPressed;
  final Widget preview;
  final Widget? indicator;
  @override
  Widget build(BuildContext context) {
    final theme = context.apple;
    return Semantics(
      selected: selected,
      child: AppleButton(
        variant: AppleButtonVariant.plain,
        padding: const EdgeInsets.all(6),
        onPressed: onPressed,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: ShapeDecoration(
                shape: RoundedSuperellipseBorder(
                  borderRadius: BorderRadius.circular(15),
                  side: BorderSide(
                    color: selected ? theme.accent : theme.border,
                    width: selected ? 2 : 1,
                  ),
                ),
              ),
              child: ClipRSuperellipse(
                borderRadius: BorderRadius.circular(11),
                child: AspectRatio(aspectRatio: 1.6, child: preview),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (indicator != null)
                  indicator!
                else
                  Icon(
                    selected ? AppleIcons.success : AppleIcons.wallpaper,
                    size: 16,
                    color: selected ? theme.accent : theme.secondaryText,
                  ),
                const SizedBox(width: 6),
                Flexible(child: Text(label, style: theme.body)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AppearancePreview extends StatelessWidget {
  const _AppearancePreview({required this.brightness});
  final Brightness brightness;
  @override
  Widget build(BuildContext context) {
    final theme = AppleThemeData(brightness: brightness);
    return ColoredBox(
      color: theme.background,
      child: Column(
        children: [
          Container(
            height: 18,
            color: theme.surface,
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.only(left: 8),
            child: Row(
              children: [
                for (var i = 0; i < 3; i++)
                  Padding(
                    padding: const EdgeInsets.only(right: 3),
                    child: Container(
                      width: 4,
                      height: 4,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: theme.secondaryText.withValues(alpha: 0.45),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: ColoredBox(
                    color: theme.sidebar,
                    child: Padding(
                      padding: const EdgeInsets.all(7),
                      child: Column(
                        children: [
                          Container(
                            height: 9,
                            decoration: BoxDecoration(
                              color: theme.selected,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                          const SizedBox(height: 7),
                          Container(height: 4, color: theme.border),
                          const SizedBox(height: 7),
                          Container(height: 4, color: theme.border),
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  flex: 7,
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          height: 6,
                          margin: const EdgeInsets.only(right: 18),
                          decoration: BoxDecoration(
                            color: theme.text.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(height: 9),
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: theme.surface,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: theme.border.withValues(alpha: 0.5),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
