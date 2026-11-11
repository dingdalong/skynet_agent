import 'package:apple_ui/apple_ui.dart';
import 'package:cupertino_ui/cupertino_ui.dart';

import '../domain/workspace.dart';
import '../runtime/actor.dart';
import '../runtime/client_runtime.dart';

class SubappScope extends InheritedWidget {
  const SubappScope({
    super.key,
    required this.runtime,
    required this.pane,
    required this.viewRevision,
    required super.child,
  });
  final ClientRuntime runtime;
  final WorkspacePane pane;
  final int viewRevision;
  void run(VoidCallback action) => runtime.guard(pane, viewRevision, action);
  @override
  bool updateShouldNotify(SubappScope oldWidget) =>
      oldWidget.runtime != runtime ||
      oldWidget.pane != pane ||
      oldWidget.viewRevision != viewRevision;
}

class SubappBoundary extends StatefulWidget {
  const SubappBoundary({
    super.key,
    required this.runtime,
    required this.pane,
    required this.builder,
  });
  final ClientRuntime runtime;
  final WorkspacePane pane;
  final WidgetBuilder builder;
  @override
  State<SubappBoundary> createState() => _SubappBoundaryState();
}

class _SubappBoundaryState extends State<SubappBoundary> {
  late final ActorSubscription<SubappStatus, SubappMessage> _subscription =
      widget.runtime.app(widget.pane).attach((_) {
        if (mounted) setState(() {});
      });
  @override
  void dispose() {
    _subscription.detach();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = _subscription.snapshot.state;
    return SubappScope(
      runtime: widget.runtime,
      pane: widget.pane,
      viewRevision: status.viewRevision,
      child: status.failed
          ? _FailureContent(retry: () => widget.runtime.reloadView(widget.pane))
          : KeyedSubtree(
              key: ValueKey('${widget.pane.name}-view-${status.viewRevision}'),
              child: Builder(builder: widget.builder),
            ),
    );
  }
}

class _FailureContent extends StatelessWidget {
  const _FailureContent({required this.retry});
  final VoidCallback retry;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(AppleSpacing.xlarge),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: AppleStatusMessage(
          kind: AppleStatusKind.error,
          message: '此应用暂时无法显示',
          description: '可以重新加载界面，其他应用和后台任务继续运行。',
          actionLabel: '重新加载界面',
          onAction: retry,
        ),
      ),
    ),
  );
}

/// Used by Flutter's build-error hook. An ancestor scope identifies the owner,
/// including failures in descendants built after the boundary itself returned.
class SubappBuildFailure extends StatefulWidget {
  const SubappBuildFailure({super.key, required this.details});
  final FlutterErrorDetails details;
  @override
  State<SubappBuildFailure> createState() => _SubappBuildFailureState();
}

class _SubappBuildFailureState extends State<SubappBuildFailure> {
  bool _reported = false;
  @override
  Widget build(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<SubappScope>();
    if (scope == null) return ErrorWidget(widget.details.exception);
    if (!_reported) {
      _reported = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          scope.runtime.fail(
            scope.pane,
            widget.details.exception,
            widget.details.stack ?? StackTrace.current,
            viewRevision: scope.viewRevision,
            operation: 'build',
          );
        }
      });
    }
    return _FailureContent(retry: () => scope.runtime.reloadView(scope.pane));
  }
}
