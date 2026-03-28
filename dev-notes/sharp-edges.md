# Sharp Edges

[← dev-notes](./dev-notes.md)

Non-obvious behaviors, gotchas, and constraints. Read this before touching the Python/TypeScript boundary, mode transitions, or serialization logic.

---

## A: Known Issues

These are imperfections worth fixing at some point.

### Persistent Namespace Not Reset Between Analyze Runs

Running Analyze twice in the same page session does **not** clear `_namespace`. Variables and functions from the previous run remain until overwritten by the new run. `VisualElem._clear_registry()` resets the visual elements, but not the Python variable namespace.

In practice this is usually harmless because `exec(code)` re-defines most variables. The risk is with **functions removed from the code** — if you had `def temp(): ...` in a previous run and deleted it, `temp` is still callable in the new session. Also any module-level side effects from the previous run persist.

**Workaround:** Reload the page for a completely clean state.
**Fix direction:** Reset `_namespace` at the start of `_exec_code` each Analyze. The namespace is re-seeded from `user_api` exports anyway, so this is safe.

---

### `GridCell` Must Not Have a Border When Rendering Elements

`GridCell` renders inside a `CELL_SIZE × CELL_SIZE` container. When an element is present, the cell div must have **no border**. A `1px` border with `box-sizing: border-box` (Tailwind default) shrinks the usable content area from 40×40 to 38×38 px, causing the SVG inside to render at a 0.95 scale. Shape coordinates then drift from their intended cell-center positions — the start point of a line may still land correctly by coincidence (the 1px border offset and scale reduction cancel at `offset=0.5`), but the end point drifts by `~2px × delta_cells`.

**Rule:** Only apply `border` to `GridCell` when `!hasElementInfo` (i.e., the empty-cell placeholder). Never add padding or border to the element-hosting cell div.

---

## B: Architectural Quirks

These are intentional behaviors that are non-obvious and must be understood to avoid breaking things.

### `V.params` Is a Class Variable

`V.params` is a single class-level dict shared by all `V()` instances. It is set from `frame.f_locals` at each line event by the V() change detection tracer.

Outside active tracing — e.g., when `_serialize_visual_builder()` is called from interactive click dispatch — `V.params` holds whatever was set at the last traced line. This is intentional: interactive mode shows the visual state from the moment the click handler runs. But if `_serialize_visual_builder()` is ever called in an unexpected context, `V.params` may be stale.

---

### Delta Snapshots Are Disabled When V() Bindings Exist

`_serialize_visual_builder()` falls back to full snapshots whenever `V._count > 0`. This is intentional: V() expressions are evaluated at read time (via `__getattribute__`) and do not trigger `__setattr__`, so the `_dirty` flag would miss updates to V()-bound properties. The delta system is only safe when all properties are set via plain assignment.

If you add a new way to update element state that doesn't go through `__setattr__` (e.g., mutating a list in-place that a V() reads), delta snapshots will silently produce incorrect results. Always verify that `V._count == 0` is the right guard.

---

### `_elem_id` (Python) vs `_elemId` (TypeScript)

Python serializes `"_elem_id": self._elem_id` (snake_case). TypeScript's `BasicShape` constructor translates it: `this._elemId = el._elem_id` (camelCase). This translation happens in **one place only**: `src/visual-panel/render-objects/BasicShape.ts`.

Code that reads the ID from a **hydrated TypeScript instance** must use `_elemId` (camelCase). Code that reads from **raw JSON** (e.g., before hydration) must use `_elem_id` (snake_case). Mixing these silently returns `undefined`.

---

### Label and Array Elements Are Never Clickable

`Label`, `Array1D`, `Array2D` extend `VisualBuilderElementBase` directly in TypeScript — they do not go through `BasicShape`. Their `_elemId` property is never set (remains `undefined`).

Even if you define `on_click` on a `Label` in Python, it will appear in `_serialize_combined_handlers()`, but `loadVisualBuilderObjects()` checks `(el as any)._elemId != null` before assembling `clickData` — so the check fails and no click listener is attached.

---

### Positions Are Always Absolute in Serialized JSON

Panel-relative coordinates are resolved to absolute grid coordinates **by the Python DFS traversal** before serialization. The raw JSON `position` field for every element (including panel children) is an absolute grid coordinate.

TypeScript's `loadVisualBuilderObjects()` no longer needs a two-pass algorithm to resolve parent offsets — all positions are absolute in the hydrated instances too. Do not add panel-offset resolution logic in TypeScript; it would double-apply the offset.

---

### Handlers Re-Fetched on Every Click

After every click, `_exec_click_traced` calls `_serialize_handlers()` to re-fetch the full handler registry. This allows `on_click` handlers that create new visual elements (with their own `on_click`) to make those elements immediately clickable — without requiring a full re-analyze.

---

### Viz Block Preprocessing Happens in TypeScript, Not Python

`executor.ts` replaces `# @viz` and `# @end` markers before passing code to Python. This means:
- The original user code is never exec'd directly — Python always sees the preprocessed version with `__viz_begin__()` / `__viz_end__()` calls
- The line numbers in the preprocessed code match the original exactly (the replacement is in-place with no line count change)
- If a `# @viz` or `# @end` appears inside a string literal, it will still be replaced — a known limitation

---

### `MAX_TRACE_STEPS` Hard Cap

`make_step_guard()` in `_vb_engine.py` creates a guard function that raises `PopupException` after a configurable number of trace steps. This prevents infinite loops in user code from hanging the browser. If a user's algorithm genuinely needs more steps, the constant must be raised in `_vb_engine.py`.

---

### Pyodide State Persists for the Full Page Session

All Python module globals — `VisualElem._registry`, `_namespace`, Pyodide's module namespace, the loaded Python files — persist for the lifetime of the page. Only a page reload clears everything. Multiple Analyze runs in the same session share this global state (mitigated by `_clear_registry()` and `_namespace` re-seeding via `_init_namespace()`, but see the namespace note above).
