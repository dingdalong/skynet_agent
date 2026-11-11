import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

class GalleryPage {
  const GalleryPage(
    this.id,
    this.title,
    this.english,
    this.icon,
    this.description,
    this.code,
    this.guidance,
  );

  final String id;
  final String title;
  final String english;
  final IconData icon;
  final String description;
  final String code;
  final String guidance;

  bool matches(String query) => '$title $english $description'
      .toLowerCase()
      .contains(query.toLowerCase().trim());
}

const galleryPages = <GalleryPage>[
  GalleryPage(
    'foundations',
    '设计基础',
    'Foundations',
    AppleIcons.foundations,
    '统一的语义颜色、排版与尺寸，让桌面和触控界面拥有连贯的 Apple 风格。',
    '''final theme = context.apple;
Text('内容标题', style: theme.sectionTitle);
AppleSurface(child: Text('内容', style: theme.body));''',
    '颜色按用途命名。macOS 使用系统字体；桌面与触控共享语义，采用各自的密度。以下数值为项目约定。',
  ),
  GalleryPage(
    'buttons',
    '按钮与操作',
    'Buttons',
    AppleIcons.buttons,
    '用明确的层级表达主要、次要与危险操作，并提供完整的键盘焦点和状态反馈。',
    '''AppleButton(
  variant: AppleButtonVariant.primary,
  onPressed: save,
  child: const Text('保存'),
);''',
    '一个区域突出一个主要操作。图标按钮必须有可访问名称；禁用状态同时保留清晰的文字与形状。',
  ),
  GalleryPage(
    'inputs',
    '输入与表单',
    'Text fields',
    AppleIcons.textInput,
    '清晰的输入边界、持久标签与就近错误提示，支持中文编辑、密码和多行内容。',
    '''AppleTextField(
  label: '名称',
  controller: nameController,
  placeholder: '输入名称',
  error: validationError,
);''',
    '占位文字不能代替标签。输入错误提供可执行的说明；主题、密度与文字缩放变化应保留编辑内容。',
  ),
  GalleryPage(
    'selection',
    '选择控件',
    'Selection',
    AppleIcons.selection,
    '开关用于即时生效的选项，单选与分段选择表达互斥状态，滑块表达连续数值。',
    '''AppleSelect<String>(
  label: '排序方式',
  value: sort,
  options: const [
    AppleSelectOption('name', '按名称'),
    AppleSelectOption('modified', '按修改时间'),
  ],
  onChanged: updateSort,
);''',
    '不要只依赖颜色表达状态。控件关联可读标签，键盘可以完成选择；触控模式保留足够的命中区域。',
  ),
  GalleryPage(
    'navigation',
    '导航与布局',
    'Navigation',
    AppleIcons.sidebar,
    '侧栏、工具栏和分组列表组织内容；分隔条同时支持拖动、方向键和辅助功能操作。',
    '''AppleSplitView(
  leading: navigation,
  trailing: content,
  minimumLeading: 150,
  minimumTrailing: 200,
);''',
    '布局根据实际可用空间调整。窄窗口保留可见导航入口；选中态、焦点态和悬停态分别表达。',
  ),
  GalleryPage(
    'menus',
    '菜单与浮层',
    'Menus & popovers',
    AppleIcons.moreActions,
    '菜单用于短操作列表，Popover 用于与触发位置关联的辅助信息。支持鼠标右键和键盘。',
    '''AppleMenuButton(
  label: '更多操作',
  contextMenu: true,
  actions: [AppleMenuAction('复制', onPressed: copy)],
);''',
    '方向键遍历菜单，Enter 执行，Escape 关闭。关闭后焦点回到触发位置；危险操作具有明确文字。',
  ),
  GalleryPage(
    'dialogs',
    '对话框与面板',
    'Dialogs & sheets',
    AppleIcons.dialogs,
    '需要用户决策时使用简短对话框，较完整的局部任务使用面板，并提供明确的取消入口。',
    '''showAppleConfirmation(
  context: context,
  title: '继续操作？',
  message: '更改只影响当前示例。',
  confirmLabel: '继续',
);''',
    '弹层内焦点形成闭环。Escape 取消，安全的默认操作可以使用 Enter；危险操作不设为默认确认。',
  ),
  GalleryPage(
    'feedback',
    '反馈与状态',
    'Feedback',
    AppleIcons.information,
    '加载、空状态与错误都说明当前发生了什么，并在需要时提供恢复操作。',
    '''AppleStatusMessage(
  kind: AppleStatusKind.error,
  message: '加载失败',
  description: '请检查网络后重试。',
  actionLabel: '重试',
  onAction: reload,
);''',
    '状态同时通过图形与文字表达。减少动效时保持即时反馈；空状态提供有意义的下一步。',
  ),
];
