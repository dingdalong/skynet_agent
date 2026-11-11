import 'dart:math' as math;

import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter/services.dart';

import '../preferences.dart';
import '../settings.dart';
import '../subapp_boundary.dart';
import '../../runtime/client_runtime.dart';
import 'controller.dart';
import 'controls.dart';
import 'desktop.dart';
import 'motion.dart';
import 'overview.dart';

class Workspace extends StatefulWidget {
  const Workspace({
    super.key,
    required this.controller,
    required this.runtime,
    required this.preferences,
  });
  final WorkspaceController controller;
  final ClientRuntime runtime;
  final PreferencesController preferences;
  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  final _root = GlobalKey();
  final _homeFocus = FocusNode(debugLabel: 'Desktop launcher');
  final _overviewHomeFocus = FocusNode(debugLabel: 'Overview home');
  final _dividerFocus = FocusNode(debugLabel: 'Workspace divider');
  final _appFocus = {
    for (final pane in WorkspacePane.values.where((pane) => pane.isApp))
      pane: FocusNode(debugLabel: '${pane.name} home'),
  };
  final _gripFocus = {
    for (final pane in WorkspacePane.values.where((pane) => pane.isApp))
      pane: FocusNode(debugLabel: '${pane.name} layout'),
  };
  final _cardFocus = {
    for (final pane in WorkspacePane.values)
      pane: FocusNode(debugLabel: '${pane.name} card'),
  };
  final _origins = <WorkspacePane, Rect>{};
  late WorkspaceScreen _lastScreen = widget.controller.screen;
  late WorkspacePane _lastActive = widget.controller.active;
  late final AnimationController _dismiss =
      AnimationController(vsync: this, duration: AppleMotion.dismiss)
        ..addListener(() {
          if (mounted) setState(() {});
        });
  WorkspacePane? _closed;
  Rect? _closedRect;
  SettingsCategory _closedCategory = SettingsCategory.appearance;
  int? _pointer;
  Size? _pointerSize;
  String? _dragKind;
  WorkspacePane? _dragPane;
  Offset _start = Offset.zero;
  double _cardDistance = 0;
  bool _moved = false;
  bool _returningCard = false;

  WorkspaceController get w => widget.controller;
  @override
  void initState() {
    super.initState();
    w.addListener(_changed);
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _homeFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    w.removeListener(_changed);
    WidgetsBinding.instance.removeObserver(this);
    for (final node in [
      _homeFocus,
      _overviewHomeFocus,
      _dividerFocus,
      ..._appFocus.values,
      ..._gripFocus.values,
      ..._cardFocus.values,
    ]) {
      node.dispose();
    }
    _dismiss.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _pointer != null) _cancel();
  }

  void _changed() {
    final navigation =
        _lastScreen != w.screen ||
        (_lastActive != w.active &&
            (w.transition == WorkspaceTransition.launch ||
                w.transition == WorkspaceTransition.resume));
    _lastScreen = w.screen;
    _lastActive = w.active;
    if (mounted) setState(() {});
    if (navigation) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        switch (w.screen) {
          case WorkspaceScreen.home:
            _homeFocus.requestFocus();
          case WorkspaceScreen.app:
            _appFocus[w.active]!.requestFocus();
          case WorkspaceScreen.overview:
            (w.groups.isEmpty
                    ? _overviewHomeFocus
                    : _cardFocus[w.groups.first.first]!)
                .requestFocus();
        }
      });
    }
  }

  Offset _local(Offset global) =>
      (_root.currentContext!.findRenderObject()! as RenderBox).globalToLocal(
        global,
      );
  void _syncSize() {
    final box = _root.currentContext?.findRenderObject() as RenderBox?;
    if (box != null && box.hasSize) {
      w.resize(box.size);
      if (_pointer != null && _pointerSize != box.size) _cancel();
    }
  }

  void _begin(PointerDownEvent event, String kind, WorkspacePane? pane) {
    if (event.buttons != 1 || _pointer != null) return;
    _syncSize();
    if (kind != 'card' && !w.canSplit) return;
    _pointer = event.pointer;
    _pointerSize = w.size;
    _dragKind = kind;
    _dragPane = pane;
    _start = _local(event.position);
    _moved = false;
    _returningCard = false;
    _cardDistance = 0;
    if (kind != 'card') w.beginDrag();
    if (kind == 'app') _gripFocus[pane]!.requestFocus();
    if (kind == 'divider') _dividerFocus.requestFocus();
  }

  void _move(PointerMoveEvent event) {
    if (_pointer != event.pointer) return;
    _syncSize();
    if (_pointer != event.pointer) return;
    if (_dragKind != 'card' && !w.dragging) {
      _clearPointer();
      return;
    }
    final position = _local(event.position);
    final delta = position - _start;
    if (delta.distance > 8) _moved = true;
    switch (_dragKind) {
      case 'app':
        w.previewApp(_dragPane!, delta.dx, delta.dy, position);
      case 'divider':
        w.previewDivider(position.dx);
      case 'card':
        setState(() {
          _cardDistance = -delta.dy > delta.dx.abs()
              ? math.max(0, -delta.dy)
              : 0;
        });
    }
  }

  void _end(PointerUpEvent event) {
    if (_pointer != event.pointer) return;
    _syncSize();
    if (_pointer != event.pointer) return;
    final pane = _dragPane;
    final kind = _dragKind;
    if (kind == 'card') {
      if (_cardDistance >= 64 && _moved) {
        final geometry = OverviewGeometry(w.size, w.groups, w.ratio);
        _closed = pane;
        _closedCategory = w.category;
        _closedRect = geometry.panes[pane]!.translate(0, -_cardDistance);
        if (!MediaQuery.disableAnimationsOf(context)) _dismiss.forward(from: 0);
        w.close(pane!);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            (w.groups.isEmpty
                    ? _overviewHomeFocus
                    : _cardFocus[w.groups.first.first]!)
                .requestFocus();
          }
        });
        _clearPointer();
      } else {
        setState(() {
          _pointer = null;
          _cardDistance = 0;
          _returningCard = true;
        });
      }
    } else {
      w.finishDrag();
      _clearPointer();
      if (kind == 'app' && pane != null) _gripFocus[pane]!.requestFocus();
    }
  }

  void _clearPointer() {
    setState(() {
      _pointer = null;
      _dragKind = null;
      _dragPane = null;
      _cardDistance = 0;
    });
  }

  void _cancel() {
    _clearPointer();
    w.cancelDrag();
  }

  void _launch(WorkspacePane pane, BuildContext source) {
    final render = source.findRenderObject() as RenderBox?;
    if (render != null) {
      _origins[pane] = _local(render.localToGlobal(Offset.zero)) & render.size;
    }
    w.launch(pane);
  }

  KeyEventResult _key(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.escape) {
      if (_pointer != null) {
        _cancel();
      } else if (w.screen == WorkspaceScreen.overview) {
        w.dismissOverview();
      } else {
        return KeyEventResult.ignored;
      }
      return KeyEventResult.handled;
    }
    if (w.screen == WorkspaceScreen.overview &&
        (key == LogicalKeyboardKey.delete ||
            key == LogicalKeyboardKey.backspace)) {
      final pane = _cardFocus.entries
          .where((entry) => entry.value.hasFocus)
          .firstOrNull
          ?.key;
      if (pane?.isApp ?? false) {
        w.close(pane!);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            (w.groups.isEmpty
                    ? _overviewHomeFocus
                    : _cardFocus[w.groups.first.first]!)
                .requestFocus();
          }
        });
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) => CallbackShortcuts(
    bindings: {
      const SingleActivator(LogicalKeyboardKey.home, control: true, alt: true):
          w.showHome,
      const SingleActivator(LogicalKeyboardKey.keyA, control: true, alt: true):
          w.showOverview,
      const SingleActivator(LogicalKeyboardKey.comma, meta: true): () =>
          w.launch(WorkspacePane.settings),
    },
    child: Focus(
      onKeyEvent: _key,
      child: FocusTraversalGroup(
        child: LayoutBuilder(
          builder: (context, constraints) {
            w.resize(constraints.biggest);
            final size = constraints.biggest;
            final layout = w.layout;
            final geometry = OverviewGeometry(size, w.groups, w.ratio);
            final full = Offset.zero & size;
            final visible = w.screen == WorkspaceScreen.overview
                ? <WorkspacePane>[]
                : layout.panes;
            final frames = <WorkspacePane, PaneFrame>{};
            for (final pane in WorkspacePane.values) {
              Rect rect = full;
              if (visible.contains(pane)) {
                if (layout.split) {
                  final width = (size.width - 8) * w.boundedRatio(layout.ratio);
                  rect = layout.panes.first == pane
                      ? Rect.fromLTWH(0, 0, width, size.height)
                      : Rect.fromLTWH(
                          width + 8,
                          0,
                          size.width - width - 8,
                          size.height,
                        );
                }
              } else if (w.screen == WorkspaceScreen.overview) {
                rect =
                    geometry.panes[pane] ??
                    Rect.fromCenter(center: full.center, width: 64, height: 64);
              } else if (pane.isApp) {
                rect =
                    _origins[pane] ??
                    Rect.fromLTWH(
                      pane == WorkspacePane.chat ? 48 : 176,
                      140,
                      64,
                      64,
                    );
              }
              frames[pane] = PaneFrame(rect, visible.contains(pane));
            }
            final reduced = MediaQuery.disableAnimationsOf(context);
            return Listener(
              key: _root,
              onPointerMove: _move,
              onPointerUp: _end,
              onPointerCancel: (event) {
                if (event.pointer == _pointer) _cancel();
              },
              child: WorkspaceWallpaper(
                name: widget.preferences.value.wallpaper.name,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: ExcludeFocus(
                        excluding: w.screen != WorkspaceScreen.overview,
                        child: ExcludeSemantics(
                          excluding: w.screen != WorkspaceScreen.overview,
                          child: IgnorePointer(
                            ignoring: w.screen != WorkspaceScreen.overview,
                            child: AnimatedOpacity(
                              opacity: w.screen == WorkspaceScreen.overview
                                  ? 1
                                  : 0,
                              duration: reduced
                                  ? Duration.zero
                                  : AppleMotion.layout,
                              child: WorkspaceOverview(
                                controller: w,
                                geometry: geometry,
                                homeFocus: _overviewHomeFocus,
                                cardFocus: _cardFocus,
                                onCardDown: (event, pane) =>
                                    _begin(event, 'card', pane),
                                onResume: (pane) {
                                  if (!_moved) {
                                    w.launch(
                                      pane == WorkspacePane.desktop
                                          ? w.pair!.firstWhere(
                                              (item) => item.isApp,
                                            )
                                          : pane,
                                    );
                                  }
                                },
                                dragged: _dragPane,
                                dragDistance: _cardDistance,
                                returning: _returningCard,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: WorkspaceMotion(
                        frames: frames,
                        transition: w.transition,
                        reduceMotion: reduced,
                        children: {
                          WorkspacePane.desktop: WorkspaceDesktop(
                            controller: w,
                            launch: _launch,
                            homeFocus: _homeFocus,
                          ),
                          for (final pane in [
                            WorkspacePane.chat,
                            WorkspacePane.settings,
                          ])
                            pane: _app(context, pane),
                        },
                      ),
                    ),
                    if (w.screen == WorkspaceScreen.app && layout.split)
                      Positioned(
                        left: (size.width - 8) * w.boundedRatio(layout.ratio),
                        top: 0,
                        bottom: 0,
                        width: 8,
                        child: _divider(context),
                      ),
                    if (_closed != null && _dismiss.isAnimating && !reduced)
                      Positioned.fromRect(
                        rect: _closedRect!.translate(
                          0,
                          -160 * AppleMotion.curve.transform(_dismiss.value),
                        ),
                        child: IgnorePointer(
                          child: ExcludeSemantics(
                            child: Opacity(
                              opacity: 1 - _dismiss.value,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(
                                  context.apple.surfaceRadius,
                                ),
                                child: PanePreview(
                                  pane: _closed!,
                                  category: _closedCategory,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    ),
  );

  Widget _app(BuildContext context, WorkspacePane pane) {
    final theme = context.apple;
    return Focus(
      onFocusChange: (focused) {
        if (focused) w.focus(pane);
      },
      child: ColoredBox(
        key: ValueKey('app-${pane.name}'),
        color: pane == WorkspacePane.chat ? theme.surface : theme.background,
        child: Column(
          children: [
            AppleMaterialSurface(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppleSpacing.large,
                  vertical: AppleSpacing.xsmall,
                ),
                child: SafeArea(
                  bottom: false,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Row(
                        children: [
                          Icon(
                            paneIcon(pane),
                            size: theme.iconSize,
                            color: theme.secondaryText,
                          ),
                          const SizedBox(width: AppleSpacing.small),
                          Expanded(
                            child: Text(
                              pane.label,
                              style: theme.label,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          WorkspaceIconButton(
                            key: ValueKey('${pane.name}-home'),
                            label: '返回桌面',
                            icon: AppleIcons.home,
                            focusNode: _appFocus[pane],
                            onPressed: w.showHome,
                          ),
                          WorkspaceIconButton(
                            key: ValueKey('${pane.name}-overview'),
                            label: '后台应用',
                            icon: AppleIcons.overview,
                            onPressed: w.showOverview,
                          ),
                        ],
                      ),
                      Align(
                        alignment: Alignment.center,
                        child: _grip(context, pane),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: !w.opened.contains(pane)
                  ? const SizedBox.expand()
                  : SubappBoundary(
                      runtime: widget.runtime,
                      pane: pane,
                      builder: (context) => pane == WorkspacePane.settings
                          ? SettingsApp(
                              key: ValueKey('settings-${w.settingsRevision}'),
                              workspace: w,
                              preferences: widget.preferences,
                            )
                          : const SizedBox.expand(
                              key: ValueKey('chat-content'),
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _grip(BuildContext context, WorkspacePane pane) => Semantics(
    label: '调整${pane.label}布局',
    hint: '左右拖动分屏；左右方向键安排位置，上方向键恢复全屏',
    child: Focus(
      focusNode: _gripFocus[pane],
      onFocusChange: (_) {
        if (mounted) setState(() {});
      },
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
          w.arrange(pane, true);
        } else if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
          w.arrange(pane, false);
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          w.fullscreen(pane);
        } else {
          return KeyEventResult.ignored;
        }
        return KeyEventResult.handled;
      },
      child: MouseRegion(
        cursor: SystemMouseCursors.grab,
        child: Listener(
          onPointerDown: (event) => _begin(event, 'app', pane),
          child: SizedBox(
            key: ValueKey('grip-${pane.name}'),
            width: 100,
            height: 40,
            child: Center(
              child: Container(
                width: 36,
                height: 5,
                decoration: BoxDecoration(
                  color:
                      _gripFocus[pane]!.hasFocus &&
                          AppleFocusVisibility.of(context)
                      ? context.apple.accent
                      : context.apple.secondaryText.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  Widget _divider(BuildContext context) => Semantics(
    label: '调整分屏宽度',
    slider: true,
    value: '${(w.boundedRatio(w.layout.ratio) * 100).round()}%',
    increasedValue: '${(w.boundedRatio(w.layout.ratio + 0.05) * 100).round()}%',
    decreasedValue: '${(w.boundedRatio(w.layout.ratio - 0.05) * 100).round()}%',
    onIncrease: () => w.adjustRatio(w.ratio + 0.05),
    onDecrease: () => w.adjustRatio(w.ratio - 0.05),
    child: Focus(
      focusNode: _dividerFocus,
      onFocusChange: (_) {
        if (mounted) setState(() {});
      },
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
          w.adjustRatio(w.ratio - 0.05);
        } else if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
          w.adjustRatio(w.ratio + 0.05);
        } else if (event.logicalKey == LogicalKeyboardKey.home) {
          w.adjustRatio(0.5);
        } else {
          return KeyEventResult.ignored;
        }
        return KeyEventResult.handled;
      },
      child: MouseRegion(
        cursor: SystemMouseCursors.resizeColumn,
        child: Listener(
          onPointerDown: (event) => _begin(event, 'divider', null),
          child: ColoredBox(
            key: const ValueKey('workspace-divider'),
            color: context.apple.border.withValues(alpha: 0.3),
            child: Center(
              child: Container(
                width: 3,
                height: 40,
                decoration: BoxDecoration(
                  color:
                      _dividerFocus.hasFocus && AppleFocusVisibility.of(context)
                      ? context.apple.accent
                      : context.apple.secondaryText,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
