# Python Engine

[← dev-notes](./dev-notes.md)

Python runs entirely in-browser via **Pyodide** (WebAssembly, loaded once per page session). There is no server-side Python.

---

## Part 1: General Description

### Combined Execution Model

The user writes a single Python file. It contains two kinds of code interleaved:

- **Algorithm code** — runs normally; the V() change detection tracer records a snapshot whenever any bound V() expression changes value.
- **Viz blocks** (`# @viz … # @end`) — visual builder code that declares and updates visual elements. Before execution, they are preprocessed into engine calls:
  - `# @viz` → `__viz_begin__()` (no-op marker; the tracer skips viz block lines via `in_viz()`)
  - `# @end` → `__viz_end__(dict(locals()))` (records a snapshot at the viz block boundary)

The two kinds of code share one namespace (`_combined_ns`). Variables declared in algorithm code are visible inside viz blocks and vice versa.

### Three-Layer Architecture

The Python side is split into three layers, each in a separate file — all under `src/python-engine/`:

| Layer | File | What lives here |
|-------|------|-----------------|
| **Hidden engine types** | `_vb_engine.py` | `VisualElem`, `V`, `R`, `TrackedDict`, `PopupException`, `make_step_guard` |
| **User-facing API** | `user_api.py` | `Panel`, all shapes, `Input`, `no_debug` |
| **Engine** | `vb_serializer.py` | Execution, snapshot recording, interactive click/input dispatch |

`_vb_engine.py` and `user_api.py` are **Python VFS modules** — written to `/home/pyodide/` at startup and imported via standard `import`. `vb_serializer.py` is exec'd into Pyodide globals.

Optional import files in `src/python-engine/imports/` (`array_utils.py`, `graphs.py`, `list_helpers.py`) are also written to the Pyodide VFS at startup — they are all auto-loaded from the directory at init time, no individual registration needed.

### Persistent Namespace: `_namespace`

`_namespace` is a Python dict that serves as the execution namespace. It persists across interactions:
- Re-created at the start of each Analyze via `_init_namespace()` (fresh namespace seeded from `user_api` exports)
- Preserved between `_exec_click_traced` calls — handlers see all variables from the last run
- Only destroyed on page reload or next Analyze

### Python ↔ TypeScript Bridge

All TypeScript-to-Python calls go through `src/python-engine/executor.ts`. It manages Pyodide initialization (via `pyodide-runtime.ts`), code preprocessing, and JSON parsing of results.

---

## Part 2: Visual Elements

### Files

| File | Purpose |
|------|---------|
| `src/python-engine/_vb_engine.py` | Hidden engine types: `VisualElem`, `V`, `R`, `TrackedDict`, `PopupException` |
| `src/python-engine/user_api.py` | User-facing API: `Panel`, all shapes, `Input`, `no_debug` |

### `VisualElem` — Base Class

Every visual element extends `VisualElem`. Key class-level state:

```python
class VisualElem:
    _registry = []        # All live element instances
    _vis_elem_id = 0      # Auto-incrementing counter
```

**`_elem_id`** — assigned at construction, stable for the lifetime of the element. This is the identity that bridges Python and TypeScript for click dispatch.

**`_clear_registry()`** — called at the start of every Analyze. Clears `_registry`, resets `_vis_elem_id` counter, and resets `V._count` to 0.

**`_dirty` flag** — every `VisualElem` instance carries a `_dirty` boolean. The `__setattr__` patch on `VisualElem` sets `_dirty = True` whenever any non-private attribute is written. Used by the delta snapshot system (see Snapshot Triggers below).

**`_serialize_base()`** — fields every element emits:
```python
{
    "position": [row, col],   # Panel-relative if element has a parent panel
    "visible": bool,
    "alpha": float,
    "z": int,                 # Depth layer; lower z = closer = rendered on top (default 0)
    "_elem_id": int,
    "panelId": str or None,   # str(_elem_id) of parent panel, or None
}
```

**`__getattribute__` patch** — `_vb_engine.py` replaces `VisualElem.__getattribute__` with `_get_v_attr`. Any property access on a `VisualElem` subclass automatically calls `.eval()` on `V()` objects and `.resolve()` on `R` objects. This is what makes V() and R bindings work during serialization.

**`__setattr__` patch** — `_vb_engine.py` also replaces `VisualElem.__setattr__` with `_set_v_attr`, which sets `_dirty = True` on any non-private write. This feeds the delta snapshot system.

### Shape Classes (`user_api.py`)

All shapes use schema-driven serialization via `_ShapeBase`. Constructor args are keyword-only.

| Class | Key constructor args | Clickable |
|-------|---------------------|-----------|
| `Rect` | `panel, row, col, width, height, color` | Yes (extends BasicShape in TS) |
| `Circle` | `panel, row, col, radius, color` | Yes |
| `Arrow` | `panel, row, col, end_row, end_col` | Yes |
| `Line` | `start, end, color, stroke_weight, start_offset, end_offset, start_cap, end_cap` | No |
| `Label` | `panel, row, col, text` | No (TS does not set `_elemId`) |
| `Array` | `panel, row, col, values` | No |
| `Array2D` | `panel, row, col, arr` (2D list) | No |
| `Input` | `panel, row, col, width, height` | Special — dispatches `input_changed` |

`Line` has no `panel` argument — it specifies absolute start/end grid cells. `start_offset` and `end_offset` are `(row_frac, col_frac)` fractions within the cell (0.0–1.0). `start_cap`/`end_cap` can be `'none'` or `'arrow'`.

`Array2D` takes `arr=[[...]]`, a 2D list of primitives. The `rectangular` property (default `True`) controls jagged-row rendering.

`Input` is an interactive text field. Override `input_changed(self, text)` to handle user input. Call `get_input()` to read the current value.

### `Panel`

Container element. Children store positions relative to the panel's top-left corner in Python serialization. TypeScript resolves them to absolute grid coordinates in `loadVisualBuilderObjects()`. See [visual-elements.md](./visual-elements.md).

### `no_debug(fn)` Decorator

```python
@no_debug
def my_helper():
    ...
```

Marks a function so the viz-aware interactive tracer skips local tracing for it. Useful for functions defined inside viz blocks that should not produce trace steps when called from click handlers. Implemented by setting `fn._no_debug = True`; the interactive tracer checks `co_firstlineno` against viz ranges to achieve the same effect without needing this decorator explicitly.

### Serialization

**`_serialize_visual_builder()`** — walks `VisualElem._registry` and returns either a **full snapshot** (Python list) or a **delta** (dict `{is_delta: True, changed, deleted}`).

- **First call per trace run**: always returns a full list (all elements serialized).
- **Subsequent calls when `V._count == 0`**: returns a delta — only elements with `_dirty=True` appear in `changed`; element IDs that disappeared appear in `deleted`. Dirty flags are cleared after each call.
- **When `V._count > 0`**: always returns a full snapshot (V() bindings can change values without triggering `__setattr__`, so dirty flags would miss updates).

`_reset_snap_state()` resets the delta tracker; called at the start of each traced execution.

**`_serialize_handlers() → str`** — returns `json.dumps({elem_id: ["on_click", ...]})` for elements that have interactive handlers.

---

## Part 3: Tracing & Snapshots

### File

| File | Purpose |
|------|---------|
| `src/python-engine/vb_serializer.py` | Combined execution, V() tracer, snapshot recording, interactive dispatch |

### `_exec_code(code)` — Main Entry Point

Called by TypeScript for each Analyze run (TypeScript calls `_init_namespace()` first, then `_exec_code()`).

```
1. _init_namespace(viz_ranges_json)  ← called by TypeScript first
2. _exec_code(preprocessed_code):
   a. _reset_snap_state()  ← reset delta tracking
   b. sys.settrace(tracer)
   c. exec(compile(code, '<user_code>', 'exec'), _namespace)
   d. sys.settrace(None)
   e. Post-exec flush: check for unseen V() changes or output
   f. _namespace = ns  # persist for interactive mode
   g. Return json.dumps({ steps, handlers, error?, console? })
```

### Snapshot Triggers

Two conditions cause a snapshot to be recorded into the timeline:

1. **Viz block exit** — `__viz_end__(dict(locals()))` is called. Snapshot includes the visual state, current locals, and the line number. `is_viz=True` in the step.

2. **V() value change** — the tracer fires on every `'line'` event outside viz blocks. If `V._count > 0` and any V() expression has changed value since the last check, a snapshot is recorded.

`__viz_begin__()` is a no-op — viz block lines are skipped by the tracer itself via `in_viz()`. `__viz_end__()` records the snapshot at the block boundary.

When `V._count == 0` (no V() bindings), scope evaluation and V() comparisons are skipped entirely in the tracer — each snapshot is produced only by viz-block exits.

The **`visual` field** of each step is the raw return value of `_serialize_visual_builder()` — either a full element array or a delta dict. TypeScript's `setVisualTimeline` processes these to build the hydrated timeline.

### `_collect_variables(frame_locals)`

Extracts serializable variables from a frame's locals dict. Skips names starting with `_`. Converts:
- Primitives (`int`, `float`, `str`, `bool`) → `{ type, value }`
- Lists of primitives → `{ type: 'list', value: [...] }`
- Lists of lists → `{ type: 'list2d', value: [[...]] }`
- Dicts → `{ type: 'dict', value: {str(k): v, ...} }` (capped)

Note: simpler than the old `_serialize_variables_for_ts` — no `R`-object unwrapping or custom class handling. The combined model captures variables only at snapshot boundaries, not every line.

### `V()` — Lazy Expression Evaluation

```python
class V:
    params = {}    # class variable: current frame locals (see sharp-edges.md)
    _count = 0     # class variable: number of V() instances created since last registry reset

    def __init__(self, expr: str, default=None):
        V._count += 1
        self.expr = expr
        self.default = default

    def eval(self):
        return eval(self.expr, {"__builtins__": {}}, {**SAFE_GLOBALS, **V.params})
        # On any exception: returns self.default (or self.expr if no default)
```

`V.params` is set from `frame.f_locals` at each line event by the V() change detection tracer. The `__getattribute__` patch on `VisualElem` triggers `.eval()` automatically whenever a property is accessed during serialization.

**`V._count`** — incremented on each `V()` construction; reset to 0 by `_clear_registry()`. Used by the snapshot system to skip V()-related work (scope building, dirty-flag bypass) when no V() instances exist — a key performance optimization.

### `R` — Stable Object Reference Across Steps

Same as before: `R` stores the `id` of the original Python object and resolves to the current step's copy via `R.registry`. See the original description in the old [python-engine.md history] for details. Still documented fully in `_vb_engine.py`.

### Interactive Tracing

When an element is clicked, `_exec_click_traced(elem_id, row, col)` runs:

1. Finds the element by `_elem_id` in `_namespace` (not re-exec'd)
2. Sets up the tracer with the same V() change-detection and viz-block skipping logic
3. Calls `target.on_click(row, col)` with the tracer active
4. Returns `{ steps, handlers, console? }`

Input changes use `_exec_input_changed(elem_id, text)` — same pattern. Drag events use `_exec_drag_traced(elem_id, row, col, drag_type)`.

`_viz_ranges` is a module-level Python list set by `_init_namespace()` at execution time. Click and input handlers read it directly — viz ranges don't change between execution and interaction.

---

## Part 4: Python ↔ TypeScript Bridge

All calls go through `src/python-engine/executor.ts`.

| TypeScript function | Python call | Returns |
|--------------------|-------------|---------|
| `executeCode(code)` | `_init_namespace(...)` then `_exec_code(preprocessedCode)` | `TraceStageInfo: { steps, handlers, error? }` |
| `executeClickHandler(elemId, row, col)` | `_exec_click_traced(...)` | `TraceStageInfo` |
| `executeDragHandler(elemId, row, col, dragType)` | `_exec_drag_traced(...)` | `TraceStageInfo` |
| `executeInputChanged(elemId, text)` | `_exec_input_changed(...)` | `TraceStageInfo` |

Pyodide initialization (`loadPyodide()`) lives in `src/python-engine/pyodide-runtime.ts` — singleton, loaded once per session. `executor.ts` calls it before any Python execution.

### Output Capture

Python `print()` output is captured by redirecting `sys.stdout` before execution. Each snapshot records the stdout delta since the previous snapshot (`output` field in the step). The `OutputTerminal` displays the accumulated output from the current step.

A `console` field (optional) may appear in the result for dev-mode profiling output — TypeScript logs it to the browser console and does not display it to the user.

### Import Files

Optional import files live in `src/python-engine/imports/` (`array_utils.py`, `graphs.py`, `list_helpers.py`). They are bundled at build time via `import.meta.glob('./imports/*.py')` and all written to the Pyodide VFS during `loadPyodide()`. No per-file registration is needed — any new `.py` file added to `imports/` is automatically loaded.

**Tracer behavior:** The V() tracer only records steps for frames where `co_filename == '<user_code>'`. Functions from import files have a real filepath and are silently skipped — they execute normally but produce no trace steps.

### Key Files Summary

| File | Type | Purpose |
|------|------|---------|
| `src/python-engine/_vb_engine.py` | VFS module | Hidden engine types: `VisualElem` (+ `_dirty`/`_set_v_attr`), `V` (+ `_count`), `R`, `TrackedDict`, `PopupException` |
| `src/python-engine/user_api.py` | VFS module | User-facing API: `Panel`, shapes, `Input`, `no_debug` |
| `src/python-engine/vb_serializer.py` | exec'd | Execution, delta snapshot recording, interactive dispatch; `_namespace`, `_init_namespace`, `_exec_code`, `_reset_snap_state` |
| `src/python-engine/executor.ts` | TypeScript | All TypeScript↔Pyodide calls; code preprocessing; exports `RawVisual`, `VisualDelta` types |
| `src/python-engine/viz-block-parser.ts` | TypeScript | Parse & validate # @viz / # @end blocks |
| `src/python-engine/pyodide-runtime.ts` | TypeScript | Pyodide singleton: `loadPyodide()`, `isPyodideLoaded()`, `resetPythonState()` |
| `src/python-engine/profiler.py` | dev tool | Python-side performance profiling (not loaded in production) |
