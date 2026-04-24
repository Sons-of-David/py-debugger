# Roadmap and Open Questions

Project management file — not linked from dev-notes.md.

---

## Product Vision

**Name: AlgoPlay** — emphasizes interactive exploration of algorithms, not passive watching.

Most algorithm visualizers show pre-built demos you watch. AlgoPlay lets you:
- Write **your own Python algorithm** and visualize it
- **Step through** a recorded timeline with animated data structures
- **Interact** with the running visualization — click elements, trigger traced sub-runs, accumulate state across clicks
- Build structures like trees and graphs, then **manipulate them interactively** (insert, delete, rotate, search)

The **interactive mode** (`on_click`, click-traced sub-runs) is the core differentiator. No other tool in this space has it.


---

## Known Issues

Bugs and robustness gaps that should be fixed. Ordered roughly by severity.

### Pyodide namespace not reset between Analyze runs *(easy fix)*

`_namespace` is not cleared at the start of `_exec_code` — a second Analyze in the same session can see stale functions from the previous run. `_clear_registry()` resets the visual elements, but not the Python variable namespace. Fix: clear `_namespace` at the top of `_exec_code` (it's reseeded from `user_api` exports anyway, so this is safe). Tracked in [sharp-edges.md](./sharp-edges.md).

### Delta snapshots can miss in-place mutations *(no simple fix yet)*

The delta snapshot system uses `__setattr__` to detect changed elements. In-place mutations like `arr[0] = x` on a list that a `V()` expression reads bypass `__setattr__`, so the element is not marked dirty and the mutation is silently dropped from the delta. Full snapshots (`V._count > 0`) are not affected. No clear fix identified yet — recording dirty state at `V()` eval time is one direction, but adds overhead on every snapshot.

### No browser-side tests *(big gap, high priority when time allows)*

The `pytest` suite covers Python engine logic well. The TypeScript rendering pipeline — especially `buildGridObjects` DFS traversal, `GridSingleObject` coordinate math, and timeline hydration — has no automated tests. A misbehaving DFS or off-by-one in panel-relative coordinate conversion can only be caught manually today. Next testing push should add `@testing-library/react` tests for `buildGridObjects` and `GridSingleObject`.

### Error attribution not wired to editor *(lower priority)*

When Python throws an exception, the executor already parses the traceback and extracts the line number. That line number is not wired to the Monaco editor's decoration API, so the offending line is not highlighted. Connecting them would make debugging significantly faster. The plumbing for editor decorations exists (viz-block highlighting uses it).

### Viz-block nesting not validated at parse time

An unclosed `# @viz` block (missing `# @end`) causes a confusing runtime failure rather than a clear parse error. `viz-block-parser.ts` runs before execution — it could flag unmatched markers with an actionable message before Pyodide is even called.

### Element registry unbounded growth in long interactive sessions

`VisualElem._registry` grows indefinitely if handlers create new elements on every click. In a long interactive session this can cause visible slowdown. A simple cap (e.g. warn or raise `PopupException` past N elements) would prevent OOM in the browser tab.

---

## Up Next

1. ~~**Search tree hero sample** — BST/AVL with interactive search, insert, delete, rotations via click tracing~~
2.~~ **Merge tutorial-pages** and update tutorials for combined editor~~
3. **More interactive examples** — heap insert, ~~graph BFS click-to-start~~
4. ~~**Rename** Math-Insight → AlgoPlay across codebase and tutorials~~
5. **Beta launch** (see Beta Launch section below)

---

## Future Features (interactive-first emphasis)

- ~~**Input elements** — Button, TextInput, Slider as first-class visual elements~~
  **Done:** `Input` element shipped with `input_changed(text)` handler and `get_input()`.
- **More emphasis on interactive mode UI** — larger "Finish & Interact" button, in-app discovery hint for new users

### Breakpoints *(medium priority)*

We had breakpoints before and removed them because visuals only update at viz-block exits and V() change events — pausing at an arbitrary line doesn't correspond to a visual snapshot. Re-add them as a timeline filter: a breakpoint at line N shows only the steps whose source line is ≤ N (i.e. navigate to the last snapshot recorded before that line was reached). The timeline is already pre-built, so no re-execution is needed — it's purely a navigation filter.

### Shareable / persistent links *(wanted, implementation unclear)*

Users want to share their work in blog posts, Discord, forum answers. Two options, both with problems:
- **Encode state in URL** — base64 of the save JSON. Produces URLs hundreds of characters long; practically unshareable.
- **Store programs online** — requires a backend, user accounts, and moderation.

No solution chosen yet. Keep as a high-want, blocked-on-approach item.

### Composite / template objects *(medium priority)*

A way to build higher-level visual components from the primitive shapes (Rect, Arrow, Label, etc.). Examples: a graph node with edges, a complexity counter widget, a heap visualizer. Near-term plan: ship them as **sample files** users can copy from (a `graph-template.json` users start from). Longer-term: promote to first-class Python classes in `user_api.py` or as a new import library (e.g. `graphs.py` already does this for graph structure; the rendering side needs the same treatment).

### Playback speed slider *(low priority)*

A 0.5× / 1× / 2× / max speed control in the header. The self-correcting playback timer already exists — exposing speed as a user control is a small UI addition. Useful for demos and recordings.

### "Explain this step" LLM integration *(future, paid tier only)*

At each timeline step, call the Claude API with the current snapshot + code and return a one-sentence natural-language explanation. Only viable when the app has enough users to justify a paid plan — costs real money at scale.

---

## Beta Launch

### Critical

- **API reference completeness:** Audit all classes and functions in `user_api.py` and builder imports (e.g. `graphs.py`). Every public symbol should appear in `ApiReferencePanel.tsx` (`visualBuilder.ts` / `functionsSchema.ts`) with accurate types, defaults, and descriptions.
- **Examples overhaul:** ~~Split existing samples into two categories~~ ✓ — samples are now grouped as *Algorithms* / *Features* in the dropdown (prefix-based: `feature-*.json`). Remaining: add missing feature examples so the full API surface has coverage.

- ~~**Feedback widget:** Floating button visible in the editor. Opens a modal with a text area for feedback and a checkbox to include the current code (combined JSON). Submits to a placeholder endpoint — backend wiring deferred; UI ships first.~~
- ~~**Tutorial pages:** In-app React Router pages (like the current About page), one per major feature area (arrays, interactive mode, text boxes, libraries, etc.). Interactive walkthrough layer can be added later.~~
- ~~**Error display:** Improve error viewing to show line numbers relative to user code (not the engine). In the combined editor, show the line within the combined file and mark whether it was in a viz block or algorithm section. Auto-jump to the offending line in the editor.~~

### Nice to Have

- ~~**Shareable links:** Encode the current editor state (JSON) into a URL hash or query param. Lets users share their work and makes it easy to report bugs with a repro link.~~
- **Welcome / first-time experience:** A brief dismissible banner or modal for first-time visitors explaining what the app is and pointing to tutorials and samples.
- **Pyodide loading state:** Show a visible loading indicator while Pyodide initializes so the app doesn't appear broken on first load.
- **Tool libraries:** Add more library tools like the given `graphs.py` file. For example `charts.py` builder-import library with a `BarChart` component: takes an array of values and renders a labeled bar graph above a matching array element display. Each should come with a schema describing what it is in general, and what are its functions, and it should appear in the API reference.

- **Import library discoverability:** The importable utilities (`array_utils`, `graphs`, `list_helpers`) should not appear inline in the main Functions/Debugger tabs — that adds noise for users who don't need them. Consider a dedicated "Libraries" tab in the API reference, or show each library's schema only when the user opts in (e.g. hovering an `import` statement). Currently their schemas are defined in `.schema.ts` sidecar files but not yet surfaced in the UI.
- **Logo:** App logo/icon.

---

## Features

- **Curved lines:** Make lines between objects support curves. Curve shape determined by leaving/entry points relative to cell centers.
- ~~**View-only mode:** Let a user see only the editor and visual panel from premade code. User can trace and use mouse interaction, but not edit anything.~~
- **Record to GIF:** Add record button to capture a timeline as a GIF. Let user select a region of the grid. Do something similar for static screenshots.
- **Images in grid:** Similar to text boxes, add image elements to the grid that do not go through the Python engine.
- **LaTeX in text boxes:** Support LaTeX rendering in text box elements.
- ~~**setDebug(bool):** Add a `set_debug(bool)` to the debugger side. Lets the user mark when variables are initialized and debugging should begin.~~
- ~~**input component:** a renderable object where the user can input a text, which is an event available during interactive mode.~~ **Done.**
- ~~**keyboard events:** for interactive mode~~
- **drag screen:** use mouse to drag the whole grid (only when not already dragging a visual element).

---

## Cleanup / Small Tasks

- **Unify App/EmbedPage state logic:** `App.tsx` and `EmbedPage.tsx` duplicate timeline state (`currentStep`, `stepCount`, `hasInteractiveElements`), analysis result wiring (`setHandlers`, `hydrateTimelineFromArray`, auto-advance logic), and mode transition handlers. Extract into a shared hook (e.g. `useAppSession`) so both entry points share a single source of truth and future changes only need to be made once.

- **CombinedEditor:** Delete the old two editors folder, and rename combineEditor to just editor, and refactor the file system in that folder

- **editting text:** highlighting text from right to left, and then pressing a key, does nothing on the first press, and only override it on the second. Highlighting from left to right works fine...

- **text boxes:** when pressing inside a text in a text box, update the styles in the bar above to match the current pressed text.

- **gif taking:** still slow.

- ~~**Show API \ Setting:** Make sure that at most one of them is open at any given time.~~

- **auto add # @end:** 

- **update shape from visual panel:** In edit mode, we can choose a block, and then a shape, and automatically update it

- **emphasize end trace:** When in trace mode and the user try to click some object in the grid that should start another trace, do some effect on the end trace button.

- ~~**add more tabs to the python code**~~ **Done:** named tabs with add/delete/rename/drag shipped.

- ~~**collapsible blocks in python** ~~

- ~~**keep visual:** When pressing edit, don't erase the visuals.~~

- ~~**setDebugCallSuffix location:** Check if `setDebugCallSuffix` can be handled at `CodeEditorArea` level instead of `App.tsx` (see [sharp-edges.md → debugCallSuffix](./sharp-edges.md)).~~

- **Unify shape ObjDoc schemas:** All 8 shape schemas (`RECT_SCHEMA`, `CIRCLE_SCHEMA`, etc.) repeat the same `alpha`, `animate`, `visible`, `z`, and `delete()` entries verbatim. Extract a `BASE_SHAPE_PROPERTIES` array and `BASE_SHAPE_METHODS` array and spread them into each schema to eliminate duplication.

- **Python-defined import schemas:** Builder/debugger import files (`array_utils.py`, `graphs.py`, `list_helpers.py`) currently have their ObjDoc schemas hand-written in separate `.schema.ts` files. These should be defined in the Python files themselves (e.g. as a `SCHEMA` dict) and extracted/generated into TypeScript at build time, so the single source of truth for each library lives with its implementation.

- **Unify userZ + zOrder:** Consider merging `userZ` and `zOrder` in `RenderableObjectData` into a single `depth: [number, number]` tuple — they always travel and sort together in `Grid.tsx`.
- ~~**Unify event-handler position relativity:** `on_click` position is relative to the shape's containing panel (or the grid if top-level), but `on_drag` position is the absolute grid cell.~~ **Done:** both `on_click` and `on_drag` now deliver panel-relative coordinates.
- ~~**Clear editors button** ~~

- ~~**R instance caching:** `R.__new__` now returns a cached instance per `orig_id` via `R._instance_cache`, so the same original object always maps to the same `R` Python object across steps. Builder code can use `R` objects as dict keys. Cache is cleared in `_reset_exec_state()`. Dev notes (`python-engine.md`) should be updated to document this guarantee.~~

- ~~**clear when loading:** Add a clear feature which clears the code from both editors, the variable panel, the output terminals, and the grid. Use this when loading a file.~~

- ~~**Arrow orientation and rotation:** Should only have one of those. At most have a single property `rotation` and allow setting `up`,`down`,`left`,`right` there which automatically transform to the angle.~~
- ~~**break points:** main bugs fixed (stale state, doubling, jumps-back). Minor: Monaco's default stickiness doesn't move a decoration when Enter is pressed at col 1 — worked around via manual edit-event tracking, but could revisit if Monaco exposes a cleaner stickiness option.~~
- ~~**Keyboard shortcut — advance mode:** Use Ctrl+Enter (or Shift+Enter) to advance to the next mode (edit→analyze, trace→interactive).~~
- ~~**Keyboard shortcut — save:** Use Ctrl+S to auto-save.~~
- ~~**Trace mode scroll:** When the debugger code editor is open in trace mode and the current line is off-screen, auto-scroll to it when stepping through the timeline.~~
- ~~**Last line not traced:** The trace does not show the last line execution.~~
- ~~**Rect animation width jump:** When animating rects (e.g. bubble sort), the `width` property jumps while other properties animate smoothly.~~
- ~~**Font size button broken:** Can't change font size — button doesn't work.~~

---

## In Progress

- **Schema-driven Python shape serialization:**

    *Done:*
    - `_vb_engine.py`: `make_shape_class(schema)` factory generates `__init__` + `_serialize()` from a schema dict; `_serialize_from_fields(schema)` used by classes with extra methods (e.g. Panel). Mutable defaults are deep-copied. `'param'` key supports constructor arg ≠ attr name.
    - `user_api.py`: Rect, Circle, Arrow, Label, Panel, Array, Array2D all converted to schema-driven. `Array.length` field dropped — TS `Array1D.draw()` now derives cell count from `values.length` directly.
    - `ser` types implemented: `int`, `str`, `bool`, `float`, `color`, `color?`, `list_r`, `list2d_r` (R-unwrap each row of a 2D list).
    - `_post_init` hook: called at end of generated `__init__` if set as a class attribute. Used by `Array` and `Array2D` for input validation.
    - ~~`_ShapeBase` class replaces `make_shape_class` factory. Subclasses declare their schema via `class Rect(_ShapeBase, schema=RECT_SCHEMA): pass` — Python's `__init_subclass__` stores it as a class variable. `__init__(*args, **kwargs)` rejects positional arguments with a named, actionable error message suggesting the correct keyword syntax.~~

    *Remaining:*
    - **Line schema:** `Line` has non-trivial serialization (tuple→list conversions for offsets, cap enum validation). Add `'list_float'` and `'cap'` ser types to `_ShapeBase`, or keep hand-written `_serialize` with a schema for documentation only.
    - **Transfer TS schemas to Python:** TS `RECT_SCHEMA`, `CIRCLE_SCHEMA`, etc. are `ObjDoc` objects for the API Reference panel. Consider generating TS `ObjDoc` from Python schema dicts, or writing a validation step that asserts they match.

---

## Performance — Suggestions for Future Improvement

These were identified while profiling the A* sample (`perf-delta-snapshots` branch, March 2026).

### Snapshot serialization

- **Skip `sys.settrace` entirely when no V() or viz blocks exist.** Currently, even when `V._count == 0`, `sys.settrace` is active to intercept `__viz_end__` calls. If the code has no `# @viz` blocks, no tracing is needed at all. Detect this by parsing the code for `# @viz` before execution (already available from `getVizRanges`).

- **Smarter deltas for V() samples.** Currently, `V._count > 0` forces full snapshots on every step because V() values change without triggering `__setattr__`. A more precise fix: when a V() change is detected, identify which `elem_id.attr` pairs changed (the tracer already computes this in `_collect_v_values`), mark only those elements dirty, and use deltas. This would bring the delta benefit to V()-based samples too.

- **Fast-path serialization bypassing `_get_v_attr`.** `_serialize_from_fields` calls `getattr(self, name)` for every property, going through the `_get_v_attr` `__getattribute__` override (two `isinstance` checks per attribute). When `V._count == 0`, serialization could read `object.__getattribute__` directly, skipping the V/R checks.

### Playback rendering

These were identified while working on A* playback speed (March 2026). The timer and animation-skip improvements helped, but the per-frame render cost is still the dominant bottleneck.

- **Incremental `buildGridObjects`.** Today the entire `objects` Map is rebuilt from scratch on every step, even though most elements are unchanged. `getChangedIdsAt()` now tells us exactly which elem IDs changed. An incremental path would clone the previous Map and only update/delete entries for changed elements, leaving all other entries with their existing JS object references.

- **Stable `GridObject` references unblock React.memo.** `GridSingleObject` is wrapped in `memo`, but it always receives a new `obj` reference (the Map is rebuilt by `buildGridObjects`). If unchanged elements kept the same `GridObject` reference across steps, `memo` would bail out entirely — skipping not just Framer Motion but the entire React reconciliation for those components.

- **Stable `objects` Map unblocks downstream memos.** Derived memos in `useGridState` re-run on every step because `objects` is always a new Map. Stable references would let these memos short-circuit on unchanged steps.

- **Cache `objectsToRender` sort order.** The `O(n log n)` sort in `Grid.tsx` runs every frame. For most steps in A* the z-order doesn't change. Could track a dirty flag on `userZ`/`zOrder` and skip the sort when neither changed.

### Testing

- **Python-level sample tests.** Use `profiler.py` as a base: load each sample JSON, run `_exec_code`, and assert on step count, final board state, and key variable values. This catches engine regressions without needing a browser.
- **Performance regression tests.** Add a test that runs each sample and asserts the exec time stays below a threshold (e.g. 2× the current baseline). Run with `python3 profiler.py <sample>` in CI.

---

## Open Architectural Questions

- **No-copy variable passing:** Instead of `deepcopy` + `R` wrappers, pass raw live Python objects directly to `update(params)`. Builder is responsible for not mutating params. Drop-in swap: remove deepcopy from `_capture_variables`, remove `TrackedDict` wrapper from `trace_fn`. Tradeoff: simpler for read-only builder code; risk of silent state corruption if builder mutates params.

- **Namespace isolation:** In the combined editor, all user code runs in one `_combined_ns` dict (seeded from `user_api` exports). Engine internals (`__viz_begin__`, `__viz_end__`, etc.) are injected into this namespace but prefixed with `__` to reduce collision risk. If a user names a variable `__viz_begin__` they would shadow the engine hook — currently unguarded.

---

## Documentation

- Find a better diagramming format for the mode state machine and other dev-notes diagrams. Requirements: text-based (version-controllable, AI-readable), renders in VSCode without extra setup. Mermaid was tried but output was inferior to ASCII art. Options: D2, PlantUML, or improved ASCII diagrams.
