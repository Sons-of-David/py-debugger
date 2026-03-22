import _vb_engine as _engine
import user_api as _user_api


def _serialize_visual_builder():
    """Walk VisualElem._registry and return list of serialized elements."""
    import json
    return json.dumps([elem._serialize() for elem in _engine.VisualElem._registry])


# ── V() change detection ──────────────────────────────────────────────────────

_last_v_values: dict = {}


def __viz_end__(frame_locals):
    """Called at the end of each viz block; records a snapshot."""
    import sys as _sys
    caller = _sys._getframe(1)
    __record_snapshot__(caller, caller.f_lineno, is_viz=True)


def _collect_v_values():
    """Evaluate all V() instances in the registry. Returns {elem_id.attr: value}."""
    result = {}
    for elem in _engine.VisualElem._registry:
        for attr, raw_val in vars(elem).items():
            if isinstance(raw_val, _engine.V):
                result[f"{elem._elem_id}.{attr}"] = raw_val.eval()
    return result


def _make_v_aware_tracer(viz_ranges):
    """Return a sys.settrace tracer that records snapshots when V() values change outside viz blocks."""
    global _last_v_values
    _last_v_values = {}
    guard = _engine.make_step_guard()

    def in_viz(lineno):
        return any(start <= lineno <= end for start, end in viz_ranges)

    def _tracer(frame, event, arg):
        global _last_traced_line
        guard(frame, event, arg)
        if event == 'line' and frame.f_code.co_filename == '<combined_code>' and not in_viz(frame.f_lineno):
            _last_traced_line = frame.f_lineno
            _engine.V.params = _build_scope(frame)
            current = _collect_v_values()
            if current and current != _last_v_values:
                _last_v_values.clear()
                _last_v_values.update(current)
                __record_snapshot__(frame, frame.f_lineno)
        return _tracer

    return _tracer


# ── Persistent namespace for interactive mode ─────────────────────────────────

_combined_ns: dict = {}
_viz_ranges: list = []  # set by _init_combined_namespace, read by exec/click/input handlers


def _init_combined_namespace(viz_ranges_json: str):
    """Initialize namespace and viz ranges for a new combined-code run.

    Resets all timeline state, parses viz block ranges, and seeds the execution
    namespace from user_api. Must be called before _exec_combined_code.
    """
    global _combined_ns, _viz_ranges
    global _combined_timeline, _last_v_values, _last_stdout_pos, _last_traced_line
    _combined_timeline = []
    _last_v_values = {}
    _last_stdout_pos = 0
    _last_traced_line = None
    _viz_ranges = [(r['startLine'], r['endLine']) for r in _json.loads(viz_ranges_json)]
    _combined_ns = {k: v for k, v in vars(_user_api).items() if not k.startswith('_')}
    _combined_ns['__builtins__'] = __builtins__
    _combined_ns['__viz_begin__'] = lambda: None  # no-op: tracer uses in_viz() to skip viz block lines
    _combined_ns['__viz_end__'] = __viz_end__


def _exec_combined_code(code: str):
    """Execute combined user code with V() change detection and viz-block snapshot hooks.

    Requires _init_combined_namespace to have been called first.
    """
    import sys as _sys, io as _io
    _old_stdout = _sys.stdout
    _sys.stdout = _io.StringIO()
    try:
        _sys.settrace(_make_v_aware_tracer(_viz_ranges))
        try:
            exec(compile(code, '<combined_code>', 'exec'), _combined_ns)
        finally:
            _sys.settrace(None)
        # Post-exec flush: the last assignment/print runs after the last 'line' event fires,
        # so it's never observed by the tracer. Take one final snapshot if V() values changed
        # or there is remaining stdout output.
        final_scope = {k: v for k, v in _combined_ns.items() if not k.startswith('_')}
        _engine.V.params = final_scope
        current = _collect_v_values()
        remaining = _sys.stdout.getvalue()[_last_stdout_pos:]
        if (current and current != _last_v_values) or remaining:
            __record_snapshot__(final_scope, _last_traced_line)
    finally:
        _sys.stdout = _old_stdout


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
_last_stdout_pos: int = 0
_last_traced_line: int = None



def __record_snapshot__(frame_or_scope, line=None, is_viz=False):
    """Record a visual + variable snapshot into the combined timeline.

    frame_or_scope: a Python frame object, or a plain dict (used for post-exec flush).
    """
    global _last_stdout_pos
    import sys as _sys
    all_output = _sys.stdout.getvalue()
    delta = all_output[_last_stdout_pos:]
    _last_stdout_pos = len(all_output)
    visual = _json.loads(_serialize_visual_builder())
    variables = _collect_variables(frame_or_scope)
    _combined_timeline.append({'visual': visual, 'variables': variables, 'line': line, 'output': delta, 'is_viz': is_viz})


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


# ── Interactive mode: handler detection and traced click dispatch ──────────────

def _serialize_combined_handlers() -> str:
    """Return JSON dict of {elem_id: ["on_click"]} for elements with on_click set."""
    handlers = {}
    for elem in _engine.VisualElem._registry:
        names = []
        if hasattr(elem, 'on_click') and callable(elem.on_click):
            names.append('on_click')
        if isinstance(elem, _user_api.Input):
            names.append('input_changed')
        if names:
            handlers[elem._elem_id] = names
    return _json.dumps(handlers)


def _make_interactive_tracer(viz_ranges):
    """Create a viz-aware tracer for interactive click execution.

    Snapshots are recorded using the same triggers as the initial trace:
    - V() value change outside a viz block
    - viz block end (via the _snap callback, called by a patched __viz_end__)

    viz_ranges: list of (startLine, endLine) tuples (1-based, inclusive).
    Returns (tracer_fn, steps_list, snap_fn).

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
    last_v_values = {}

    def _snap(frame, line):
        visual = _json.loads(_serialize_visual_builder())
        steps.append({'visual': visual, 'variables': _collect_variables(frame), 'line': line})

    def _trace(frame, event, arg):
        guard(frame, event, arg)
        if frame.f_code.co_filename != '<combined_code>':
            return None  # skip stdlib / engine frames
        if event == 'call':
            return None if in_viz(frame.f_code.co_firstlineno) else _trace
        if event == 'line' and not in_viz(frame.f_lineno):
            _engine.V.params = _build_scope(frame)
            current = _collect_v_values()
            if current and current != last_v_values:
                last_v_values.clear()
                last_v_values.update(current)
                _snap(frame, frame.f_lineno)
        return _trace

    return _trace, steps, _snap


def _exec_combined_click_traced(elem_id: int, row: int, col: int) -> str:
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

    viz_ranges = _viz_ranges
    _tracer, steps, snap = _make_interactive_tracer(viz_ranges)

    def _click_viz_end(frame_locals):
        import sys as _sys
        f = _sys._getframe(1)
        snap(f, f.f_lineno)

    _old_viz_end = _combined_ns.get('__viz_end__')
    _combined_ns['__viz_end__'] = _click_viz_end

    _old_stdout = _sys.stdout
    _capture = _io.StringIO()
    _sys.stdout = _capture
    try:
        _sys.settrace(_tracer)
        handler(col, row)
    finally:
        _sys.settrace(None)
        _sys.stdout = _old_stdout
        if _old_viz_end is not None:
            _combined_ns['__viz_end__'] = _old_viz_end
        else:
            _combined_ns.pop('__viz_end__', None)

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


def _exec_combined_input_changed(elem_id: int, text: str) -> str:
    """Call input_changed(text) on element with viz-aware tracing; return interactive_timeline + final snapshot."""
    import sys as _sys, io as _io

    target = None
    for elem in _engine.VisualElem._registry:
        if elem._elem_id == elem_id:
            target = elem
            break

    if target is None:
        return _json.dumps({'error': f'Element {elem_id} not found',
                            'interactive_timeline': [], 'final_snapshot': [], 'handlers': {}, 'output': ''})

    if not isinstance(target, _user_api.Input):
        return _json.dumps({'error': f'Element {elem_id} is not an Input',
                            'interactive_timeline': [], 'final_snapshot': [], 'handlers': {}, 'output': ''})

    viz_ranges = _viz_ranges
    _tracer, steps, snap = _make_interactive_tracer(viz_ranges)

    def _input_viz_end(frame_locals):
        import sys as _sys
        f = _sys._getframe(1)
        snap(f, f.f_lineno)

    _old_viz_end = _combined_ns.get('__viz_end__')
    _combined_ns['__viz_end__'] = _input_viz_end

    _old_stdout = _sys.stdout
    _capture = _io.StringIO()
    _sys.stdout = _capture
    try:
        _sys.settrace(_tracer)
        target.input_changed(text)
    finally:
        _sys.settrace(None)
        _sys.stdout = _old_stdout
        if _old_viz_end is not None:
            _combined_ns['__viz_end__'] = _old_viz_end
        else:
            _combined_ns.pop('__viz_end__', None)

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
