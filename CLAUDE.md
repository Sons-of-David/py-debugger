## Hub-File Responsibilities

Some files carry a `// Responsibilities:` block at the top. When editing one of
these files:

1. **Fit the change** — every addition must belong to an existing responsibility
   listed in that block.
2. **Flag new responsibilities** — if the change introduces something that doesn't
   fit any existing bullet, tell the user before (or immediately after) making the
   edit. Do not silently expand the file's scope.
3. **Keep the block current** — if a responsibility is removed or substantially
   renamed during a refactor, update the block to match.

Current hub files: `App.tsx`, `GridArea.tsx`, `Grid.tsx`, `executor.ts`.

## Architectural Changes

Before making any significant architectural change, find and read the relevant file in `dev-notes/`:

- `dev-notes/dev-notes.md` — component layout, app modes, data flow, directory structure
- `dev-notes/python-engine.md` — Python tracer, builder classes, Pyodide bridge
- `dev-notes/visual-elements.md` — element serialization, hydration, click dispatch
- `dev-notes/other-components.md` — text boxes, save/load, output terminal, API panel
- `dev-notes/sharp-edges.md` — known issues and quirks (always check before touching Python/TS boundary)
