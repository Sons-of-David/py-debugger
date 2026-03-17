# Roadmap and Open Questions

Project management file — not linked from dev-notes.md.

---

## Features To Build

2. Add curve objects between cells:
   - Lines or bezier curves, with optional control of start/end direction
   - Optional line types (dashed, dotted, etc.)
   - Optional line endings (arrows, etc.)
3. Support 2D arrays
5. View only modes: Let a user only see the debugger editor and visual panel from a premade code. User can only trace and use the mouse interaction, but not change anything else.
6. Redo the about page (and add there links to homepage)
7. Add record button to create a gif from a timeline. Choose a box in the grid to save the image. Also do something similar in the regular picture.
8. Similar to text boxes, add images to the grid which do not go through the python engine.
9. support LaTeX in text boxes
## Open Assignments / Cleanup

13. **No-copy variable passing (Option A — alternative to R tracking):** Instead of `deepcopy` + `R` wrappers, pass raw live Python objects directly to `update(params)`. Builder is responsible for not mutating params. Should be implementable as a drop-in swap of `_capture_variables` (remove deepcopy) and the `params` construction in `trace_fn` (remove TrackedDict wrapper). If other callsites are affected, document what needs updating. Tradeoff: simpler for builder code that only reads variables, risk of silent state corruption if builder mutates params.
15. **Auto-generated Python shape serialization from TS schemas:** Each TypeScript element schema (e.g. `ArrayElement`, `RectElement`) should have a corresponding Python shape class with auto-generated `_serialize()` that handles `V` and `R` objects uniformly — resolving `R` to its current value and calling `.eval()` on `V`. Currently serialization is hand-written per class and V/R resolution is ad-hoc (e.g. `Array._serialize` manually resolves `R` for `_cells` but not other fields). A schema-driven approach would make the Python and TypeScript sides stay in sync automatically.

14. **Namespace isolation between engine code and user code:** Currently all three Python engine files (`visualBuilder.py`, `visualBuilderShapes.py`, `pythonTracer.py`) are `exec()`-d into the same Pyodide globals, so user-written builder code could accidentally shadow or overwrite engine names (e.g. defining a variable called `Panel` or `update`). Investigate running engine code in a separate namespace and exposing only the intended API to user code — either via explicit injection into a sandboxed `exec()` context, or by restructuring so user code is given a curated `globals` dict containing only the builder API.

1. App - Check if `setDebugCallSuffix` can be handled at `CodeEditorArea` level instead of `App.tsx` (see [sharp-edges.md → debugCallSuffix](./sharp-edges.md))
2. python - Improve error viewing to be relative to the code itself, and not to the python engine. Also, jump automatically to the editor tab with the error.
3. Consider unifying `userZ` and `zOrder` in `RenderableObjectData` into a single `depth: [number, number]` tuple — they always travel and sort together in Grid.tsx, so a tuple makes the total order explicit. (They stay separate in `GridObject` and `OccupantInfo` where `zOrder` travels alone.)
8. Use control+enter or maybe shift+enter to move to the next mode (edit->analyze, trace->interactive)
9. Use control+s to automatically save.
10. When the debugger code is open in trace mode, and it doesn't show the whole code, when moving in the time line always jump to see the current executed line.
12. The trace does not show the last line execution

---

## Documentation

- Find a better diagramming format for the mode state machine and other diagrams in dev-notes. Requirements: text-based (version-controllable, AI-readable), renders nicely in VSCode without extra setup. Mermaid was tried but the output was inferior to the ASCII art. Options to explore: D2, PlantUML, or improving the ASCII diagrams with a dedicated tool.

---

## Completed

<!-- Move items here when done, with a one-line note on how they were resolved -->

- UI - Move save/load to top row — moved Save, Load, Samples buttons from CodeEditorArea header into App.tsx header
- UI - Make variables panel collapsible — added collapse/expand toggle button to VariablePanel header
- UI - Remove footer — removed instructional text; kept an empty footer as a visual bottom margin
- UI - Keep top row height constant — wrapped TimelineControls in an always-rendered div, using `invisible` in interactive mode instead of conditional render
- python - scope `_main_` excluded — `_main_` was treated as a private name by `is_priv` check in `_capture_scope`, causing empty scope for all top-level code and no line highlighting
- Cleanup 2 — Simplified analyzeStatus by removing 'dirty' state, consolidated to idle/success/error
- Cleanup 3 — Skip trace for empty debugger code, jump directly to interactive mode
- Cleanup 5 — Added infinite loop protection for builder code via sys.settrace step counter
- Cleanup 6 — Combined handleEnterInteractive and handleBackToInteractive into enterInteractive(from)
- Cleanup 7 — Moved breakpoint navigation logic from App.tsx to TimelineControls component
