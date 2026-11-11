import 'dart:collection';

typedef RuntimeLog = void Function(String message);
typedef FaultHandler = void Function(Object error, StackTrace stack);

class ActorSnapshot<S> {
  const ActorSnapshot(this.state, this.sequence);
  final S state;
  final int sequence;
}

/// A view lease never owns its actor. Detaching only invalidates this sender.
class ActorSubscription<S, M> {
  ActorSubscription._(this._actor, this._snapshot, this._listener);
  final StateActor<S, M> _actor;
  final void Function(ActorSnapshot<S>) _listener;
  ActorSnapshot<S> _snapshot;
  bool _active = true;

  ActorSnapshot<S> get snapshot => _snapshot;
  bool get active => _active;

  bool dispatch(M message) {
    if (!_active || _actor.closed) return false;
    _actor.dispatch(message);
    return true;
  }

  void detach() {
    _active = false;
    _actor._subscriptions.remove(this);
  }
}

/// State transitions cannot await. Reentrant sends join the same FIFO mailbox.
abstract class StateActor<S, M> {
  StateActor(this.name, S initial, {required this.log, required this.onFault})
    : _snapshot = ActorSnapshot(initial, 0);

  final String name;
  final RuntimeLog log;
  final FaultHandler onFault;
  final _mailbox = Queue<M>();
  final _subscriptions = <ActorSubscription<S, M>>{};
  ActorSnapshot<S> _snapshot;
  bool _draining = false;
  bool _closed = false;

  S get state => _snapshot.state;
  bool get closed => _closed;
  int get sequence => _snapshot.sequence;

  ActorSubscription<S, M> attach(void Function(ActorSnapshot<S>) listener) {
    if (_closed) throw StateError('$name is closed');
    final subscription = ActorSubscription._(this, _snapshot, listener);
    _subscriptions.add(subscription);
    return subscription;
  }

  S reduce(S current, M message);
  void committed(M message, S previous) {}

  void dispatch(M message) {
    if (_closed) return;
    _mailbox.addLast(message);
    if (_draining) return;
    _draining = true;
    try {
      while (_mailbox.isNotEmpty && !_closed) {
        final next = _mailbox.removeFirst();
        final previous = state;
        try {
          final value = reduce(previous, next);
          if (identical(value, previous)) continue;
          _snapshot = ActorSnapshot(value, sequence + 1);
        } catch (error, stack) {
          report('reduce ${next.runtimeType}', error, stack);
          continue;
        }
        for (final subscription in _subscriptions.toList()) {
          if (!subscription.active || _closed) continue;
          subscription._snapshot = _snapshot;
          try {
            subscription._listener(_snapshot);
          } catch (error, stack) {
            subscription.detach();
            report('subscriber ${next.runtimeType}', error, stack);
          }
        }
        if (_closed) continue;
        try {
          committed(next, previous);
        } catch (error, stack) {
          report('effect ${next.runtimeType}', error, stack);
        }
      }
    } finally {
      _draining = false;
    }
  }

  void report(String operation, Object error, StackTrace stack) {
    log('$name.$operation sequence=$sequence failed: $error\n$stack');
    onFault(error, stack);
  }

  void close() {
    _closed = true;
    _mailbox.clear();
    for (final subscription in _subscriptions.toList()) {
      subscription.detach();
    }
  }
}
