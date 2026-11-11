import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

class ComponentDemo extends StatefulWidget {
  const ComponentDemo({super.key, required this.page, required this.enabled});

  final String page;
  final bool enabled;

  @override
  State<ComponentDemo> createState() => _ComponentDemoState();
}

class _ComponentDemoState extends State<ComponentDemo> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _notes = TextEditingController();
  bool _validated = false;
  bool _switch = true;
  bool _checkbox = true;
  String _radio = 'automatic';
  String _segment = '全部';
  String? _sort;
  String _navigation = '通用';
  double _slider = 60;
  String _status = '等待操作';

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _report(String value) {
    if (mounted) setState(() => _status = value);
  }

  Widget _block(String title, Widget child, {String? note}) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: context.apple.label),
        if (note != null) ...[
          const SizedBox(height: 4),
          Text(note, style: context.apple.caption),
        ],
        const SizedBox(height: 12),
        AppleSurface(child: child),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final content = switch (widget.page) {
      'foundations' => _foundations(),
      'buttons' => _buttons(),
      'inputs' => _inputs(),
      'selection' => _selection(),
      'navigation' => _navigationDemo(),
      'menus' => _menus(),
      'dialogs' => _dialogs(),
      'feedback' => _feedback(),
      _ => throw StateError('Unknown gallery page: ${widget.page}'),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        content,
        if (widget.page != 'foundations')
          Semantics(
            liveRegion: true,
            child: Text(
              '操作结果：$_status',
              key: const ValueKey('demo-status'),
              style: context.apple.caption,
            ),
          ),
      ],
    );
  }

  Widget _foundations() {
    final t = context.apple;
    final colors = {
      '背景': t.background,
      '表面': t.surface,
      '侧栏': t.sidebar,
      '主要文字': t.text,
      '次要文字': t.secondaryText,
      '强调': t.accent,
      '选中': t.selected,
      '危险': t.danger,
      '警告': t.warning,
      '成功': t.success,
      '信息': t.information,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _block(
          '语义颜色',
          Wrap(
            spacing: 20,
            runSpacing: 20,
            children: [
              for (final entry in colors.entries)
                SizedBox(
                  width: 112,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 58,
                        decoration: BoxDecoration(
                          color: entry.value,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: t.border),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(entry.key, style: t.body),
                      Text(
                        '#${entry.value.toARGB32().toRadixString(16).substring(2).toUpperCase()}',
                        style: t.caption,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        _block(
          '排版层级',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('清晰，有序，专注内容。', style: t.sectionTitle),
              const SizedBox(height: 12),
              Text('正文用于阅读和操作，保持自然的中文节奏。', style: t.body),
              const SizedBox(height: 8),
              Text('辅助说明 · Secondary information', style: t.caption),
            ],
          ),
        ),
        _block(
          '尺寸与形状',
          Wrap(
            spacing: 28,
            runSpacing: 12,
            children: [
              Text('正文 ${t.bodySize.toInt()} pt', style: t.body),
              Text('控件最小高度 ${t.controlHeight.toInt()} pt', style: t.body),
              Text('控件圆角 ${t.controlRadius.toInt()} pt', style: t.body),
              Text('容器圆角 ${t.surfaceRadius.toInt()} pt', style: t.body),
            ],
          ),
          note: '这里的 pt 表示设计逻辑尺度；Flutter 使用逻辑像素，实际高度会随文字缩放增长。',
        ),
        _block(
          '图标',
          Wrap(
            spacing: 24,
            runSpacing: 16,
            children: [
              for (final icon in [
                AppleIcons.home,
                AppleIcons.folder,
                AppleIcons.document,
                AppleIcons.search,
                AppleIcons.person,
                AppleIcons.settings,
              ])
                Icon(icon, size: t.iconSize + 6, color: t.secondaryText),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buttons() => Column(
    children: [
      _block(
        '操作层级',
        Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            for (final (label, variant) in [
              ('主要操作', AppleButtonVariant.primary),
              ('次要操作', AppleButtonVariant.secondary),
              ('文字操作', AppleButtonVariant.plain),
              ('危险操作', AppleButtonVariant.destructive),
            ])
              AppleButton(
                variant: variant,
                onPressed: widget.enabled ? () => _report('已点按$label') : null,
                child: Text(label),
              ),
          ],
        ),
      ),
      _block(
        '图标与状态',
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AppleButton(
              semanticLabel: '添加项目',
              onPressed: widget.enabled ? () => _report('已添加项目') : null,
              child: const Icon(AppleIcons.add),
            ),
            AppleButton(
              onPressed: widget.enabled ? () => _report('已收藏') : null,
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(AppleIcons.favorite),
                  SizedBox(width: 6),
                  Text('收藏'),
                ],
              ),
            ),
            const AppleButton(onPressed: null, child: Text('不可用')),
          ],
        ),
        note: '使用 Tab 移动焦点，Space 激活按钮。',
      ),
    ],
  );

  Widget _inputs() {
    final nameError = _validated && _name.text.trim().isEmpty ? '请输入名称。' : null;
    final emailError =
        _validated &&
            !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email.text)
        ? '请输入有效的邮箱地址，例如 name@example.com。'
        : null;
    return Column(
      children: [
        _block(
          '基本输入',
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('名称', style: context.apple.body),
              const SizedBox(height: 6),
              AppleTextField(
                key: const ValueKey('name-field'),
                label: '名称',
                controller: _name,
                enabled: widget.enabled,
                placeholder: '输入名称',
                error: nameError,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              Text('邮箱地址', style: context.apple.body),
              const SizedBox(height: 6),
              AppleTextField(
                key: const ValueKey('email-field'),
                label: '邮箱地址',
                controller: _email,
                enabled: widget.enabled,
                placeholder: 'name@example.com',
                error: emailError,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerLeft,
                child: AppleButton(
                  key: const ValueKey('validate-form'),
                  variant: AppleButtonVariant.primary,
                  onPressed: widget.enabled
                      ? () {
                          setState(() => _validated = true);
                          final valid =
                              _name.text.trim().isNotEmpty &&
                              RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                  .hasMatch(_email.text);
                          _report(valid ? '表单验证通过' : '请修正表单中的错误');
                        }
                      : null,
                  child: const Text('验证表单'),
                ),
              ),
            ],
          ),
        ),
        _block(
          '更多输入',
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('密码', style: context.apple.body),
              const SizedBox(height: 6),
              AppleTextField(
                label: '密码',
                placeholder: '输入示例密码',
                obscureText: true,
                enabled: widget.enabled,
              ),
              const SizedBox(height: 16),
              Text('备注', style: context.apple.body),
              const SizedBox(height: 6),
              AppleTextField(
                label: '备注',
                controller: _notes,
                placeholder: '支持中文与多行内容',
                maxLines: 3,
                enabled: widget.enabled,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _selection() => Column(
    children: [
      _block(
        '下拉选择',
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('排序方式', style: context.apple.label),
            const SizedBox(height: AppleSpacing.small),
            AppleSelect<String>(
              key: const ValueKey('demo-select'),
              label: '排序方式',
              value: _sort,
              placeholder: '选择排序方式',
              options: const [
                AppleSelectOption('name', '按名称'),
                AppleSelectOption('modified', '按修改时间'),
                AppleSelectOption('type', '按类型'),
                AppleSelectOption('unavailable', '暂不可用', enabled: false),
              ],
              onChanged: widget.enabled
                  ? (value) {
                      setState(() => _sort = value);
                      _report('排序方式已更新：$value');
                    }
                  : null,
            ),
          ],
        ),
      ),
      _block(
        '分组选项',
        Column(
          children: [
            AppleFormRow(
              label: '启用提醒',
              description: '更改立即生效',
              child: Semantics(
                label: '启用提醒',
                child: CupertinoSwitch(
                  key: const ValueKey('demo-switch'),
                  value: _switch,
                  onChanged: widget.enabled
                      ? (v) {
                          setState(() => _switch = v);
                          _report(v ? '提醒已开启' : '提醒已关闭');
                        }
                      : null,
                ),
              ),
            ),
            Container(height: 1, color: context.apple.border),
            AppleFormRow(
              label: '显示详细信息',
              child: Semantics(
                label: '显示详细信息',
                child: CupertinoCheckbox(
                  value: _checkbox,
                  onChanged: widget.enabled
                      ? (v) => setState(() => _checkbox = v!)
                      : null,
                ),
              ),
            ),
          ],
        ),
      ),
      _block(
        '单项选择',
        RadioGroup<String>(
          groupValue: _radio,
          onChanged: (v) {
            if (widget.enabled && v != null) setState(() => _radio = v);
          },
          child: Wrap(
            spacing: 24,
            runSpacing: 12,
            children: [
              for (final (value, label) in [
                ('automatic', '自动'),
                ('manual', '手动'),
              ])
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Semantics(
                      label: label,
                      child: CupertinoRadio<String>(
                        value: value,
                        enabled: widget.enabled,
                      ),
                    ),
                    Text(label, style: context.apple.body),
                  ],
                ),
            ],
          ),
        ),
      ),
      _block(
        '分段选择',
        CupertinoSlidingSegmentedControl<String>(
          groupValue: _segment,
          disabledChildren: widget.enabled
              ? const {}
              : const {'全部', '最近', '收藏'},
          children: {
            for (final label in ['全部', '最近', '收藏'])
              label: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                child: Text(label),
              ),
          },
          onValueChanged: (v) {
            if (v != null) {
              setState(() => _segment = v);
              _report('已选择：$v');
            }
          },
        ),
      ),
      _block(
        '连续数值',
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('音量 ${_slider.round()}%', style: context.apple.body),
            Semantics(
              label: '音量',
              child: CupertinoSlider(
                value: _slider,
                min: 0,
                max: 100,
                onChanged: widget.enabled
                    ? (v) => setState(() => _slider = v)
                    : null,
              ),
            ),
          ],
        ),
      ),
    ],
  );

  Widget _navigationDemo() {
    final t = context.apple;
    final navigation = Column(
      children: [
        for (final (label, icon) in [
          ('通用', AppleIcons.settings),
          ('外观', AppleIcons.appearance),
          ('辅助功能', AppleIcons.accessibility),
        ])
          AppleSidebarItem(
            label: label,
            icon: icon,
            selected: _navigation == label,
            onPressed: widget.enabled
                ? () => setState(() => _navigation = label)
                : null,
          ),
      ],
    );
    final detail = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_navigation, style: t.sectionTitle),
          const SizedBox(height: 12),
          Text('选中项目的内容显示在这里。', style: t.body),
        ],
      ),
    );
    return Column(
      children: [
        _block(
          '侧栏与分栏',
          LayoutBuilder(
            builder: (context, constraints) => constraints.maxWidth < 430
                ? Column(children: [navigation, detail])
                : SizedBox(
                    height: 200,
                    child: AppleSplitView(
                      initialWidth: 160,
                      minimumLeading: 150,
                      minimumTrailing: 200,
                      leading: navigation,
                      trailing: detail,
                    ),
                  ),
          ),
        ),
        _block(
          '分组列表',
          Column(
            children: [
              AppleFormRow(
                label: '外观',
                description: '跟随系统或选择固定主题',
                child: Text(
                  '自动',
                  style: t.body.copyWith(color: t.secondaryText),
                ),
              ),
              Container(height: 1, color: t.border),
              AppleFormRow(
                label: '文字大小',
                child: Text(
                  '标准',
                  style: t.body.copyWith(color: t.secondaryText),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _menus() => _block(
    '关联操作',
    Wrap(
      spacing: 16,
      runSpacing: 16,
      children: [
        AppleMenuButton(
          label: '更多操作',
          enabled: widget.enabled,
          actions: [
            for (final label in ['复制链接', '导出内容'])
              AppleMenuAction(
                label,
                onPressed: widget.enabled ? () => _report('已选择：$label') : null,
              ),
          ],
        ),
        AppleMenuButton(
          label: '右键或点击',
          enabled: widget.enabled,
          contextMenu: true,
          actions: [
            AppleMenuAction(
              '复制',
              icon: AppleIcons.copy,
              onPressed: widget.enabled ? () => _report('已复制示例') : null,
            ),
            AppleMenuAction(
              '重命名',
              icon: AppleIcons.rename,
              onPressed: widget.enabled ? () => _report('已选择重命名') : null,
            ),
            const AppleMenuAction('暂不可用'),
            AppleMenuAction(
              '移除示例',
              icon: AppleIcons.delete,
              destructive: true,
              onPressed: widget.enabled
                  ? () => _report('示例已移除，可以通过重置恢复')
                  : null,
            ),
          ],
        ),
        ApplePopoverButton(
          label: '了解 Popover',
          enabled: widget.enabled,
          builder: (routeContext) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('关联信息', style: routeContext.apple.sectionTitle),
              const SizedBox(height: 8),
              Text(
                '浮层与触发位置保持关联。点击外部或按 Escape 关闭。',
                style: routeContext.apple.body,
              ),
              const SizedBox(height: 16),
              AppleButton(
                autofocus: true,
                onPressed: () => Navigator.pop(routeContext),
                child: const Text('知道了'),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Future<void> _confirm() async {
    final result = await showAppleConfirmation(
      context: context,
      title: '应用示例更改？',
      message: '这只会更新当前组件演示的状态。',
      confirmLabel: '应用更改',
    );
    _report(result == true ? '已应用更改' : '已取消更改');
  }

  Future<void> _sheet() async {
    final t = context.apple;
    Widget content(BuildContext routeContext) => AppleTheme(
      data: t,
      child: AppleSurface(
        child: CallbackShortcuts(
          bindings: {
            const SingleActivator(LogicalKeyboardKey.escape): () =>
                Navigator.pop(routeContext),
          },
          child: FocusScope(
            autofocus: true,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('编辑示例', style: t.sectionTitle),
                const SizedBox(height: 12),
                Text('面板用于完成一个局部任务，并保留与当前窗口的关联。', style: t.body),
                const SizedBox(height: 20),
                const AppleTextField(label: '示例标题', placeholder: '输入示例标题'),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    AppleButton(
                      onPressed: () => Navigator.pop(routeContext),
                      child: const Text('取消'),
                    ),
                    AppleButton(
                      variant: AppleButtonVariant.primary,
                      onPressed: () {
                        Navigator.pop(routeContext);
                        _report('已完成面板编辑');
                      },
                      child: const Text('完成'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (t.isTouch) {
      await showCupertinoSheet<void>(
        context: context,
        scrollableBuilder: (routeContext, scrollController) =>
            SingleChildScrollView(
              controller: scrollController,
              child: content(routeContext),
            ),
      );
      return;
    }
    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: t.scrim,
      transitionDuration: Duration.zero,
      pageBuilder: (routeContext, animation, secondaryAnimation) => SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: SingleChildScrollView(child: content(routeContext)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _dialogs() => _block(
    '明确的决策与局部任务',
    Wrap(
      spacing: 16,
      runSpacing: 16,
      children: [
        AppleButton(
          key: const ValueKey('open-confirm'),
          onPressed: widget.enabled ? _confirm : null,
          child: const Text('打开确认对话框'),
        ),
        AppleButton(
          onPressed: widget.enabled ? _sheet : null,
          child: const Text('打开编辑面板'),
        ),
      ],
    ),
  );

  Widget _feedback() => Column(
    children: [
      _block(
        '进行中的任务',
        Row(
          children: [
            CupertinoActivityIndicator(
              animating: !MediaQuery.disableAnimationsOf(context),
            ),
            const SizedBox(width: 12),
            Text('正在加载内容…', style: context.apple.body),
          ],
        ),
      ),
      _block(
        '空状态',
        Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Icon(
                  AppleIcons.empty,
                  size: 36,
                  color: context.apple.secondaryText,
                ),
                const SizedBox(height: 12),
                Text('还没有项目', style: context.apple.sectionTitle),
                const SizedBox(height: 6),
                Text('添加一个示例，开始体验。', style: context.apple.body),
                const SizedBox(height: 16),
                AppleButton(
                  variant: AppleButtonVariant.primary,
                  onPressed: widget.enabled ? () => _report('已创建示例项目') : null,
                  child: const Text('添加示例'),
                ),
              ],
            ),
          ),
        ),
      ),
      for (final (kind, title, message, description) in [
        (AppleStatusKind.warning, '警告', '有尚未保存的更改', '离开页面前请保存当前内容。'),
        (AppleStatusKind.error, '错误与恢复', '示例任务未能完成', '可以重试，或稍后继续。'),
        (AppleStatusKind.success, '成功', '更改已保存', '当前内容已更新。'),
        (AppleStatusKind.information, '信息', '所有更改仅影响当前演示', '使用重置可以恢复初始状态。'),
      ])
        _block(
          title,
          AppleStatusMessage(
            key: ValueKey('status-${kind.name}'),
            kind: kind,
            message: message,
            description: description,
            liveRegion: false,
            actionLabel: kind == AppleStatusKind.error ? '重试' : null,
            onAction: kind == AppleStatusKind.error && widget.enabled
                ? () => _report('重试成功')
                : null,
          ),
        ),
    ],
  );
}
