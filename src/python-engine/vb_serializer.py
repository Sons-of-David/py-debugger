import _vb_engine as _engine
import user_api as _user_api
import json as _json
import inspect as _inspect


# ── Snapshot helpers ──────────────────────────────────────────────────────────

# Tracks state between snapshots for delta serialization.
# 'initialized': False means the next call produces a full snapshot.
# 'prev_ids': set of elem_ids present at the last snapshot (to detect deletions).
_snap_state: dict = {'initialized': False, 'prev_ids': set()}


def _serialize_visual_builder() -> str:
    """Serialize visual elements as a full snapshot or a delta since the last call.

    First call (or after reset): returns a JSON array of all elements.
    Subsequent calls: returns a delta object {is_delta, changed, deleted} where
      - changed: elements whose _dirty flag is True
      - deleted: elem_ids that were in _registry at the last snapshot but are gone now
    Dirty flags are cleared after each call.
    """
    registry = _engine.VisualElem._registry
    current_ids = {e._elem_id for e in registry}

    if not _snap_state['initialized']:
        result = _json.dumps([e._serialize() for e in registry])
        _snap_state['initialized'] = True
    else:
        deleted = list(_snap_state['prev_ids'] - current_ids)
        changed = [e._serialize() for e in registry
                   if object.__getattribute__(e, '_dirty')]
        result = _json.dumps({'is_delta': True, 'changed': changed, 'deleted': deleted})

    for e in registry:
        object.__setattr__(e, '_dirty', False)
    _snap_state['prev_ids'] = current_ids
    return result


def _reset_snap_state():
    """Reset delta tracking. Call at the start of each traced execution."""
    _snap_state['initialized'] = False
    _snap_state['prev_ids'] = set()


def _build_scope(frame):
    """Merge all variables visible at frame: globals → enclosing frames → current frame.

    Inner scope overrides outer. Skips private names (starting with '_').
    Used for both V.params (V() expression evaluation) and variable display.
    """
    merged = {}
    for k, v in frame.f_globals.items():
        if not k.startswith('_'):
            merged[k] = v
    chain = []
    f = frame
    while f is not None:
        if f.f_code.co_filename == '<user_code>':
            chain.append(f)
        f = f.f_back
    chain.reverse()  # outermost first so inner scope wins
    for f in chain:
        for k, v in f.f_locals.items():
            if not k.startswith('_'):
                merged[k] = v
    return merged


def _collect_variables(frame_or_scope):
    """Extract serializable variables from the full scope visible at frame.

    frame_or_scope: a Python frame object, or a plain dict used as the scope directly.
    """
    scope = frame_or_scope if isinstance(frame_or_scope, dict) else _build_scope(frame_or_scope)
    variables = {}
    for k, v in scope.items():
        if isinstance(v, (int, float, str, bool)):
            variables[k] = {'type': type(v).__name__, 'value': v}
        elif isinstance(v, (list, tuple)):
            if len(v) == 0:
                variables[k] = {'type': 'list', 'value': []}
            elif isinstance(v[0], (list, tuple)):
                variables[k] = {'type': 'list2d', 'value': [list(row) for row in v]}
            else:
                variables[k] = {'type': 'list', 'value': list(v)}
    return variables


def _collect_v_values():
    """Evaluate all V() instances in the registry. Returns {elem_id.attr: value}."""
    result = {}
    for elem in _engine.VisualElem._registry:
        for attr, raw_val in vars(elem).items():
            if isinstance(raw_val, _engine.V):
                result[f"{elem._elem_id}.{attr}"] = raw_val.eval()
    return result


# ── Tracer ────────────────────────────────────────────────────────────────────


def __viz_end__(_):
    pass  # no-op marker; _make_tracer intercepts its 'call' event to fire on_snap(is_viz=True)

_VIZ_END_CODE = __viz_end__.__code__


def _make_tracer(viz_ranges, on_snap):
    """Return (tracer, last_line).

    tracer fires on_snap(frame, lineno, is_viz) on two triggers:
      - V() value change outside a viz block  (is_viz=False)
      - __viz_end__ call from user code        (is_viz=True, caller frame used)
    last_line is a [int|None] container updated on every traced line.
    """
    last_v = _collect_v_values()
    last_line = [None]
    guard = _engine.make_step_guard()

    def in_viz(lineno):
        return any(start <= lineno <= end for start, end in viz_ranges)

    def _trace(frame, event, arg):
        guard(frame, event, arg)
        if event == 'call' and frame.f_code is _VIZ_END_CODE:
            caller = frame.f_back
            if caller:
                if _engine.V._count > 0:
                    _engine.V.params = _build_scope(caller)
                    current = _collect_v_values()
                    last_v.clear()
                    last_v.update(current)
                on_snap(caller, caller.f_lineno, is_viz=True)
            return None
        if frame.f_code.co_filename != '<user_code>':
            return None
        if event == 'call':
            return None if in_viz(frame.f_code.co_firstlineno) else _trace
        if event == 'line' and not in_viz(frame.f_lineno):
            last_line[0] = frame.f_lineno
            if _engine.V._count > 0:
                _engine.V.params = _build_scope(frame)
                current = _collect_v_values()
                if current != last_v:
                    last_v.clear()
                    last_v.update(current)
                    on_snap(frame, frame.f_lineno, is_viz=False)
        return _trace

    return _trace, last_line


# ── Persistent namespace ──────────────────────────────────────────────────────


_namespace: dict = {}
_viz_ranges: list = []  # set by _init_namespace, read by exec/click/input handlers


def _init_namespace(viz_ranges_json: str):
    """Initialize namespace and viz ranges for a new user-code run.

    Parses viz block ranges and seeds the execution namespace from user_api.
    Must be called before _exec_code.
    """
    global _namespace, _viz_ranges
    _viz_ranges = [(r['startLine'], r['endLine']) for r in _json.loads(viz_ranges_json)]
    _namespace = {k: v for k, v in vars(_user_api).items() if not k.startswith('_')}
    _namespace['__builtins__'] = __builtins__
    _namespace['__viz_begin__'] = lambda: None  # no-op: tracer uses in_viz() to skip viz block lines
    _namespace['__viz_end__'] = __viz_end__  # tracer intercepts its call event


# ── Timeline execution ────────────────────────────────────────────────────────


def _exec_traced(execute_fn):
    """Core traced execution with V()-change detection, viz-block snapshots, and post-exec flush.

    Runs execute_fn under the tracer, then checks whether the last line produced
    any V() changes or stdout output the tracer couldn't see, and appends a final snapshot
    if so. Returns steps (list of snapshot dicts).
    """
    import sys as _sys, io as _io, time as _time
    _reset_snap_state()
    last_stdout_pos = [0]
    steps = []
    _t_snap = [0.0]   # cumulative time inside snap()
    _t_exec = [0.0]   # time inside execute_fn() under settrace

    def snap(_, line, is_viz=False):
        _t0 = _time.perf_counter()
        if is_viz and not _engine.VisualElem._registry:
            return
        all_out = _sys.stdout.getvalue()
        delta = all_out[last_stdout_pos[0]:]
        last_stdout_pos[0] = len(all_out)
        visual_json = _serialize_visual_builder()
        steps.append({
            'visual': _json.loads(visual_json),
            'variables': {},  # TODO: separate user-algorithm variables from viz-block variables before re-enabling _collect_variables
            'line': line,
            'output': delta,
            'is_viz': is_viz,
        })
        _t_snap[0] += _time.perf_counter() - _t0

    old_stdout = _sys.stdout
    capture = _io.StringIO()
    _sys.stdout = capture
    tracer, last_line = _make_tracer(_viz_ranges, snap)
    try:
        _t0 = _time.perf_counter()
        _sys.settrace(tracer)
        try:
            execute_fn()
        finally:
            _sys.settrace(None)
        _t_exec[0] = _time.perf_counter() - _t0
        # Post-exec flush: the last line runs after the last 'line' event fires,
        # so it's never observed by the tracer. Take one final snapshot if any element
        # is dirty (covers plain attribute mutations, drag handlers, etc.) or there is
        # remaining stdout output.
        final_scope = {k: v for k, v in _namespace.items() if not k.startswith('_')}
        _engine.V.params = final_scope
        has_dirty = any(
            object.__getattribute__(e, '_dirty')
            for e in _engine.VisualElem._registry
        )
        if capture.getvalue()[last_stdout_pos[0]:] or has_dirty:
            # If last_line is None, no non-viz line was ever traced — all executed code
            # was inside viz blocks (e.g. a click handler defined in a viz block).
            snap(final_scope, last_line[0], is_viz=last_line[0] is None)
    finally:
        _sys.stdout = old_stdout

    global _last_console
    t_other = _t_exec[0] - _t_snap[0]
    _last_console = (
        f"[profile] steps={len(steps)} | "
        f"exec(+tracer)={_t_exec[0]:.3f}s | "
        f"snap(serialize)={_t_snap[0]:.3f}s | "
        f"pure_tracer={t_other:.3f}s"
    )
    return steps


def _exec_code(code: str) -> str:
    """Execute user code with V() change detection and viz-block snapshot hooks.

    Requires _init_namespace to have been called first.
    Returns timeline + handlers as a JSON string.
    """
    steps = _exec_traced(lambda: exec(compile(code, '<user_code>', 'exec'), _namespace))
    return _handler_result(steps)


# ── Interactive mode ──────────────────────────────────────────────────────────


def _has_valid_event_handler(elem, ref_fn) -> bool:
    """Return True if elem has a callable handler with the right signature for ref_fn.

    Returns False if the handler is absent or not callable.
    Raises PopupException if the handler is callable but has the wrong signature.

    ref_fn is a user_api function (includes self). The handler is retrieved via
    getattr(elem, ...) so bound methods already exclude self; lambdas assigned to
    instances also have no self. We compare non-self params of ref_fn vs the handler.
    """
    handler = getattr(elem, ref_fn.__name__, None)
    if not callable(handler):
        return False

    try:
        ref_sig = _inspect.signature(ref_fn)
        handler_sig = _inspect.signature(handler)
    except (ValueError, TypeError):
        return True  # can't inspect; allow it

    ref_params = [p for p in ref_sig.parameters.values() if p.name != 'self']
    handler_params = list(handler_sig.parameters.values())

    if len(ref_params) != len(handler_params):
        ref_str = ', '.join(p.name for p in ref_params)
        got_str = ', '.join(p.name for p in handler_params) or '(none)'
        code_obj = getattr(handler, '__code__', None) or getattr(getattr(handler, '__func__', None), '__code__', None)
        line = getattr(code_obj, 'co_firstlineno', None)
        raise _engine.SerializationException(
            f"{type(elem).__name__}.{ref_fn.__name__} has wrong signature: "
            f"expected ({ref_str}), got ({got_str})",
            line=line,
        )

    return True


_EVENT_HANDLER_REFS = [_user_api.on_click, _user_api.on_drag]


def _serialize_handlers() -> str:
    """Return JSON dict of {elem_id: [handler_names]} for elements with event handlers set."""
    handlers = {}
    for elem in _engine.VisualElem._registry:
        names = [ref_fn.__name__ for ref_fn in _EVENT_HANDLER_REFS
                 if _has_valid_event_handler(elem, ref_fn)]
        if isinstance(elem, _user_api.Input):
            names.append('input_changed')
        if names:
            handlers[elem._elem_id] = names
    return _json.dumps(handlers)


def _find_element(elem_id: int):
    """Return the VisualElem with the given elem_id, or None."""
    for elem in _engine.VisualElem._registry:
        if elem._elem_id == elem_id:
            return elem
    return None


_last_console: str = ''   # set by _exec_traced; cleared after each _handler_result


def _handler_result(steps):
    """Assemble the JSON result returned by click/input handler dispatchers."""
    global _last_console
    result: dict = {
        'timeline': steps,
        'handlers': _json.loads(_serialize_handlers()),
    }
    if _last_console:
        result['console'] = _last_console
        _last_console = ''
    return _json.dumps(result)


def _exec_click_traced(elem_id: int, row: int, col: int) -> str:
    """Call on_click on element with viz-aware tracing; return timeline + handlers."""
    target = _find_element(elem_id)
    if target is None:
        raise ValueError(f'Element {elem_id} not found')
    handler = getattr(target, 'on_click', None)
    if not callable(handler):
        raise ValueError(f'Element {elem_id} has no on_click')
    return _handler_result(_exec_traced(lambda: handler(col, row)))


def _exec_drag_traced(elem_id: int, row: int, col: int, drag_type: str) -> str:
    """Call on_drag on element with viz-aware tracing; return timeline + handlers."""
    target = _find_element(elem_id)
    if target is None:
        raise ValueError(f'Element {elem_id} not found')
    handler = getattr(target, 'on_drag', None)
    if not callable(handler):
        raise ValueError(f'Element {elem_id} has no on_drag')
    return _handler_result(_exec_traced(lambda: handler(col, row, drag_type)))


def _exec_input_changed(elem_id: int, text: str) -> str:
    """Call input_changed(text) on element with viz-aware tracing; return timeline + handlers."""
    target = _find_element(elem_id)
    if target is None:
        raise ValueError(f'Element {elem_id} not found')
    if not isinstance(target, _user_api.Input):
        raise ValueError(f'Element {elem_id} is not an Input')
    return _handler_result(_exec_traced(lambda: target.input_changed(text)))
