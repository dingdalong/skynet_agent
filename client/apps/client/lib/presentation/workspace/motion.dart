import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

import 'controller.dart';

@immutable
class PaneFrame {
  const PaneFrame(this.rect, this.visible);
  final Rect rect;
  final bool visible;
}

/// A persistent child per pane; transforms never create another app instance.
class WorkspaceMotion extends StatefulWidget {
  const WorkspaceMotion({
    super.key,
    required this.frames,
    required this.children,
    required this.transition,
    required this.reduceMotion,
  });
  final Map<WorkspacePane, PaneFrame> frames;
  final Map<WorkspacePane, Widget> children;
  final WorkspaceTransition transition;
  final bool reduceMotion;
  @override
  State<WorkspaceMotion> createState() => _WorkspaceMotionState();
}

class _WorkspaceMotionState extends State<WorkspaceMotion>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    value: 1,
  )..addListener(_tick);
  final _from = <WorkspacePane, Rect>{};
  final _fromOpacity = <WorkspacePane, double>{};
  final _sizes = <WorkspacePane, Size>{};
  final _reflow = <WorkspacePane, bool>{};
  bool _background = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    for (final pane in WorkspacePane.values) {
      _from[pane] = widget.frames[pane]!.rect;
      _fromOpacity[pane] = widget.frames[pane]!.visible ? 1 : 0;
      _sizes[pane] = widget.frames[WorkspacePane.desktop]!.rect.size;
      _reflow[pane] = true;
    }
  }

  void _tick() {
    if (mounted) setState(() {});
  }

  double get _progress => AppleMotion.curve.transform(_animation.value);
  Rect _rect(WorkspacePane pane, Map<WorkspacePane, PaneFrame> target) =>
      Rect.lerp(_from[pane], target[pane]!.rect, _progress)!;
  double _opacity(WorkspacePane pane, Map<WorkspacePane, PaneFrame> target) =>
      _fromOpacity[pane]! +
      ((target[pane]!.visible ? 1 : 0) - _fromOpacity[pane]!) * _progress;
  @override
  void didUpdateWidget(WorkspaceMotion oldWidget) {
    super.didUpdateWidget(oldWidget);
    final changed = WorkspacePane.values.any(
      (pane) =>
          oldWidget.frames[pane]!.rect != widget.frames[pane]!.rect ||
          oldWidget.frames[pane]!.visible != widget.frames[pane]!.visible,
    );
    if (changed) {
      for (final pane in WorkspacePane.values) {
        _from[pane] = _rect(pane, oldWidget.frames);
        _fromOpacity[pane] = _opacity(pane, oldWidget.frames);
        _reflow[pane] =
            oldWidget.frames[pane]!.visible && widget.frames[pane]!.visible;
        if ((oldWidget.transition == WorkspaceTransition.layout ||
                oldWidget.transition == WorkspaceTransition.direct) &&
            oldWidget.frames[pane]!.visible) {
          _sizes[pane] = _from[pane]!.size;
        }
        if (widget.frames[pane]!.visible) {
          _sizes[pane] = widget.frames[pane]!.rect.size;
        }
      }
      _animation.duration = switch (widget.transition) {
        WorkspaceTransition.layout ||
        WorkspaceTransition.close => AppleMotion.layout,
        _ => AppleMotion.navigation,
      };
      if (widget.reduceMotion ||
          _background ||
          widget.transition == WorkspaceTransition.direct) {
        _animation.value = 1;
      } else {
        _animation.forward(from: 0);
      }
    } else if (widget.reduceMotion) {
      _animation.value = 1;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _background = state != AppLifecycleState.resumed;
    if (_background) _animation.value = 1;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    clipBehavior: Clip.hardEdge,
    children: [for (final pane in WorkspacePane.values) _pane(pane)],
  );
  Widget _pane(WorkspacePane pane) {
    final target = widget.frames[pane]!;
    final rect = _rect(pane, widget.frames);
    final opacity = _opacity(pane, widget.frames).clamp(0.0, 1.0);
    final size = _sizes[pane]!;
    // Resizing a split lays out text at its real width. Navigation alone scales
    // a persistent page between its full size and its icon/card origin.
    final resizing =
        target.visible &&
        (widget.transition == WorkspaceTransition.direct ||
            (widget.transition == WorkspaceTransition.layout &&
                _reflow[pane]!));
    return Positioned(
      key: ValueKey('frame-${pane.name}'),
      left: rect.left,
      top: rect.top,
      width: resizing ? rect.width : size.width,
      height: resizing ? rect.height : size.height,
      child: Offstage(
        offstage: opacity <= 0 && !target.visible,
        child: TickerMode(
          enabled: target.visible,
          child: ExcludeFocus(
            excluding: !target.visible,
            child: ExcludeSemantics(
              excluding: !target.visible,
              child: IgnorePointer(
                ignoring: !target.visible,
                child: Transform(
                  alignment: Alignment.topLeft,
                  transform: resizing
                      ? Matrix4.identity()
                      : Matrix4.diagonal3Values(
                          rect.width / size.width,
                          rect.height / size.height,
                          1,
                        ),
                  child: Opacity(
                    opacity: opacity,
                    child: ClipRSuperellipse(
                      borderRadius: BorderRadius.circular(
                        _animation.isAnimating && !resizing ? 16 : 0,
                      ),
                      child: RepaintBoundary(child: widget.children[pane]!),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
