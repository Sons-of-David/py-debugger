import _vb_engine as _engine
import user_api as _user_api


def _serialize_visual_builder():
    """Walk VisualElem._registry and return list of serialized elements."""
    import json
    return json.dumps([elem._serialize() for elem in _engine.VisualElem._registry])


# ── V() change detection ──────────────────────────────────────────────────────

_tracing_active = True
_last_v_values: dict = {}


def __viz_begin__():
    """Called at the start of each viz block; tells the tracer to pause V() detection."""
    global _tracing_active
    _tracing_active = False


def __viz_end__(frame_locals):
    """Called at the end of each viz block; resumes V() detection and records a snapshot."""
    import sys as _sys
    global _tracing_active
    _tracing_active = True
    __record_snapshot__(frame_locals, _sys._getframe(1).f_lineno)


def _collect_v_values():
    """Evaluate all V() instances in the registry. Returns {elem_id.attr: value}."""
    result = {}
    for elem in _engine.VisualElem._registry:
        for attr, raw_val in vars(elem).items():
            if isinstance(raw_val, _engine.V):
                result[f"{elem._elem_id}.{attr}"] = raw_val.eval()
    return result


def _make_v_aware_tracer():
    """Return a sys.settrace tracer that records snapshots when V() values change outside viz blocks."""
    global _last_v_values
    _last_v_values = {}
    guard = _engine.make_step_guard()

    def _tracer(frame, event, arg):
        guard(frame, event, arg)
        if event == 'line' and frame.f_code.co_filename == '<combined_code>' and _tracing_active:
            _engine.V.params = dict(frame.f_locals)
            current = _collect_v_values()
            if current and current != _last_v_values:
                _last_v_values.clear()
                _last_v_values.update(current)
                __record_snapshot__(frame.f_locals, frame.f_lineno)
        return _tracer

    return _tracer


# ── Persistent namespace for interactive mode ─────────────────────────────────

_combined_ns: dict = {}


def _exec_combined_code(code: str):
    """Execute combined user code with V() change detection and viz-block snapshot hooks."""
    global _combined_ns
    import sys as _sys
    ns = {k: v for k, v in vars(_user_api).items() if not k.startswith('_')}
    ns['__builtins__'] = __builtins__
    ns['__viz_begin__'] = __viz_begin__
    ns['__viz_end__'] = __viz_end__
    _sys.settrace(_make_v_aware_tracer())
    try:
        exec(compile(code, '<combined_code>', 'exec'), ns)
    finally:
        _sys.settrace(None)
        _combined_ns = ns  # persist for interactive click handlers


# Sandbox namespace for user builder code. Populated by _exec_builder_code,
# read by _visual_code_trace for hook calls.
_user_code_ns: dict = {}


def _exec_builder_code(code: str) -> str:
    """Execute visual builder code in a sandboxed namespace with stdout capture
    and infinite loop protection.

    The sandbox is seeded from user_api defaults so the user sees Panel, Rect,
    V, update, etc. but cannot reach engine internals in Pyodide globals.
    Returns captured stdout from the builder code run.
    """
    global _user_code_ns
    import io as _io, sys as _sys

    # Build a fresh sandbox from user_api defaults each run.
    _user_code_ns = {
        '__builtins__': __builtins__,
        **vars(_user_api),
    }

    _old_stdout = _sys.stdout
    _sys.stdout = _io.StringIO()
    try:
        _sys.settrace(_engine.make_step_guard())
        exec(compile(code, '<builder_code>', 'exec'), _user_code_ns)
        return _sys.stdout.getvalue()
    finally:
        _sys.settrace(None)
        _sys.stdout = _old_stdout


# ── Combined-editor timeline ──────────────────────────────────────────────────

import json as _json

_combined_timeline = []


def _reset_combined_timeline():
    global _combined_timeline, _tracing_active, _last_v_values, _combined_ns
    _combined_timeline = []
    _tracing_active = True
    _last_v_values = {}
    _combined_ns = {}


def __record_snapshot__(frame_locals, line=None):
    """Record a visual + variable snapshot into the combined timeline."""
    visual = _json.loads(_serialize_visual_builder())
    variables = _collect_variables(frame_locals)
    _combined_timeline.append({'visual': visual, 'variables': variables, 'line': line})


def _collect_variables(frame_locals):
    """Extract serializable variables from a frame's locals dict."""
    variables = {}
    for k, v in frame_locals.items():
        if k.startswith('_') or k == '__record_snapshot__':
            continue
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


# ── Interactive mode: handler detection and traced click dispatch ──────────────

def _serialize_combined_handlers() -> str:
    """Return JSON dict of {elem_id: ["on_click"]} for elements with on_click set."""
    handlers = {}
    for elem in _engine.VisualElem._registry:
        names = []
        if hasattr(elem, 'on_click') and callable(elem.on_click):
            names.append('on_click')
        if names:
            handlers[elem._elem_id] = names
    return _json.dumps(handlers)


def _make_interactive_tracer(viz_ranges):
    """Create a viz-aware tracer for interactive click execution.

    viz_ranges: list of (startLine, endLine) tuples (1-based, inclusive).
    Returns (tracer_fn, steps_list).

    Per-frame skipping: if a function's co_firstlineno falls inside any viz block
    range, return None for the 'call' event — skipping local tracing for that frame
    only. Critically, Python's global trace still fires for frames entered from within
    that frame, so algorithm functions called from viz-block-defined handlers ARE
    still traced (their co_firstlineno is outside the viz ranges).
    """
    def in_viz(lineno):
        return any(start <= lineno <= end for start, end in viz_ranges)

    guard = _engine.make_step_guard()
    steps = []

    def _trace(frame, event, arg):
        guard(frame, event, arg)
        if frame.f_code.co_filename != '<combined_code>':
            return None  # skip stdlib / engine frames
        if event == 'call':
            return None if in_viz(frame.f_code.co_firstlineno) else _trace
        if event == 'line' and not in_viz(frame.f_lineno):
            _engine.V.params = dict(frame.f_locals)
            visual = _json.loads(_serialize_visual_builder())
            steps.append({
                'visual': visual,
                'variables': _collect_variables(frame.f_locals),
                'line': frame.f_lineno,
            })
        return _trace

    return _trace, steps


def _exec_combined_click_traced(elem_id: int, row: int, col: int, viz_ranges_json: str) -> str:
    """Call on_click on element with viz-aware tracing; return interactive_timeline + final snapshot."""
    import sys as _sys, io as _io

    target = None
    for elem in _engine.VisualElem._registry:
        if elem._elem_id == elem_id:
            target = elem
            break

    if target is None:
        return _json.dumps({'error': f'Element {elem_id} not found',
                            'interactive_timeline': [], 'final_snapshot': [], 'handlers': {}, 'output': ''})

    handler = getattr(target, 'on_click', None)
    if not callable(handler):
        return _json.dumps({'error': f'Element {elem_id} has no on_click',
                            'interactive_timeline': [], 'final_snapshot': [], 'handlers': {}, 'output': ''})

    viz_ranges = [(r['startLine'], r['endLine']) for r in _json.loads(viz_ranges_json)]
    _tracer, steps = _make_interactive_tracer(viz_ranges)

    _old_stdout = _sys.stdout
    _capture = _io.StringIO()
    _sys.stdout = _capture
    try:
        _sys.settrace(_tracer)
        handler((row, col))
    finally:
        _sys.settrace(None)
        _sys.stdout = _old_stdout

    # Refresh V.params from saved namespace so V() expressions re-evaluate correctly
    _engine.V.params = {k: v for k, v in _combined_ns.items()
                        if not k.startswith('_') and k != '__builtins__'}
    final_snapshot = _json.loads(_serialize_visual_builder())
    handlers = _json.loads(_serialize_combined_handlers())

    return _json.dumps({
        'interactive_timeline': steps,
        'final_snapshot': final_snapshot,
        'handlers': handlers,
        'output': _capture.getvalue(),
    })


def _execute_run_call(expression: str) -> str:
    """Execute expression silently in _exec_context, return snapshot + handlers JSON."""
    import io as _io, sys as _sys, json as _json
    _old_stdout = _sys.stdout
    _capture = _io.StringIO()
    _sys.stdout = _capture
    try:
        _sys.settrace(_engine.make_step_guard())
        exec(expression, _exec_context)
    finally:
        _sys.settrace(None)
        _sys.stdout = _old_stdout
    _engine.V.params = {k: v for k, v in _exec_context.items() if not k.startswith('__')}
    snapshot = _json.loads(_serialize_visual_builder())
    handlers = _serialize_handlers()
    return _json.dumps({
        'snapshot': snapshot,
        'handlers': handlers,
        'output': _capture.getvalue(),
    })
