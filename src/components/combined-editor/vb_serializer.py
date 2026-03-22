import _vb_engine as _engine
import user_api as _user_api
import json as _json
import inspect as _inspect


# ── Snapshot helpers ──────────────────────────────────────────────────────────


def _serialize_visual_builder():
    """Walk VisualElem._registry and return list of serialized elements."""
    return _json.dumps([elem._serialize() for elem in _engine.VisualElem._registry])


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
        if f.f_code.co_filename == '<combined_code>':
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
    last_v = {}
    last_line = [None]
    guard = _engine.make_step_guard()

    def in_viz(lineno):
        return any(start <= lineno <= end for start, end in viz_ranges)

    def _trace(frame, event, arg):
        guard(frame, event, arg)
        if event == 'call' and frame.f_code is _VIZ_END_CODE:
            caller = frame.f_back
            if caller:
                _engine.V.params = _build_scope(caller)
                current = _collect_v_values()
                last_v.clear()
                last_v.update(current)
                on_snap(caller, caller.f_lineno, is_viz=True)
            return None
        if frame.f_code.co_filename != '<combined_code>':
            return None
        if event == 'call':
            return None if in_viz(frame.f_code.co_firstlineno) else _trace
        if event == 'line' and not in_viz(frame.f_lineno):
            last_line[0] = frame.f_lineno
            _engine.V.params = _build_scope(frame)
            current = _collect_v_values()
            if current and current != last_v:
                last_v.clear()
                last_v.update(current)
                on_snap(frame, frame.f_lineno, is_viz=False)
        return _trace

    return _trace, last_line


# ── Persistent namespace ──────────────────────────────────────────────────────


_combined_ns: dict = {}
_viz_ranges: list = []  # set by _init_combined_namespace, read by exec/click/input handlers


def _init_combined_namespace(viz_ranges_json: str):
    """Initialize namespace and viz ranges for a new combined-code run.

    Parses viz block ranges and seeds the execution namespace from user_api.
    Must be called before _exec_combined_code.
    """
    global _combined_ns, _viz_ranges
    _viz_ranges = [(r['startLine'], r['endLine']) for r in _json.loads(viz_ranges_json)]
    _combined_ns = {k: v for k, v in vars(_user_api).items() if not k.startswith('_')}
    _combined_ns['__builtins__'] = __builtins__
    _combined_ns['__viz_begin__'] = lambda: None  # no-op: tracer uses in_viz() to skip viz block lines
    _combined_ns['__viz_end__'] = __viz_end__  # tracer intercepts its call event


# ── Timeline execution ────────────────────────────────────────────────────────


def _exec_traced(execute_fn):
    """Core traced execution with V()-change detection, viz-block snapshots, and post-exec flush.

    Runs execute_fn under the combined tracer, then checks whether the last line produced
    any V() changes or stdout output the tracer couldn't see, and appends a final snapshot
    if so. Returns steps (list of snapshot dicts).
    """
    import sys as _sys, io as _io
    last_stdout_pos = [0]
    last_v_snap = {}
    steps = []

    def snap(frame, line, is_viz=False):
        all_out = _sys.stdout.getvalue()
        delta = all_out[last_stdout_pos[0]:]
        last_stdout_pos[0] = len(all_out)
        last_v_snap.clear()
        last_v_snap.update(_collect_v_values())
        steps.append({
            'visual': _json.loads(_serialize_visual_builder()),
            'variables': _collect_variables(frame),
            'line': line,
            'output': delta,
            'is_viz': is_viz,
        })

    old_stdout = _sys.stdout
    capture = _io.StringIO()
    _sys.stdout = capture
    tracer, last_line = _make_tracer(_viz_ranges, snap)
    try:
        _sys.settrace(tracer)
        try:
            execute_fn()
        finally:
            _sys.settrace(None)
        # Post-exec flush: the last line runs after the last 'line' event fires,
        # so it's never observed by the tracer. Take one final snapshot if V() values changed
        # or there is remaining stdout output.
        final_scope = {k: v for k, v in _combined_ns.items() if not k.startswith('_')}
        _engine.V.params = final_scope
        current = _collect_v_values()
        if (current and current != last_v_snap) or capture.getvalue()[last_stdout_pos[0]:]:
            snap(final_scope, last_line[0])
    finally:
        _sys.stdout = old_stdout
    return steps


def _exec_combined_code(code: str) -> str:
    """Execute combined user code with V() change detection and viz-block snapshot hooks.

    Requires _init_combined_namespace to have been called first.
    Returns timeline + handlers as a JSON string.
    """
    steps = _exec_traced(lambda: exec(compile(code, '<combined_code>', 'exec'), _combined_ns))
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
        raise _engine.PopupException(
            f"{type(elem).__name__}.{ref_fn.__name__} has wrong signature: "
            f"expected ({ref_str}), got ({got_str})"
        )

    return True


_EVENT_HANDLER_REFS = [_user_api.on_click, _user_api.on_drag]


def _serialize_combined_handlers() -> str:
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


def _handler_result(steps):
    """Assemble the JSON result returned by click/input handler dispatchers."""
    return _json.dumps({
        'timeline': steps,
        'handlers': _json.loads(_serialize_combined_handlers()),
    })


def _exec_combined_click_traced(elem_id: int, row: int, col: int) -> str:
    """Call on_click on element with viz-aware tracing; return timeline + handlers."""
    target = _find_element(elem_id)
    if target is None:
        raise ValueError(f'Element {elem_id} not found')
    handler = getattr(target, 'on_click', None)
    if not callable(handler):
        raise ValueError(f'Element {elem_id} has no on_click')
    return _handler_result(_exec_traced(lambda: handler(col, row)))


def _exec_combined_input_changed(elem_id: int, text: str) -> str:
    """Call input_changed(text) on element with viz-aware tracing; return timeline + handlers."""
    target = _find_element(elem_id)
    if target is None:
        raise ValueError(f'Element {elem_id} not found')
    if not isinstance(target, _user_api.Input):
        raise ValueError(f'Element {elem_id} is not an Input')
    return _handler_result(_exec_traced(lambda: target.input_changed(text)))
