# Roadmap and Open Questions

Project management file — not linked from dev-notes.md.

---

## Features To Build

1. Add `on_start_drag`, `on_end_drag`, and maybe `on_drag` drag handlers
2. Add curve objects between cells:
   - Lines or bezier curves, with optional control of start/end direction
   - Optional line types (dashed, dotted, etc.)
   - Optional line endings (arrows, etc.)
3. Support 2D arrays
4. Support `import` statements in user code
5. View only modes: Let a user only see the debugger editor and visual panel from a premade code. User can only trace and use the mouse interaction, but not change anything else.
6. Redo the about page (and add there links to homepage)
7. Add record button to create a gif from a timeline. Choose a box in the grid to save the image. Also do something similar in the regular picture.
8. Similar to text boxes, add images to the grid which do not go through the python engine.
9. support LaTeX in text boxes
10. Changed V to have a default value in case of NameException

## Open Assignments / Cleanup

1. App - Check if `setDebugCallSuffix` can be handled at `CodeEditorArea` level instead of `App.tsx` (see [sharp-edges.md → debugCallSuffix](./sharp-edges.md))
2. python - Improve error viewing to be relative to the code itself, and not to the python engine. Also, jump automatically to the editor tab with the error.
3. Consider unifying `userZ` and `zOrder` in `RenderableObjectData` into a single `depth: [number, number]` tuple — they always travel and sort together in Grid.tsx, so a tuple makes the total order explicit. (They stay separate in `GridObject` and `OccupantInfo` where `zOrder` travels alone.)
4. Currently, using a panel shows both its components, and the panel's name and border. Have an invisible mode where it only shows the components, and make it the default. Also, change the Panel.add function so it can accept multiple elements and not just a single one.
5. Make sure that the python engine clears itself when returning to edit mode.
6. Fix the choosing a textbox with bullets bug.
7. Change the local mode saving: In local mode save and load should behave the same, and instead there should be an extra save-sample button to save the current code into the samples folder.
8. Use control+enter or maybe shift+enter to move to the next mode (edit->analyze, trace->interactive)
9. Use control+s to automatically save.
10. When the debugger code is open in trace mode, and it doesn't show the whole code, when moving in the time line always jump to see the current executed line.
11. the traces scope has an extra `_main_` in the beginning - fix it.
12. The trace does not show the last line execution
13. update API (in particular explain V, function exit, enter, drag, etc)
14. function calling should give the full name of the function, namely `Foo.__init__` and not just `__init__`.

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
- Cleanup 2 — Simplified analyzeStatus by removing 'dirty' state, consolidated to idle/success/error
- Cleanup 3 — Skip trace for empty debugger code, jump directly to interactive mode
- Cleanup 5 — Added infinite loop protection for builder code via sys.settrace step counter
- Cleanup 6 — Combined handleEnterInteractive and handleBackToInteractive into enterInteractive(from)
- Cleanup 7 — Moved breakpoint navigation logic from App.tsx to TimelineControls component
